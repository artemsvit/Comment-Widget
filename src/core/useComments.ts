import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Comment, Reply, CommentSystemState, CommentPosition } from './types';
import { StorageAdapter } from '../storage/StorageAdapter';

// Generate a robust CSS selector for an element
function generateSelector(element: Element): string {
  // Prefer ID selector (most reliable)
  if (element.id) {
    return `#${element.id}`;
  }
  
  // Build a path selector
  const path: string[] = [];
  let current: Element | null = element;
  
  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();
    
    // Add ID if available
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break; // ID is unique, stop here
    }
    
    // Add classes if available
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(' ').filter(c => c.trim() && !c.startsWith('data-'));
      if (classes.length > 0) {
        // Use all classes for better specificity
        selector += `.${classes.join('.')}`;
      }
    }
    
    // Add nth-child if needed for uniqueness
    const parent: Element | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child: Element) => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current as Element) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    
    path.unshift(selector);
    current = parent;
    
    // Limit path depth to avoid overly long selectors
    if (path.length >= 5) break;
  }
  
  return path.join(' > ');
}

export const useComments = (storageAdapter: StorageAdapter, primaryColor: string) => {
  const [state, setState] = useState<CommentSystemState>({
    comments: [],
    activeCommentId: null,
    isVisible: false,
    isCreatingComment: false,
    newCommentPosition: null,
    showPreviewDot: false,
  });

  const [activationSource, setActivationSource] = useState<'manual' | 'panel' | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const activationInProgress = useRef(false);

  // Load comments from storage adapter on mount
  useEffect(() => {
    storageAdapter.loadComments().then((comments) => {
      setState((prev) => ({ ...prev, comments }));
    });

    // Subscribe to changes if supported
    if (storageAdapter.subscribeToChanges) {
      const unsubscribe = storageAdapter.subscribeToChanges((comments) => {
        setState((prev) => ({ ...prev, comments }));
      });
      return unsubscribe;
    }
  }, [storageAdapter]);

  const saveComments = useCallback(
    async (comments: Comment[]) => {
      try {
        await storageAdapter.saveComments(comments);
      } catch (error) {
        console.error('Failed to save comments:', error);
      }
    },
    [storageAdapter]
  );

  const toggleVisibility = useCallback((skipSidebar: boolean = false) => {
    setState((prev) => {
      // Logic: If either the overlay is visible OR the sidebar is open, treat "Toggle" as "Close All".
      // Otherwise, "Open All".
      const shouldClose = prev.isVisible || isSidebarOpen;

      if (shouldClose) {
        // Close everything
        setIsSidebarOpen(false);
        setActivationSource(null);
        
        return {
          ...prev,
          isVisible: false,
          activeCommentId: null,
          isCreatingComment: false,
          newCommentPosition: null,
          showPreviewDot: false,
        };
      } else {
        // Open comment mode (overlay), but skip sidebar if requested
        setActivationSource('manual');
        if (!skipSidebar) {
          setIsSidebarOpen(true);
        }

        return {
          ...prev,
          isVisible: true,
          activeCommentId: null,
          isCreatingComment: false,
          newCommentPosition: null,
          showPreviewDot: false,
        };
      }
    });
  }, [isSidebarOpen]);

  const setVisibility = useCallback((visible: boolean) => {
    setState((prev) => ({
      ...prev,
      isVisible: visible,
      activeCommentId: visible ? prev.activeCommentId : null,
      isCreatingComment: false,
      newCommentPosition: null,
      showPreviewDot: false,
    }));
  }, []);

  const startCreatingComment = useCallback((position: CommentPosition) => {
    setState((prev) => ({
      ...prev,
      isVisible: true, // Ensure widget is visible when creating
      isCreatingComment: true,
      newCommentPosition: position,
      activeCommentId: null,
      showPreviewDot: false,
    }));
  }, []);

  const showPreviewDot = useCallback((position: CommentPosition) => {
    setState((prev) => ({
      ...prev,
      showPreviewDot: true,
      newCommentPosition: position,
      activeCommentId: null,
      isCreatingComment: false,
    }));
  }, []);

  const cancelCreatingComment = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCreatingComment: false,
      newCommentPosition: null,
      showPreviewDot: false,
    }));
  }, []);

  const createComment = useCallback(
    (text: string, author: string = 'Anonymous') => {
      if (!state.newCommentPosition) return;

      // newCommentPosition is already in document-relative coordinates
      const docX = state.newCommentPosition.x;
      const docY = state.newCommentPosition.y;

      // Identify the element under the comment position
      // Convert document coordinates to viewport coordinates for element detection
      let selector: string | undefined;
      
      // Use viewport coordinates directly (elementsFromPoint needs viewport coords)
      const viewportX = docX - window.scrollX;
      const viewportY = docY - window.scrollY;
      
      // Get the element at the position (using viewport coordinates)
      const elements = document.elementsFromPoint(viewportX, viewportY);
      
      // Find low-level element using improved logic - prefer medium-sized blocks
      const targetElement = (() => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxContainerSize = Math.max(viewportWidth, viewportHeight) * 0.9;
        const minElementSize = 50; // Minimum size for an element to be considered (50px)
        const minArea = 2000; // Minimum area (width * height) for an element to be considered
        
        // Tags to exclude (small inline elements)
        const excludedTags = ['SPAN', 'STRONG', 'EM', 'B', 'I', 'CODE', 'LABEL', 'SMALL', 'SUB', 'SUP', 'MARK'];
        const containerTags = ['BODY', 'HTML'];
        const preferredBlockTags = ['SECTION', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER', 'NAV', 'MAIN', 'DIV'];
        
        // First pass: look for elements with IDs (most reliable, prefer medium-sized)
        for (const el of elements) {
          if (el.closest('#comment-widget-root') || el.closest('[data-comment-widget]')) continue;
          if (el === document.body || el === document.documentElement) continue;
          if (containerTags.includes(el.tagName)) continue;
          if (excludedTags.includes(el.tagName)) continue;
          
          const htmlEl = el as HTMLElement;
          if (htmlEl.id) {
            const rect = htmlEl.getBoundingClientRect();
            const elementWidth = rect.width;
            const elementHeight = rect.height;
            const area = elementWidth * elementHeight;
            
            // Must be medium-sized (not too small, not too large)
            if (elementWidth >= minElementSize && elementHeight >= minElementSize &&
                area >= minArea &&
                elementWidth < viewportWidth * 0.9 && elementHeight < viewportHeight * 0.9) {
              return el;
            }
          }
        }
        
        // Second pass: look for preferred block-level elements (medium-sized)
        for (const el of elements) {
          if (el.closest('#comment-widget-root') || el.closest('[data-comment-widget]')) continue;
          if (el === document.body || el === document.documentElement) continue;
          if (containerTags.includes(el.tagName)) continue;
          if (excludedTags.includes(el.tagName)) continue;
          
          const htmlEl = el as HTMLElement;
          const rect = htmlEl.getBoundingClientRect();
          const elementWidth = rect.width;
          const elementHeight = rect.height;
          const area = elementWidth * elementHeight;
          
          // Skip elements that are too small or too large
          if (elementWidth < minElementSize || elementHeight < minElementSize || area < minArea) continue;
          if (elementWidth > maxContainerSize || elementHeight > maxContainerSize) continue;
          
          // Prefer block-level elements
          if (preferredBlockTags.includes(el.tagName)) {
            return el;
          }
          
          // Accept interactive elements if they're medium-sized
          if (['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
            return el;
          }
          
          // Accept heading and paragraph elements if medium-sized
          if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P'].includes(el.tagName)) {
            return el;
          }
        }
        
        // Third pass: look for any medium-sized element (fallback)
        for (const el of elements) {
          if (el.closest('#comment-widget-root') || el.closest('[data-comment-widget]')) continue;
          if (el === document.body || el === document.documentElement) continue;
          if (excludedTags.includes(el.tagName)) continue;
          
          const htmlEl = el as HTMLElement;
          const rect = htmlEl.getBoundingClientRect();
          const elementWidth = rect.width;
          const elementHeight = rect.height;
          const area = elementWidth * elementHeight;
          
          // Must be medium-sized
          if (elementWidth >= minElementSize && elementHeight >= minElementSize &&
              area >= minArea &&
              elementWidth < viewportWidth * 0.9 && elementHeight < viewportHeight * 0.9) {
            return el;
          }
        }
        return null;
      })();
      
      if (targetElement) {
        // Generate a robust selector path
        selector = generateSelector(targetElement);
      }

      const newComment: Comment = {
        id: uuidv4(),
        x: docX, // Already document-relative
        y: docY, // Already document-relative
        text,
        author,
        timestamp: new Date(),
        replies: [],
        resolved: false,
        pageUrl: window.location.pathname + window.location.hash,
        selector: selector
      };

      const updatedComments = [...state.comments, newComment];

      setState((prev) => ({
        ...prev,
        comments: updatedComments,
        isCreatingComment: false,
        newCommentPosition: null,
        showPreviewDot: false,
        activeCommentId: newComment.id,
      }));
      saveComments(updatedComments);
    },
    [state.newCommentPosition, state.comments, saveComments]
  );

  const addReply = useCallback(
    (commentId: string, text: string, author: string = 'Anonymous') => {
      const newReply: Reply = {
        id: uuidv4(),
        text,
        author,
        timestamp: new Date(),
        commentId,
      };

      const updatedComments = state.comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, replies: [...comment.replies, newReply] }
          : comment
      );

      setState((prev) => ({ ...prev, comments: updatedComments }));
      saveComments(updatedComments);
    },
    [state.comments, saveComments]
  );

  const toggleCommentResolved = useCallback(
    (commentId: string) => {
      const updatedComments = state.comments.map((comment) =>
        comment.id === commentId ? { ...comment, resolved: !comment.resolved } : comment
      );

      setState((prev) => ({ ...prev, comments: updatedComments }));
      saveComments(updatedComments);
    },
    [state.comments, saveComments]
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      const updatedComments = state.comments.filter((comment) => comment.id !== commentId);
      setState((prev) => ({
        ...prev,
        comments: updatedComments,
        activeCommentId: prev.activeCommentId === commentId ? null : prev.activeCommentId,
      }));
      saveComments(updatedComments);
    },
    [state.comments, saveComments]
  );

  const setActiveComment = useCallback((commentId: string | null) => {
    setState((prev) => ({ ...prev, activeCommentId: commentId }));
  }, []);

  const updateCommentPosition = useCallback(
    (commentId: string, newX: number, newY: number, newSelector?: string) => {
      const updatedComments = state.comments.map((comment) =>
        comment.id === commentId 
          ? { ...comment, x: newX, y: newY, selector: newSelector !== undefined ? newSelector : comment.selector } 
          : comment
      );

      setState((prev) => ({ ...prev, comments: updatedComments }));
      saveComments(updatedComments);
    },
    [state.comments, saveComments]
  );

  const getCommentsForCurrentPage = useCallback(() => {
    const currentPath = window.location.pathname + window.location.hash;

    const filtered = state.comments.filter((comment) => {
      const commentPath = comment.pageUrl || '/';
      return commentPath === currentPath;
    });

    return filtered;
  }, [state.comments]);

  const getAllComments = useCallback(() => {
    return [...state.comments].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [state.comments]);

  const navigateToComment = useCallback((comment: Comment) => {
    const currentPath = window.location.pathname + window.location.hash;

    setState((prev) => ({
      ...prev,
      isVisible: true,
      activeCommentId: comment.id,
      isCreatingComment: false,
      newCommentPosition: null,
      showPreviewDot: false,
    }));

    if (comment.pageUrl && comment.pageUrl !== currentPath) {
      window.location.href = comment.pageUrl;
      return; // Don't scroll if navigating to a different page
    }

    // Smooth scroll to comment pin
    // Use requestAnimationFrame to ensure DOM is ready and layout is updated
    requestAnimationFrame(() => {
      // Check if we're in a scoped container
      const root = document.getElementById('comment-widget-root');
      const isScoped = root && root.parentElement && root.parentElement !== document.body;
      
      if (isScoped && root && root.parentElement) {
        // Scoped container: scroll the container
        const container = root.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Calculate container's document offset
        const containerDocX = containerRect.left + window.scrollX;
        const containerDocY = containerRect.top + window.scrollY;
        
        // Convert comment position (document coordinates) to container-relative coordinates
        const containerRelativeX = comment.x - containerDocX;
        const containerRelativeY = comment.y - containerDocY;
        
        // Scroll container to show the comment pin (with some offset to center it better)
        // Account for pin size (approximately 12px radius) and add some padding
        const offsetY = 100; // Offset to show pin with some context above
        const scrollY = Math.max(0, containerRelativeY - offsetY);
        const scrollX = Math.max(0, containerRelativeX);
        
        container.scrollTo({
          top: scrollY,
          left: scrollX,
          behavior: 'smooth'
        });
      } else {
        // Full-page: scroll the window
        // Comment position is in document coordinates
        // Add offset to show pin with some context above
        const offsetY = 100;
        const scrollY = Math.max(0, comment.y - offsetY);
        const scrollX = Math.max(0, comment.x);
        
        window.scrollTo({
          top: scrollY,
          left: scrollX,
          behavior: 'smooth'
        });
      }
    });
  }, []);

  const activateCommentModeForPanel = useCallback((skipSidebar: boolean = false) => {
    if (activationInProgress.current) {
      return;
    }

    activationInProgress.current = true;

    setState((prev) => ({
      ...prev,
      isVisible: true,
      activeCommentId: null,
      isCreatingComment: false,
      newCommentPosition: null,
      showPreviewDot: false,
    }));

    if (activationSource !== 'manual') {
      setActivationSource('panel');
    }

    if (!skipSidebar) {
      setIsSidebarOpen(true);
    }

    setTimeout(() => {
      activationInProgress.current = false;
    }, 100);
  }, [activationSource]);

  const deactivateCommentModeForPanel = useCallback(() => {
    setIsSidebarOpen(false);

    setState((prev) => ({
      ...prev,
      isVisible: false,
      activeCommentId: null,
      isCreatingComment: false,
      newCommentPosition: null,
      showPreviewDot: false,
    }));
    setActivationSource(null);
  }, []);

  return {
    ...state,
    activationSource,
    isSidebarOpen,
    primaryColor,
    toggleVisibility,
    setVisibility,
    startCreatingComment,
    showPreviewDot,
    cancelCreatingComment,
    createComment,
    addReply,
    toggleCommentResolved,
    deleteComment,
    setActiveComment,
    updateCommentPosition,
    getCommentsForCurrentPage,
    getAllComments,
    navigateToComment,
    activateCommentModeForPanel,
    deactivateCommentModeForPanel,
  };
};
