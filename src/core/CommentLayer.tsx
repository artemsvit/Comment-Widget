import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommentContext } from './CommentContext';
import { useKeyboard } from './useKeyboard';
import { CommentBubble } from './CommentBubble';
import { CommentThread } from './CommentThread';
import { NewCommentPopup } from './NewCommentPopup';
import { MessageCircle } from 'lucide-react';

interface CommentLayerProps {
  keyboardShortcut?: string;
  isScoped?: boolean;
}

export const CommentLayer: React.FC<CommentLayerProps> = ({ keyboardShortcut = 'c', isScoped = false }) => {
  const {
    isVisible,
    activeCommentId,
    isCreatingComment,
    newCommentPosition,
    isSidebarOpen,
    primaryColor,
    toggleVisibility,
    startCreatingComment,
    cancelCreatingComment,
    createComment,
    addReply,
    toggleCommentResolved,
    deleteComment,
    setActiveComment,
    updateCommentPosition,
    getCommentsForCurrentPage,
    getAllComments,
  } = useCommentContext();

  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [scrollOffsets, setScrollOffsets] = useState({ x: window.scrollX, y: window.scrollY });
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });

  const allComments = getAllComments();
  const currentPageComments = getCommentsForCurrentPage();
  
  // Filter comments to only show those visible in viewport, and convert to container-relative coordinates if scoped
  const visibleComments = useMemo(() => {
    const sidebarWidth = isSidebarOpen ? 320 : 0;
    const viewportWidth = windowDimensions.width - sidebarWidth;
    const viewportHeight = windowDimensions.height;
    const margin = 50; // Small margin for better UX

    return currentPageComments
      .map((comment) => {
        // Convert document coordinates to container-relative coordinates if scoped
        let relativeX = comment.x;
        let relativeY = comment.y;
        
        if (isScoped) {
          // For scoped containers, convert document coordinates to container-relative
          relativeX = comment.x - containerOffset.x;
          relativeY = comment.y - containerOffset.y;
        }
        
        return { ...comment, x: relativeX, y: relativeY };
      })
      .filter((comment) => {
        // Check if comment position is within viewport bounds
        // For scoped: comment.x/y are now container-relative, scrollOffsets are container scroll
        // For full-page: comment.x/y are document-relative, scrollOffsets are window scroll
        const viewportX = comment.x - scrollOffsets.x;
        const viewportY = comment.y - scrollOffsets.y;
        
        const inX = viewportX >= -margin && viewportX <= viewportWidth + margin;
        const inY = viewportY >= -margin && viewportY <= viewportHeight + margin;
        
        return inX && inY;
      });
  }, [currentPageComments, isSidebarOpen, windowDimensions, scrollOffsets, containerOffset, isScoped]);

  useEffect(() => {
    // If we are in a scoped container, we should use its dimensions instead of window
    // However, the container might be scrollable, so 'height' should be scrollHeight.
    // The parent widgetContainer is now synced to scrollHeight by src/index.ts
    // So we just need to measure the parent offsetParent or similar.
    
    // Actually, responsiveComments logic uses windowDimensions to bound comments.
    // We should update windowDimensions to reflect the container size if applicable.
    
    const measureContainer = () => {
      const root = document.getElementById('comment-widget-root');
      if (root && isScoped && root.parentElement) {
        const container = root.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Calculate container's offset from document origin
        const containerDocX = containerRect.left + window.scrollX;
        const containerDocY = containerRect.top + window.scrollY;
        
        setContainerOffset({
          x: containerDocX,
          y: containerDocY
        });
        
        setWindowDimensions({
          width: container.clientWidth,
          height: container.clientHeight
        });
        setScrollOffsets({
          x: container.scrollLeft,
          y: container.scrollTop
        });
      } else {
        setContainerOffset({ x: 0, y: 0 });
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight
        });
        setScrollOffsets({
          x: window.scrollX,
          y: window.scrollY
        });
      }
    };

    measureContainer();
    
    // We can observe the widget root itself since it's being resized by the observer in index.ts
    const resizeObserver = new ResizeObserver(measureContainer);
    const root = document.getElementById('comment-widget-root');
    if (root) {
      resizeObserver.observe(root);
      if (isScoped && root.parentElement) {
        root.parentElement.addEventListener('scroll', measureContainer, { passive: true });
      }
    }
    window.addEventListener('resize', measureContainer);
    window.addEventListener('scroll', measureContainer, { passive: true });
    
    return () => {
      window.removeEventListener('resize', measureContainer);
      window.removeEventListener('scroll', measureContainer);
      if (root && isScoped && root.parentElement) {
        root.parentElement.removeEventListener('scroll', measureContainer as any);
      }
      resizeObserver.disconnect();
    };
  }, [isScoped]);

  useEffect(() => {
    if (activeCommentId) {
      const activeComment = allComments.find(c => c.id === activeCommentId);
      const currentUrl = window.location.pathname + window.location.hash;
      if (activeComment && activeComment.pageUrl !== currentUrl) {
        const timer = setTimeout(() => {
          if ((window.location.pathname + window.location.hash) !== activeComment.pageUrl) {
            setActiveComment(null);
          }
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [activeCommentId, allComments, setActiveComment]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && isVisible) {
        setIsNavigationMode(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setIsNavigationMode(false);
      }
    };

    const handleBlur = () => {
      setIsNavigationMode(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isVisible]);

  // Click handling moved to a document-level listener to keep scroll working

  // Allow page scrolling in comment mode by not intercepting pointer events;
  // Instead, capture clicks at the document level and translate into document coordinates.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!isVisible || isCreatingComment || activeCommentId || isNavigationMode) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.closest('#comment-widget-root') || target.closest('[data-comment-widget]'))) {
        return;
      }
      const root = document.getElementById('comment-widget-root');
      if (!root) return;
      
      // Convert viewport click coordinates to document coordinates
      // This works the same for both scoped containers and full-page
      const docX = e.clientX + window.scrollX;
      const docY = e.clientY + window.scrollY;
      
      startCreatingComment({ x: docX, y: docY });
    };
    document.addEventListener('click', onDocClick, true);
    return () => {
      document.removeEventListener('click', onDocClick, true);
    };
  }, [isVisible, isCreatingComment, activeCommentId, isNavigationMode, isScoped, startCreatingComment]);

  const handleEscape = useCallback(() => {
    if (activeCommentId) {
      setActiveComment(null);
    } else if (isCreatingComment) {
      cancelCreatingComment();
    } else {
      toggleVisibility();
    }
  }, [activeCommentId, isCreatingComment, setActiveComment, cancelCreatingComment, toggleVisibility]);

  useKeyboard({
    onToggleComments: toggleVisibility,
    onEscape: handleEscape,
    isVisible,
    shortcut: keyboardShortcut,
  });

  const activeComment = activeCommentId ? 
    allComments.find(c => c.id === activeCommentId) : null;

  return (
    <>
      <AnimatePresence>
        {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-comment-overlay="true"
            className="absolute inset-0 pointer-events-none"
            style={{ 
              zIndex: 999,
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              cursor: activeCommentId || isCreatingComment 
                ? 'default' 
                : isNavigationMode 
                  ? 'default' 
                  : 'crosshair'
            }}
          />

          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
            <AnimatePresence>
              {visibleComments.map((comment) => (
                <div key={comment.id} className="pointer-events-auto">
                  <CommentBubble
                    comment={comment}
                    isActive={comment.id === activeCommentId}
                    isThreadOpen={!!activeCommentId} 
                    onClick={() => {
                      if (activeCommentId === comment.id) {
                        setActiveComment(null);
                      } else {
                        setActiveComment(comment.id);
                      }
                    }}
                    onDrag={(newX, newY) => {
                      // newX and newY are container-relative from CommentBubble when scoped
                      // Convert back to document coordinates for storage
                      let docX = newX;
                      let docY = newY;
                      
                      if (isScoped) {
                        docX = newX + containerOffset.x;
                        docY = newY + containerOffset.y;
                      }
                      
                      updateCommentPosition(comment.id, docX, docY);
                    }}
                    onDragEnd={(finalX, finalY) => {
                      // Convert container-relative to document coordinates if scoped
                      let docX = finalX;
                      let docY = finalY;
                      
                      if (isScoped) {
                        docX = finalX + containerOffset.x;
                        docY = finalY + containerOffset.y;
                      }
                      
                      // Convert to viewport coordinates to find element under
                      const viewportX = docX - window.scrollX;
                      const viewportY = docY - window.scrollY;
                      const elementUnder = document.elementFromPoint(viewportX, viewportY);
                      if (elementUnder) {
                        const component = elementUnder.closest('button, input, [class*="card"], [class*="item"], [class*="row"], [class*="component"]');
                        if (component) {
                          const htmlComponent = component as HTMLElement;
                          const prevOutline = htmlComponent.style.outline;
                          htmlComponent.style.outline = `2px dashed ${primaryColor}cc`;
                          setTimeout(() => {
                            htmlComponent.style.outline = prevOutline;
                          }, 1000);
                        }
                      }
                    }}
                    scrollOffsets={scrollOffsets}
                    primaryColor={primaryColor}
                  />
                </div>
              ))}
              
              {isCreatingComment && newCommentPosition && (
                <div className="pointer-events-none">
                  <div
                    className="absolute w-6 h-6 rounded-full flex items-center justify-center bg-gray-400 border-2 border-gray-500 shadow-lg opacity-70 animate-pulse"
                    style={{
                      left: newCommentPosition.x,
                      top: newCommentPosition.y,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <MessageCircle className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeComment && (
                <CommentThread
                  comment={activeComment}
                  onClose={() => setActiveComment(null)}
                  onAddReply={(text, author) => addReply(activeComment.id, text, author)}
                  onToggleResolved={() => toggleCommentResolved(activeComment.id)}
                  onDelete={() => deleteComment(activeComment.id)}
                />
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {isCreatingComment && newCommentPosition && (
              <NewCommentPopup
                position={newCommentPosition}
                onSubmit={createComment}
                onCancel={cancelCreatingComment}
              />
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`bg-black/80 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm pointer-events-none font-medium shadow-xl border border-white/10 ${isScoped ? 'absolute' : 'fixed'}`}
            style={{
              zIndex: 1002,
              bottom: '2rem',
              left: 0,
              right: 0,
              margin: '0 auto',
              width: 'fit-content',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              backdropFilter: 'blur(4px)',
              pointerEvents: 'none',
              fontWeight: 500,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div 
                className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '1.5rem',
                  height: '1.5rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)'
                }}
              >
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="tracking-wide" style={{ letterSpacing: '0.025em' }}>
                {isNavigationMode 
                  ? 'Navigation Mode • Comments Visible'
                  : <>Click to Comment <span className="mx-2 opacity-50" style={{ margin: '0 0.5rem', opacity: 0.5 }}>|</span> {keyboardShortcut.toUpperCase()} to Toggle <span className="mx-2 opacity-50" style={{ margin: '0 0.5rem', opacity: 0.5 }}>|</span> Hold ⌘ to Navigate</>
                }
              </span>
            </div>
          </motion.div>
        </>
        )}
      </AnimatePresence>
    </>
  );
};
