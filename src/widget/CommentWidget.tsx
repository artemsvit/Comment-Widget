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
           toggleVisibility();
        }
      } else if (detail.type === 'SET_VISIBLE') {
        setVisibility(detail.visible);
      } else if (detail.type === 'TOGGLE_VISIBLE') {
        toggleVisibility();
      }
    };
    
    window.addEventListener('comment-widget-event', handleWidgetEvent);
    return () => window.removeEventListener('comment-widget-event', handleWidgetEvent);
  }, [toggleVisibility, startCreatingComment, setVisibility]);

  const allComments = getAllComments();
  
  // Notify when comments change
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('comment-widget-event', { 
      detail: { type: 'COMMENTS_CHANGED', comments: allComments } 
    }));
  }, [allComments]);

  const unresolvedCount = allComments.filter(c => !c.resolved).length;

  const toggleSidebar = () => {
    toggleVisibility();
  };

  const getPositionStyles = () => {
    // Determine if we are running in the playground (or any scoped container)
    // The config.container prop being present is a good indicator
    const isScoped = !!config.container;
    
    if (isScoped) {
        const styles: React.CSSProperties = { position: 'sticky' };
        
        if (config.position.includes('bottom')) {
            styles.top = 'calc(100% - 1.5rem - 3rem)'; // height - margin - button height
            styles.marginBottom = '1.5rem';
        } else {
            styles.top = '1.5rem';
        }
        
        if (config.position.includes('right')) {
            // For sticky right positioning, we need margin-left: auto or similar
            // But float works reliably for this specific case
            styles.float = 'right';
            styles.marginRight = '1.5rem';
            // We also need to ensure it doesn't overlap content, but float handles that naturally
            // or we use margin-left to push it
            styles.marginLeft = 'auto'; 
        } else {
            styles.float = 'left';
            styles.marginLeft = '1.5rem';
            styles.marginRight = 'auto';
        }
        
        return styles;
    }

    // Default fixed positioning for full-page usage
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

  return (
    <>
      {/* Floating Button */}
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
          transition: 'transform 0.1s ease-out, background-color 0.2s', // Removed 'all' to prevent fighting with layout changes
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

      {/* Sidebar Wrapper - Respecting Portal config */}
      {config.usePortal ? (
        // Render to Body (Global)
        typeof document !== 'undefined' && createPortal(
          <div 
            className="fixed top-0 right-0 h-full pointer-events-none flex flex-col justify-end" 
            style={{ zIndex: 2147483647 }} 
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
        // Render inside Container (Scoped)
        <div 
          className="absolute top-0 right-0 h-full pointer-events-none flex flex-col justify-end" 
          style={{ zIndex: 1001 }}
        >
          <CommentSidebar
            isOpen={isSidebarOpen}
            onClose={() => deactivateCommentModeForPanel()}
            comments={allComments}
            onNavigateToComment={navigateToComment}
          />
        </div>
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

