import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Comment, Reply, CommentSystemState, CommentPosition } from './types';
import { StorageAdapter } from '../storage/StorageAdapter';

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

  const toggleVisibility = useCallback(() => {
    setState((prev) => {
      const newVisible = !prev.isVisible;

      if (newVisible) {
        setActivationSource('manual');
      } else {
        if (!isSidebarOpen) {
          setActivationSource(null);
        } else {
          setActivationSource('manual');
          return prev;
        }
      }

      return {
        ...prev,
        isVisible: newVisible,
        activeCommentId: newVisible ? prev.activeCommentId : null,
        isCreatingComment: false,
        newCommentPosition: null,
        showPreviewDot: false,
      };
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

      // Identify the element under the comment position
      let selector: string | undefined;
      
      // We need to temporarily hide the overlay to check what's underneath
      // But since we are in the logic, we can check based on coordinates
      const x = state.newCommentPosition.x;
      const y = state.newCommentPosition.y;
      
      // Get the element at the position. 
      // Note: The widget overlay must be pointer-events-none or we must use a way to pierce it.
      // Since we are in the 'create' flow, the overlay is active. 
      // However, we can use the document.elementFromPoint API.
      // We might need to hide our own UI elements temporarily if they block it.
      
      // Simple strategy: Check for elements with IDs or specific classes
      const elements = document.elementsFromPoint(x, y);
      
      // Filter out our own widget elements
      const targetElement = elements.find(el => 
        !el.closest('#comment-widget-root') && 
        !el.closest('[data-comment-widget]')
      );
      
      if (targetElement) {
        // Generate a unique selector
        if (targetElement.id) {
          selector = `#${targetElement.id}`;
        } else if (targetElement.className && typeof targetElement.className === 'string' && targetElement.className.trim() !== '') {
           // Use the first class as a rough selector if no ID
           // Ideally we'd use a more robust path generator
           const classes = targetElement.className.split(' ').filter(c => c.trim());
           if (classes.length > 0) {
             selector = `.${classes[0]}`;
           }
        }
        
        // If still no selector, maybe fall back to tag name + index?
        // For now, let's keep it simple. If no ID/Class, undefined.
      }

      const newComment: Comment = {
        id: uuidv4(),
        x: state.newCommentPosition.x,
        y: state.newCommentPosition.y,
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
    (commentId: string, newX: number, newY: number) => {
      const updatedComments = state.comments.map((comment) =>
        comment.id === commentId ? { ...comment, x: newX, y: newY } : comment
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

  const activateCommentModeForPanel = useCallback(() => {
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

    setIsSidebarOpen(true);

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

