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
      
      // Find low-level element using improved logic
      const targetElement = (() => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxContainerSize = Math.max(viewportWidth, viewportHeight) * 0.9;
        const preferredTags = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'SVG', 'SPAN', 'STRONG', 'EM', 'B', 'I', 'CODE', 'PRE', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH'];
        const containerTags = ['BODY', 'HTML'];
        
        // First pass: preferred elements
        for (const el of elements) {
          if (el.closest('#comment-widget-root') || el.closest('[data-comment-widget]')) continue;
          if (el === document.body || el === document.documentElement) continue;
          if (containerTags.includes(el.tagName)) continue;
          
          const htmlEl = el as HTMLElement;
          const rect = htmlEl.getBoundingClientRect();
          if (preferredTags.includes(el.tagName)) {
            if (rect.width < viewportWidth * 0.95 && rect.height < viewportHeight * 0.95) {
              return el;
            }
          }
        }
        
        // Second pass: reasonable-sized elements
        for (const el of elements) {
          if (el.closest('#comment-widget-root') || el.closest('[data-comment-widget]')) continue;
          if (el === document.body || el === document.documentElement) continue;
          if (containerTags.includes(el.tagName)) continue;
          
          const htmlEl = el as HTMLElement;
          const rect = htmlEl.getBoundingClientRect();
          if (rect.width > maxContainerSize || rect.height > maxContainerSize) continue;
          
          if (el.tagName === 'DIV') {
            if (htmlEl.textContent?.trim() || htmlEl.onclick || htmlEl.getAttribute('role') || htmlEl.getAttribute('data-') || (rect.width < viewportWidth * 0.7 && rect.height < viewportHeight * 0.7)) {
              return el;
            }
            continue;
          }
          return el;
        }
        
        // Fallback: first non-extremely-large element
        for (const el of elements) {
          if (el.closest('#comment-widget-root') || el.closest('[data-comment-widget]')) continue;
          if (el === document.body || el === document.documentElement) continue;
          const htmlEl = el as HTMLElement;
          const rect = htmlEl.getBoundingClientRect();
          if (rect.width < viewportWidth * 0.95 && rect.height < viewportHeight * 0.95) {
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
    }
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
