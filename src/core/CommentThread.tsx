import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { formatDistanceToNow } from 'date-fns';
import { Comment } from './types';
import { CommentForm } from './CommentForm';
import { useCommentContext } from './CommentContext';
import { MoreVertical, Check, MessageCircle, Trash2, X } from 'lucide-react';

interface CommentThreadProps {
  comment: Comment;
  onClose: () => void;
  onAddReply: (text: string, author: string) => void;
  onToggleResolved: () => void;
  onDelete: () => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  comment,
  onClose,
  onAddReply,
  onToggleResolved,
  onDelete
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { isSidebarOpen, primaryColor } = useCommentContext();

  const { refs, floatingStyles, update } = useFloating({
    placement: isSidebarOpen ? 'left-start' : 'right-start',
    middleware: [offset(10), flip(), shift()],
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });

  // Keep update trigger for prop changes
  useEffect(() => {
    if (update) {
      update();
    }
  }, [comment.x, comment.y, isSidebarOpen, update]);

  const handleReplySubmit = (text: string, author: string) => {
    onAddReply(text, author);
    setShowReplyForm(false);
  };

  return (
    <>
      <div
        ref={refs.setReference}
        className="absolute w-6 h-6"
        style={{ 
          left: comment.x, 
          top: comment.y,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          visibility: 'hidden' // Hide reference element
        }}
      />

      {createPortal(
        <div 
          ref={refs.setFloating} 
          style={{ 
            ...floatingStyles, 
            zIndex: 9999 
          }}
          className="font-sans"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-lg shadow-2xl border border-gray-200 w-80 overflow-hidden flex flex-col"
            style={{ 
              maxHeight: 'calc(100vh - 40px)',
              pointerEvents: 'auto',
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e5e7eb',
              width: '20rem',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50 shrink-0"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                borderBottom: '1px solid #f3f4f6',
                backgroundColor: '#f9fafb',
                flexShrink: 0
              }}
            >
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ 
                    backgroundColor: primaryColor,
                    width: '1.5rem',
                    height: '1.5rem',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    color: 'white',
                    fontWeight: 700
                  }}
                >
                  {comment.author.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col" style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="text-sm font-semibold text-gray-900" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{comment.author}</span>
                  <span className="text-xs text-gray-500" style={{ fontSize: '0.75rem', color: '#6b7280' }}>{formatDistanceToNow(comment.timestamp)} ago</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  onClick={onToggleResolved}
                  className={`p-1.5 rounded-full transition-colors ${
                    comment.resolved 
                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                      : 'hover:bg-gray-200 text-gray-500'
                  }`}
                  title={comment.resolved ? "Mark as unresolved" : "Mark as resolved"}
                  style={{
                    padding: '0.375rem',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: comment.resolved ? '#dcfce7' : 'transparent',
                    color: comment.resolved ? '#16a34a' : '#6b7280'
                  }}
                >
                  <Check className="w-4 h-4" />
                </button>
                
                <div className="relative" style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                    style={{
                      padding: '0.375rem',
                      borderRadius: '9999px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6b7280'
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  <AnimatePresence>
                    {showMenu && (
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10"
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          marginTop: '0.25rem',
                          backgroundColor: 'white',
                          borderRadius: '0.5rem',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          border: '1px solid #f3f4f6',
                          paddingTop: '0.25rem',
                          paddingBottom: '0.25rem',
                          zIndex: 10,
                          minWidth: '8rem'
                        }}
                      >
                        <button
                          onClick={() => {
                            onDelete();
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.875rem',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                  style={{
                    padding: '0.375rem',
                    borderRadius: '9999px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280'
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[300px] overflow-y-auto" style={{ padding: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
              <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#1f2937', fontSize: '0.875rem', lineHeight: '1.625', whiteSpace: 'pre-wrap' }}>{comment.text}</p>
              
              {comment.replies.length > 0 && (
                <div className="mt-4 space-y-3 pl-3 border-l-2 border-gray-100" style={{ marginTop: '1rem', paddingLeft: '0.75rem', borderLeft: '2px solid #f3f4f6' }}>
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="group" style={{ marginBottom: '0.75rem' }}>
                      <div className="flex items-center justify-between mb-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span className="text-xs font-medium text-gray-700" style={{ fontSize: '0.75rem', fontWeight: 500, color: '#374151' }}>{reply.author}</span>
                        <span className="text-[10px] text-gray-400" style={{ fontSize: '0.625rem', color: '#9ca3af' }}>{formatDistanceToNow(reply.timestamp)} ago</span>
                      </div>
                      <p className="text-sm text-gray-600" style={{ fontSize: '0.875rem', color: '#4b5563' }}>{reply.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer / Reply Form */}
            <div className="p-3 border-t border-gray-100 bg-gray-50" style={{ padding: '0.75rem', borderTop: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
              {showReplyForm ? (
                <CommentForm
                  onSubmit={handleReplySubmit}
                  onCancel={() => setShowReplyForm(false)}
                  isInline
                  autoFocus
                  submitLabel="Reply"
                  placeholder="Write a reply..."
                />
              ) : (
                <button
                  onClick={() => setShowReplyForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#4b5563',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Reply
                </button>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
};