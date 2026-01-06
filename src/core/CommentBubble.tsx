import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Comment } from './types';
import { MessageCircle, Check } from 'lucide-react';

interface CommentBubbleProps {
  comment: Comment;
  isActive: boolean;
  onClick: () => void;
  onDrag?: (newX: number, newY: number) => void;
  onDragEnd?: (finalX: number, finalY: number) => void;
  isThreadOpen?: boolean;
  primaryColor: string;
}

export const CommentBubble: React.FC<CommentBubbleProps> = ({ 
  comment, 
  isActive, 
  onClick, 
  onDrag, 
  onDragEnd, 
  isThreadOpen,
  primaryColor 
}) => {
  const replyCount = comment.replies.length;
  const [isDragging, setIsDragging] = useState(false);
  const [showDropAnimation, setShowDropAnimation] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const dragStartTime = useRef<number>(0);
  const lastDragUpdate = useRef<number>(0);
  const clickStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragThreshold = 3;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startTime = Date.now();
    // We need to calculate offset from the comment center or current position
    // But since we are updating comment.x/y directly, we should track the delta
    const startMousePos = { x: e.clientX, y: e.clientY };
    const startCommentPos = { x: comment.x, y: comment.y };
    
    dragStartTime.current = startTime;
    clickStartPos.current = startMousePos;
    
    let hasDragged = false;
    let cleanupCalled = false;
    
    const cleanup = () => {
      if (cleanupCalled) return;
      cleanupCalled = true;
      
      setIsDragging(false);
      clickStartPos.current = null;
      lastDragUpdate.current = 0;
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
  const handleMouseMove = (moveEvent: MouseEvent) => {
      if (cleanupCalled) return;
      
      const distance = Math.sqrt(
        Math.pow(moveEvent.clientX - startMousePos.x, 2) + 
        Math.pow(moveEvent.clientY - startMousePos.y, 2)
      );
      
      if (!hasDragged && distance > dragThreshold) {
        hasDragged = true;
        setIsDragging(true);
      }
      
      if (hasDragged && onDrag) {
        // Calculate the delta from the start position
        const deltaX = moveEvent.clientX - startMousePos.x;
        const deltaY = moveEvent.clientY - startMousePos.y;
        
        // Apply the delta to the initial comment position
        // This ensures the bubble moves relative to where it was clicked,
        // preventing the "jump to cursor" effect
        const newX = startCommentPos.x + deltaX;
        const newY = startCommentPos.y + deltaY;

        const now = Date.now();
        if (now - lastDragUpdate.current > 16) { // ~60fps
          onDrag(newX, newY);
          lastDragUpdate.current = now;
        }
      }
    };
    
    const handleMouseUp = (upEvent: MouseEvent) => {
      const timeDiff = Date.now() - startTime;
      const distance = Math.sqrt(
        Math.pow(upEvent.clientX - startMousePos.x, 2) + 
        Math.pow(upEvent.clientY - startMousePos.y, 2)
      );
      
      if (hasDragged && onDrag) {
        const deltaX = upEvent.clientX - startMousePos.x;
        const deltaY = upEvent.clientY - startMousePos.y;
        const newX = startCommentPos.x + deltaX;
        const newY = startCommentPos.y + deltaY;

        onDrag(newX, newY);
        
        setShowDropAnimation(true);
        setTimeout(() => setShowDropAnimation(false), 800);
        
        if (onDragEnd) {
          onDragEnd(newX, newY);
        }
      }
      
      if (!hasDragged && distance <= dragThreshold && timeDiff < 150) {
        onClick();
      }
      
      cleanup();
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    setTimeout(() => {
      if (!cleanupCalled) {
        cleanup();
      }
    }, 5000);
  }, [onDrag, onClick, onDragEnd]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    
    const touch = e.touches[0];
    const startTime = Date.now();
    const startTouchPos = { x: touch.clientX, y: touch.clientY };
    const startCommentPos = { x: comment.x, y: comment.y };

    dragStartTime.current = startTime;
    clickStartPos.current = startTouchPos;
    
    let hasDragged = false;
    let cleanupCalled = false;
    
    const cleanup = () => {
      if (cleanupCalled) return;
      cleanupCalled = true;
      
      setIsDragging(false);
      clickStartPos.current = null;
      lastDragUpdate.current = 0;
      
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (cleanupCalled) return;
      
      const touch = moveEvent.touches[0];
      const distance = Math.sqrt(
        Math.pow(touch.clientX - startTouchPos.x, 2) + 
        Math.pow(touch.clientY - startTouchPos.y, 2)
      );
      
      if (!hasDragged && distance > dragThreshold) {
        hasDragged = true;
        setIsDragging(true);
      }
      
      if (hasDragged && onDrag) {
        const deltaX = touch.clientX - startTouchPos.x;
        const deltaY = touch.clientY - startTouchPos.y;
        const newX = startCommentPos.x + deltaX;
        const newY = startCommentPos.y + deltaY;

        const now = Date.now();
        if (now - lastDragUpdate.current > 16) {
          onDrag(newX, newY);
          lastDragUpdate.current = now;
        }
      }
    };
    
    const handleTouchEnd = (upEvent: TouchEvent) => {
      const timeDiff = Date.now() - startTime;
      const touch = upEvent.changedTouches[0];
      const distance = Math.sqrt(
        Math.pow(touch.clientX - startTouchPos.x, 2) + 
        Math.pow(touch.clientY - startTouchPos.y, 2)
      );
      
      if (hasDragged && onDrag) {
        const deltaX = touch.clientX - startTouchPos.x;
        const deltaY = touch.clientY - startTouchPos.y;
        const newX = startCommentPos.x + deltaX;
        const newY = startCommentPos.y + deltaY;

        onDrag(newX, newY);
        
        setShowDropAnimation(true);
        setTimeout(() => setShowDropAnimation(false), 800);
        
        if (onDragEnd) {
          onDragEnd(newX, newY);
        }
      }
      
      if (!hasDragged && distance <= dragThreshold && timeDiff < 150) {
        onClick();
      }
      
      cleanup();
    };
    
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    
    setTimeout(() => {
      if (!cleanupCalled) {
        cleanup();
      }
    }, 5000);
  }, [onDrag, onClick, onDragEnd]);

  return (
    <motion.div
      ref={bubbleRef}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isDragging ? 1.2 : 1, 
        opacity: isThreadOpen && !isActive ? 0.3 : 1,
        zIndex: isDragging ? 1500 : 50
      }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: isDragging ? 1.2 : 1.1 }}
      className={`
        absolute select-none group
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab z-50'}
        ${isDragging ? '' : 'transition-all duration-200 ease-out'}
      `}
      style={{ 
        left: comment.x, 
        top: comment.y,
        transform: 'translate(-50%, -50%)'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Invisible overlay to capture drags outside the bubble while dragging */}
      {isDragging && (
        <div 
          style={{
            position: 'fixed',
            top: -9999,
            left: -9999,
            right: -9999,
            bottom: -9999,
            zIndex: 9999,
            cursor: 'grabbing'
          }}
        />
      )}

      <div
        className={`
          relative w-6 h-6 rounded-full flex items-center justify-center
          shadow-lg
          ${!isDragging ? 'transition-all duration-200' : ''}
          ${isDragging ? 'shadow-2xl' : ''}
          ${isThreadOpen && !isActive 
            ? 'bg-gray-400 shadow-gray-400/20'
            : isActive 
              ? 'shadow-(--primary-color)/50' 
              : comment.resolved
                ? `bg-green-500 ${isDragging ? 'shadow-green-500/50' : 'shadow-green-500/30'}`
                : `bg-blue-500 ${isDragging ? 'shadow-blue-500/50' : 'shadow-blue-500/30'} hover:bg-blue-600`
          }
        `}
        style={{
          backgroundColor: isActive ? primaryColor : undefined,
        }}
      >
        {comment.resolved ? (
          <Check className="w-3 h-3 text-white" />
        ) : (
          <MessageCircle className="w-3 h-3 text-white" />
        )}
        
        {replyCount > 0 && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold leading-none">
              {replyCount > 9 ? '9+' : replyCount}
            </span>
          </div>
        )}
      </div>

      {isDragging && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute rounded-full border-2 border-dashed -z-10"
          style={{ 
            borderColor: primaryColor,
            width: '36px',
            height: '36px',
            top: '-6px',
            left: '-6px',
          }}
        />
      )}

      {showDropAnimation && (
        <div className="absolute -z-10" style={{ 
          top: '-6px',
          left: '-6px',
        }}>
          {[0, 0.06, 0.12].map((delay, index) => (
            <motion.div
              key={index}
              initial={{ scale: 1, opacity: 0.9 }}
              animate={{ 
                scale: [1, 1.6, 2],
                opacity: [0.9, 0.5, 0] 
              }}
              transition={{ 
                duration: 0.6,
                delay,
                ease: [0.4, 0, 0.2, 1]
              }}
              className="absolute rounded-full border-2 border-dashed"
              style={{ 
                borderColor: comment.resolved ? '#10b98180' : `${primaryColor}80`,
                width: '36px',
                height: '36px',
              }}
            />
          ))}
        </div>
      )}

      {!isDragging && (
        <div 
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{
            zIndex: 1000,
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '0.5rem',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          <div 
            className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg max-w-48 truncate"
            style={{
              backgroundColor: '#111827',
              color: 'white',
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              maxWidth: '12rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            {comment.selector ? (
              <span style={{ color: '#9ca3af', marginRight: '0.25rem', fontSize: '0.65rem' }}>
                {comment.selector.startsWith('#') ? '#' : ''}
                {comment.selector.replace(/^[#.]/, '')}
              </span>
            ) : null}
            {comment.text}
          </div>
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid #111827'
            }}
          ></div>
        </div>
      )}
    </motion.div>
  );
};

