import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { CommentProvider } from '../core/CommentContext';
import { CommentLayer } from '../core/CommentLayer';
import { CommentSidebar } from '../core/CommentSidebar';
import { useCommentContext } from '../core/CommentContext';
import { CommentWidgetConfig } from '../config';

interface CommentWidgetProps {
  config: Required<CommentWidgetConfig>;
}

interface WidgetButtonProps {
  config: Required<CommentWidgetConfig>;
}

interface ScopedSidebarProps {
  container: HTMLElement;
  isOpen: boolean;
  onClose: () => void;
  comments: any[];
  onNavigateToComment: (comment: any) => void;
}

// Sidebar component scoped to a container - uses fixed positioning but calculates position relative to container
const ScopedSidebar: React.FC<ScopedSidebarProps> = ({
  container,
  isOpen,
  onClose,
  comments,
  onNavigateToComment
}) => {
  const [position, setPosition] = React.useState({ top: 0, right: 0, height: 0 });

  React.useEffect(() => {
    const updatePosition = () => {
      const rect = container.getBoundingClientRect();
      setPosition({
        top: rect.top,
        right: window.innerWidth - rect.right,
        height: rect.height
      });
    };

    updatePosition();
    
    // Listen to window events
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { passive: true });
    
    // Also listen to container scroll if it's scrollable
    container.addEventListener('scroll', updatePosition, { passive: true });
    
    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(container);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      container.removeEventListener('scroll', updatePosition);
      resizeObserver.disconnect();
    };
  }, [container]);

  return typeof document !== 'undefined' && createPortal(
    <div 
      className="fixed pointer-events-none flex flex-col justify-end" 
      style={{ 
        zIndex: 2147483646,
        top: `${position.top}px`,
        right: `${position.right}px`,
        height: `${position.height}px`,
        width: 'auto'
      }}
      data-comment-widget="sidebar"
    >
      <CommentSidebar
        isOpen={isOpen}
        onClose={onClose}
        comments={comments}
        onNavigateToComment={onNavigateToComment}
      />
    </div>,
    document.body
  );
};

const WidgetButton: React.FC<WidgetButtonProps> = ({ config }) => {
  const {
    getAllComments,
    navigateToComment,
    deactivateCommentModeForPanel,
    toggleVisibility,
    setVisibility,
    startCreatingComment, // Need to expose this from context if available, or just rely on toggle
    isSidebarOpen,
    isVisible,
    primaryColor,
  } = useCommentContext();

  // Push page/container content when sidebar opens
  React.useEffect(() => {
    const SIDEBAR_WIDTH_PX = 320;
    
    // Find the target element to push:
    // 1. Look for .preview-content within the container (if container exists)
    // 2. Otherwise use the container itself
    // 3. Fallback to document.body
    let targetEl: HTMLElement | null = null;
    
    if (config.container) {
      // Try to find .preview-content within the container
      const previewContent = config.container.querySelector('.preview-content') as HTMLElement;
      targetEl = previewContent || config.container;
    } else {
      targetEl = document.body;
    }
    
    if (!targetEl) return;
    
    const prevPaddingRight = targetEl.style.paddingRight || '';
    const prevTransition = targetEl.style.transition || '';
    const prevOverflowX = targetEl.style.overflowX || '';
    
    // Add a smooth transition for layout shift
    targetEl.style.transition = prevTransition || 'padding-right 0.25s ease';
    // Prevent horizontal scrollbar from appearing
    targetEl.style.overflowX = 'hidden';
    targetEl.style.paddingRight = isSidebarOpen ? `${SIDEBAR_WIDTH_PX}px` : '0px';
    
    return () => {
      // Restore previous inline styles on unmount
      targetEl!.style.paddingRight = prevPaddingRight;
      targetEl!.style.transition = prevTransition;
      targetEl!.style.overflowX = prevOverflowX;
    };
  }, [isSidebarOpen, config.container]);

  // Notify when visibility changes
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('comment-widget-state-change', { 
      detail: { isVisible } 
    }));
  }, [isVisible]);

  // Expose internals for API
  React.useEffect(() => {
    (window as any)._commentWidgetInternals = {
      getAllComments,
      navigateToComment: (commentId: string) => {
        const comments = getAllComments();
        const comment = comments.find(c => c.id === commentId);
        if (comment) {
          navigateToComment(comment);
        }
      },
      setVisibility,
      toggleVisibility
    };
    
    // Cleanup on unmount
    return () => {
      delete (window as any)._commentWidgetInternals;
    };
  }, [getAllComments, navigateToComment, setVisibility, toggleVisibility]);

  // Listen for custom event to start comment mode
  React.useEffect(() => {
    const handleWidgetEvent = (e: any) => {
      // e.detail contains { type: 'START_COMMENT', position?: { x, y } }
      const detail = e.detail;
      
      if (detail.type === 'START_COMMENT') {
        if (detail.position) {
           startCreatingComment(detail.position);
        } else {
           // If sidebar is hidden, skip sidebar when toggling
           toggleVisibility(config.hideSidebar);
        }
      } else if (detail.type === 'SET_VISIBLE') {
        setVisibility(detail.visible);
      } else if (detail.type === 'TOGGLE_VISIBLE') {
        toggleVisibility(config.hideSidebar);
      }
    };
    
    window.addEventListener('comment-widget-event', handleWidgetEvent);
    return () => window.removeEventListener('comment-widget-event', handleWidgetEvent);
  }, [toggleVisibility, startCreatingComment, setVisibility, config.hideSidebar]);

  const allComments = getAllComments();
  
  // Notify when comments change
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('comment-widget-event', { 
      detail: { type: 'COMMENTS_CHANGED', comments: allComments } 
    }));
  }, [allComments]);

  const unresolvedCount = allComments.filter(c => !c.resolved).length;

  const toggleSidebar = () => {
    // If sidebar is hidden, toggle visibility without opening sidebar
    if (config.hideSidebar) {
      toggleVisibility(true); // Pass skipSidebar flag
    } else {
      toggleVisibility();
    }
  };

  const getPositionStyles = () => {
    // Always use fixed positioning so button stays in place when scrolling
    const styles: React.CSSProperties = { position: 'fixed' };
    switch (config.position) {
      case 'bottom-left':
        return { ...styles, bottom: '1.5rem', left: '1.5rem' };
      case 'top-right':
        return { ...styles, top: '1.5rem', right: '1.5rem' };
      case 'top-left':
        return { ...styles, top: '1.5rem', left: '1.5rem' };
      case 'bottom-right':
      default:
        return { ...styles, bottom: '1.5rem', right: '1.5rem' };
    }
  };

  const buttonElement = (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleSidebar}
      className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white pointer-events-auto cursor-pointer"
      style={{
        zIndex: 1000,
        backgroundColor: primaryColor,
        ...getPositionStyles(),
        transition: 'transform 0.1s ease-out, background-color 0.2s',
      }}
      aria-label="Toggle comments"
    >
      <MessageCircle className="w-5 h-5" />
      
      {/* Badge for unresolved comments */}
      {unresolvedCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md"
        >
          <span className="text-xs text-white font-bold">
            {unresolvedCount > 9 ? '9+' : unresolvedCount}
          </span>
        </motion.div>
      )}
    </motion.button>
  );

  return (
    <>
      {/* Floating Button - Always render via portal to document.body for fixed positioning */}
      {!config.hideButton && (
        typeof document !== 'undefined' && createPortal(
          buttonElement,
          document.body
        )
      )}

      {/* Sidebar Wrapper - Respecting Portal config */}
      {!config.hideSidebar && (
        config.usePortal ? (
          // Render to Body (Global) - fixed to viewport
          typeof document !== 'undefined' && createPortal(
            <div 
              className="fixed top-0 right-0 h-full pointer-events-none flex flex-col justify-end" 
              style={{ zIndex: 2147483646 }} 
              data-comment-widget="sidebar"
            >
              <CommentSidebar
                isOpen={isSidebarOpen}
                onClose={() => deactivateCommentModeForPanel()}
                comments={allComments}
                onNavigateToComment={navigateToComment}
              />
            </div>,
            document.body
          )
        ) : (
          // Render inside Container (Scoped) - use fixed positioning but calculate position relative to container
          config.container ? (
            <ScopedSidebar
              container={config.container}
              isOpen={isSidebarOpen}
              onClose={() => deactivateCommentModeForPanel()}
              comments={allComments}
              onNavigateToComment={navigateToComment}
            />
          ) : null
        )
      )}
    </>
  );
};

export const CommentWidget: React.FC<CommentWidgetProps> = ({ config }) => {
  return (
    <CommentProvider
      storageAdapter={config.storage}
      primaryColor={config.primaryColor}
    >
      <CommentLayer 
        keyboardShortcut={config.enableKeyboardShortcuts ? config.keyboardShortcut : undefined}
        isScoped={!!config.container}
      />
      <WidgetButton config={config} />
      
      {/* CSS Variables for dynamic styling */}
      <style>{`
        :root {
          --comment-widget-primary: ${config.primaryColor};
        }
      `}</style>
    </CommentProvider>
  );
};
