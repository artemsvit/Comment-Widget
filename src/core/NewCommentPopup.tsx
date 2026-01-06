import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { CommentForm } from './CommentForm';
import { useCommentContext } from './CommentContext';

interface NewCommentPopupProps {
  position: { x: number; y: number };
  onSubmit: (text: string, author: string) => void;
  onCancel: () => void;
}

export const NewCommentPopup: React.FC<NewCommentPopupProps> = ({
  position,
  onSubmit,
  onCancel
}) => {
  const { isSidebarOpen } = useCommentContext();

  const { refs, floatingStyles, update } = useFloating({
    placement: isSidebarOpen ? 'left-start' : 'right-start',
    middleware: [offset(10), flip(), shift()],
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (update) update();
  }, [position.x, position.y, update]);

  return (
    <>
      <div
        ref={refs.setReference}
        className="absolute w-6 h-6"
        style={{ 
          left: position.x, 
          top: position.y,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          visibility: 'hidden'
        }}
      />

      {createPortal(
        <div 
          ref={refs.setFloating} 
          style={{ 
            ...floatingStyles, 
            zIndex: 9999 
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[320px] max-w-sm font-sans"
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e5e7eb',
              padding: '1rem',
              minWidth: '320px',
              maxWidth: '24rem',
              pointerEvents: 'auto',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            <CommentForm 
              onSubmit={onSubmit} 
              onCancel={onCancel} 
              isInline={true}
              autoFocus={true}
            />
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
};