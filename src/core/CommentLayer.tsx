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
}

export const CommentLayer: React.FC<CommentLayerProps> = ({ keyboardShortcut = 'c' }) => {
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

  const allComments = getAllComments();
  const currentPageComments = getCommentsForCurrentPage();
  
  const responsiveComments = useMemo(() => {
    const sidebarWidth = isSidebarOpen ? 320 : 0;
    const buffer = 60;
    const margin = 30;
    
    const maxX = windowDimensions.width - sidebarWidth - buffer;
    const minX = margin;
    const maxY = windowDimensions.height - buffer;
    const minY = margin;
    
    return currentPageComments.map(comment => {
      let finalX = comment.x;
      let finalY = comment.y;
      
      if (finalX > maxX) {
        finalX = Math.max(maxX - margin, minX);
      } else if (finalX < minX) {
        finalX = minX;
      }
      
      if (finalY > maxY) {
        finalY = Math.max(maxY - margin, minY);
      } else if (finalY < minY) {
        finalY = minY;
      }
      return { 
        ...comment, 
        x: finalX,
        y: finalY
      };
    });
  }, [currentPageComments, isSidebarOpen, windowDimensions]);

  useEffect(() => {
    // If we are in a scoped container, we should use its dimensions instead of window
    // However, the container might be scrollable, so 'height' should be scrollHeight.
    // The parent widgetContainer is now synced to scrollHeight by src/index.ts
    // So we just need to measure the parent offsetParent or similar.
    
    // Actually, responsiveComments logic uses windowDimensions to bound comments.
    // We should update windowDimensions to reflect the container size if applicable.
    
    const measureContainer = () => {
        const container = document.getElementById('comment-widget-root');
        if (container) {
            setWindowDimensions({
                width: container.clientWidth,
                height: container.clientHeight // This will be the synced scrollHeight
            });
        } else {
            setWindowDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        }
    };

    measureContainer();
    
    // We can observe the widget root itself since it's being resized by the observer in index.ts
    const resizeObserver = new ResizeObserver(measureContainer);
    const container = document.getElementById('comment-widget-root');
    if (container) {
        resizeObserver.observe(container);
    }
    
    window.addEventListener('resize', measureContainer);
    
    return () => {
        window.removeEventListener('resize', measureContainer);
        resizeObserver.disconnect();
    };
  }, []);

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

  const handleLayerClick = useCallback((e: React.MouseEvent) => {
    if (!isVisible || isCreatingComment || activeCommentId) return;
    if (isNavigationMode) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Since this handler is attached to the overlay div, and other widget UI elements (pins, forms)
    // are siblings or have their own event handling, this will primarily fire when clicking empty space.
    // We can directly start creating a comment.
    startCreatingComment({ x, y });
  }, [isVisible, isCreatingComment, activeCommentId, isNavigationMode, startCreatingComment]);

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
            className={`absolute inset-0 ${activeCommentId || isCreatingComment || isNavigationMode ? 'pointer-events-none' : 'pointer-events-auto'}`}
            style={{ 
              zIndex: 999,
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              cursor: activeCommentId || isCreatingComment 
                ? 'default' 
                : isNavigationMode 
                  ? 'default' 
                  : 'crosshair'
            }}
            onClick={handleLayerClick}
          />

          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
            <AnimatePresence>
              {responsiveComments.map((comment) => (
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
                      updateCommentPosition(comment.id, newX, newY);
                    }}
                    onDragEnd={(finalX, finalY) => {
                      const elementUnder = document.elementFromPoint(finalX, finalY);
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
            className="fixed bg-black/80 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm transform -translate-x-1/2 pointer-events-none font-medium shadow-xl border border-white/10"
            style={{
              zIndex: 1002,
              bottom: '2rem',
              left: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              backdropFilter: 'blur(4px)',
              transform: 'translateX(-50%)',
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

