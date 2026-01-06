import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import TextareaAutosize from 'react-textarea-autosize';
import { useCommentContext } from './CommentContext';
import { Send, X } from 'lucide-react';

interface CommentFormProps {
  onSubmit: (text: string, author: string) => void;
  onCancel: () => void;
  placeholder?: string;
  submitLabel?: string;
  position?: { x: number; y: number };
  autoFocus?: boolean;
  isInline?: boolean;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  onCancel,
  placeholder = "Add a comment...",
  submitLabel = "Comment",
  position,
  autoFocus = true,
  isInline = false
}) => {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState(localStorage.getItem('comment-author') || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { primaryColor } = useCommentContext();

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      const finalAuthor = author.trim() || 'Anonymous';
      localStorage.setItem('comment-author', finalAuthor);
      onSubmit(text.trim(), finalAuthor);
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  if (isInline) {
    return (
      <div className="w-full font-sans" style={{ width: '100%', fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <form onSubmit={handleSubmit} className="space-y-3" style={{ margin: 0, padding: 0 }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Your name (or leave blank)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-(--primary-color) focus:ring-1 focus:ring-(--primary-color) transition-colors"
              style={{
                '--primary-color': primaryColor,
                display: 'block',
                boxSizing: 'border-box',
                outline: 'none',
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                lineHeight: '1.25rem',
                color: '#111827',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                marginBottom: '0.75rem'
              } as any}
            />
          </div>
          
          <div style={{ marginBottom: '0.75rem' }}>
            <TextareaAutosize
              ref={textareaRef}
              placeholder={placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white border border-gray-300 rounded-md resize-none focus:outline-none focus:border-(--primary-color) focus:ring-1 focus:ring-(--primary-color) transition-colors"
              style={{
                '--primary-color': primaryColor,
                display: 'block',
                boxSizing: 'border-box',
                outline: 'none',
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                lineHeight: '1.25rem',
                color: '#111827',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                resize: 'none'
              } as any}
              minRows={2}
              maxRows={4}
            />
          </div>
          
          <div className="flex items-center justify-between pt-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
            <span className="text-xs text-gray-400 font-medium" style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>
              Cmd + Enter to Submit
            </span>
            <div className="flex gap-2" style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Cancel"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={!text.trim()}
                className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-(--primary-color)"
                style={{
                  backgroundColor: text.trim() ? primaryColor : '#9ca3af',
                  '--primary-color': primaryColor,
                  border: 'none',
                  cursor: text.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.25rem',
                  fontWeight: 500,
                  color: 'white',
                  borderRadius: '0.375rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  opacity: text.trim() ? 1 : 0.5
                } as any}
              >
                <Send className="w-3.5 h-3.5" />
                {submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  const getSmartPosition = () => {
    if (!position) return { left: 0, top: 20, transform: 'translateX(-50%)' };
    
    // We can assume position is relative to the container because startCreatingComment
    // uses coordinates relative to the overlay, which is absolute filling the container.
    // So we don't need complex viewport calculations if we trust the container scoping.
    // However, we should still try to keep it within bounds if possible.
    
    const x = position.x;
    const y = position.y + 20; // Slight offset below cursor

    return { left: x, top: y };
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="absolute pointer-events-auto cursor-default origin-top-left"
      style={{
        zIndex: 201,
        ...getSmartPosition()
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[320px] max-w-sm font-sans"
        // style={{ all: 'revert' }} // Reset inherited styles from the host page
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e5e7eb',
          padding: '1rem',
          minWidth: '320px',
          maxWidth: '24rem',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-3" style={{ margin: 0, padding: 0 }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Your name (or leave blank)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-(--primary-color) focus:ring-1 focus:ring-(--primary-color) transition-colors"
              style={{
                '--primary-color': primaryColor,
                display: 'block',
                boxSizing: 'border-box',
                outline: 'none',
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                lineHeight: '1.25rem',
                color: '#111827',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                marginBottom: '0.75rem'
              } as any}
            />
          </div>
          
          <div style={{ marginBottom: '0.75rem' }}>
            <TextareaAutosize
              ref={textareaRef}
              placeholder={placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white border border-gray-300 rounded-md resize-none focus:outline-none focus:border-(--primary-color) focus:ring-1 focus:ring-(--primary-color) transition-colors"
              style={{
                '--primary-color': primaryColor,
                display: 'block',
                boxSizing: 'border-box',
                outline: 'none',
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                lineHeight: '1.25rem',
                color: '#111827',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                resize: 'none'
              } as any}
              minRows={2}
              maxRows={4}
            />
          </div>
          
          <div className="flex items-center justify-between pt-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
            <span className="text-xs text-gray-400 font-medium" style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>
              Cmd + Enter to Submit
            </span>
            <div className="flex gap-2" style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Cancel"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={!text.trim()}
                className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-(--primary-color)"
                style={{
                  backgroundColor: text.trim() ? primaryColor : '#9ca3af',
                  '--primary-color': primaryColor,
                  border: 'none',
                  cursor: text.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.25rem',
                  fontWeight: 500,
                  color: 'white',
                  borderRadius: '0.375rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  opacity: text.trim() ? 1 : 0.5
                } as any}
              >
                <Send className="w-3.5 h-3.5" />
                {submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

