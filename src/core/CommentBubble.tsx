import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Comment } from './types';
import { MessageCircle, Check } from 'lucide-react';

interface CommentBubbleProps {
  comment: Comment;
  isActive: boolean;
  onClick: () => void;
  onDrag?: (newX: number, newY: number) => void;
  onDragStart?: () => void;
  onDragEnd?: (finalX: number, finalY: number) => void;
  isThreadOpen?: boolean;
  primaryColor: string;
  scrollOffsets?: { x: number; y: number };
}

export const CommentBubble: React.FC<CommentBubbleProps> = ({ 
  comment, 
  isActive, 
  onClick, 
  onDrag, 
  onDragStart,
  onDragEnd, 
  isThreadOpen,
  primaryColor,
  scrollOffsets = { x: 0, y: 0 }
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
    // comment.x and comment.y are already in the correct coordinate system (container-relative for scoped, document-relative for full-page)
    // Convert viewport click coordinates to the same coordinate system
    const startMousePos = { 
      x: e.clientX + scrollOffsets.x, 
      y: e.clientY + scrollOffsets.y 
    };
    const startCommentPos = { x: comment.x, y: comment.y };
    
    dragStartTime.current = startTime;
    clickStartPos.current = { x: e.clientX, y: e.clientY }; // Store viewport coords for distance calc
    
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
      
      // Calculate distance in viewport coordinates for threshold check
      const viewportStart = clickStartPos.current || { x: 0, y: 0 };
      const distance = Math.sqrt(
        Math.pow(moveEvent.clientX - viewportStart.x, 2) + 
        Math.pow(moveEvent.clientY - viewportStart.y, 2)
      );
      
      if (!hasDragged && distance > dragThreshold) {
        hasDragged = true;
        setIsDragging(true);
        // Notify parent that dragging has started
        if (onDragStart) {
          onDragStart();
        }
      }
      
      if (hasDragged && onDrag) {
        // Get current scroll offsets (may have changed during drag)
        const root = document.getElementById('comment-widget-root');
        let currentScrollX = window.scrollX;
        let currentScrollY = window.scrollY;
        
        // If scoped, use container scroll instead
        if (root && root.parentElement && root.parentElement !== document.body) {
          currentScrollX = root.parentElement.scrollLeft;
          currentScrollY = root.parentElement.scrollTop;
        }
        
        // Convert current mouse position to the same coordinate system as comment
        const currentPosX = moveEvent.clientX + currentScrollX;
        const currentPosY = moveEvent.clientY + currentScrollY;
        
        // Calculate delta
        const deltaX = currentPosX - startMousePos.x;
        const deltaY = currentPosY - startMousePos.y;
        
        // Apply delta to initial comment position
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
      const viewportStart = clickStartPos.current || { x: 0, y: 0 };
      const distance = Math.sqrt(
        Math.pow(upEvent.clientX - viewportStart.x, 2) + 
        Math.pow(upEvent.clientY - viewportStart.y, 2)
      );
      
      if (hasDragged && onDrag) {
        // Get current scroll offsets
        const root = document.getElementById('comment-widget-root');
        let currentScrollX = window.scrollX;
        let currentScrollY = window.scrollY;
        
        if (root && root.parentElement && root.parentElement !== document.body) {
          currentScrollX = root.parentElement.scrollLeft;
          currentScrollY = root.parentElement.scrollTop;
        }
        
        const deltaX = (upEvent.clientX + currentScrollX) - startMousePos.x;
        const deltaY = (upEvent.clientY + currentScrollY) - startMousePos.y;
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
  }, [onDrag, onClick, onDragEnd, comment.x, comment.y, scrollOffsets]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    
    const touch = e.touches[0];
    const startTime = Date.now();
    // Convert viewport coordinates to the same coordinate system as comment
    const startTouchPos = { 
      x: touch.clientX + scrollOffsets.x, 
      y: touch.clientY + scrollOffsets.y 
    };
    const startCommentPos = { x: comment.x, y: comment.y };

    dragStartTime.current = startTime;
    clickStartPos.current = { x: touch.clientX, y: touch.clientY }; // Store viewport coords
    
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
      const viewportStart = clickStartPos.current || { x: 0, y: 0 };
      const distance = Math.sqrt(
        Math.pow(touch.clientX - viewportStart.x, 2) + 
        Math.pow(touch.clientY - viewportStart.y, 2)
      );
      
      if (!hasDragged && distance > dragThreshold) {
        hasDragged = true;
        setIsDragging(true);
        // Notify parent that dragging has started
        if (onDragStart) {
          onDragStart();
        }
      }
      
      if (hasDragged && onDrag) {
        // Get current scroll offsets
        const root = document.getElementById('comment-widget-root');
        let currentScrollX = window.scrollX;
        let currentScrollY = window.scrollY;
        
        if (root && root.parentElement && root.parentElement !== document.body) {
          currentScrollX = root.parentElement.scrollLeft;
          currentScrollY = root.parentElement.scrollTop;
        }
        
        const currentPosX = touch.clientX + currentScrollX;
        const currentPosY = touch.clientY + currentScrollY;
        
        const deltaX = currentPosX - startTouchPos.x;
        const deltaY = currentPosY - startTouchPos.y;
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
      const viewportStart = clickStartPos.current || { x: 0, y: 0 };
      const distance = Math.sqrt(
        Math.pow(touch.clientX - viewportStart.x, 2) + 
        Math.pow(touch.clientY - viewportStart.y, 2)
      );
      
      if (hasDragged && onDrag) {
        // Get current scroll offsets
        const root = document.getElementById('comment-widget-root');
        let currentScrollX = window.scrollX;
        let currentScrollY = window.scrollY;
        
        if (root && root.parentElement && root.parentElement !== document.body) {
          currentScrollX = root.parentElement.scrollLeft;
          currentScrollY = root.parentElement.scrollTop;
        }
        
        const deltaX = (touch.clientX + currentScrollX) - startTouchPos.x;
        const deltaY = (touch.clientY + currentScrollY) - startTouchPos.y;
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
  }, [onDrag, onClick, onDragEnd, comment.x, comment.y, scrollOffsets]);

  // Highlight linked element on hover
  const [highlightedElement, setHighlightedElement] = React.useState<HTMLElement | null>(null);
  
  // Global cleanup function to clear all hover highlights
  const clearAllHoverHighlights = React.useCallback(() => {
    document.querySelectorAll('[data-comment-widget-highlight]').forEach((el) => {
      const htmlEl = el as HTMLElement;
      const prevOutline = (htmlEl as any).__commentWidgetOriginalOutline || '';
      const prevOutlineOffset = (htmlEl as any).__commentWidgetOriginalOutlineOffset || '';
      htmlEl.style.outline = prevOutline;
      htmlEl.style.outlineOffset = prevOutlineOffset;
      if (!prevOutline) {
        htmlEl.style.transition = '';
      }
      htmlEl.removeAttribute('data-comment-widget-highlight');
      delete (htmlEl as any).__commentWidgetOriginalOutline;
      delete (htmlEl as any).__commentWidgetOriginalOutlineOffset;
    });
  }, []);
  
  const handleMouseEnter = React.useCallback(() => {
    // Only show hover highlight when NOT dragging and pin is NOT active (to avoid conflicts)
    if (comment.selector && !isDragging && !isActive) {
      // Clear any existing hover highlights first (only one should be highlighted at a time)
      clearAllHoverHighlights();
      
      try {
        // Try to find the element using the selector
        // First try exact match
        let element = document.querySelector(comment.selector) as HTMLElement;
        
        // If not found and selector is a path, try finding by partial path
        if (!element && comment.selector.includes(' > ')) {
          const parts = comment.selector.split(' > ');
          // Try last part only
          const lastPart = parts[parts.length - 1];
          element = document.querySelector(lastPart) as HTMLElement;
        }
        
        // If still not found and selector starts with #, try finding by ID only
        if (!element && comment.selector.startsWith('#')) {
          const id = comment.selector.substring(1);
          element = document.getElementById(id) as HTMLElement;
        }
        
        if (element) {
          setHighlightedElement(element);
          const prevOutline = element.style.outline;
          const prevOutlineOffset = element.style.outlineOffset;
          element.style.outline = `2px dashed ${primaryColor}`;
          element.style.outlineOffset = '2px';
          element.style.transition = 'outline 0.2s ease-out';
          
          // Mark element for easier cleanup
          element.setAttribute('data-comment-widget-highlight', 'true');
          
          // Store original styles to restore later
          (element as any).__commentWidgetOriginalOutline = prevOutline;
          (element as any).__commentWidgetOriginalOutlineOffset = prevOutlineOffset;
        }
      } catch (e) {
        // Selector might be invalid, ignore silently
      }
    }
  }, [comment.selector, isDragging, isActive, primaryColor, clearAllHoverHighlights]);
  
  // Clear hover highlight when dragging starts or pin becomes active
  React.useEffect(() => {
    if ((isDragging || isActive) && highlightedElement) {
      const prevOutline = (highlightedElement as any).__commentWidgetOriginalOutline || '';
      const prevOutlineOffset = (highlightedElement as any).__commentWidgetOriginalOutlineOffset || '';
      highlightedElement.style.outline = prevOutline;
      highlightedElement.style.outlineOffset = prevOutlineOffset;
      if (!prevOutline) {
        highlightedElement.style.transition = '';
      }
      highlightedElement.removeAttribute('data-comment-widget-highlight');
      delete (highlightedElement as any).__commentWidgetOriginalOutline;
      delete (highlightedElement as any).__commentWidgetOriginalOutlineOffset;
      setHighlightedElement(null);
    }
  }, [isDragging, isActive, highlightedElement]);
  
  // Cleanup on unmount - clear this pin's highlight
  React.useEffect(() => {
    return () => {
      if (highlightedElement) {
        const prevOutline = (highlightedElement as any).__commentWidgetOriginalOutline || '';
        const prevOutlineOffset = (highlightedElement as any).__commentWidgetOriginalOutlineOffset || '';
        highlightedElement.style.outline = prevOutline;
        highlightedElement.style.outlineOffset = prevOutlineOffset;
        if (!prevOutline) {
          highlightedElement.style.transition = '';
        }
        highlightedElement.removeAttribute('data-comment-widget-highlight');
        delete (highlightedElement as any).__commentWidgetOriginalOutline;
        delete (highlightedElement as any).__commentWidgetOriginalOutlineOffset;
      }
    };
  }, [highlightedElement]);
  
  const handleMouseLeave = React.useCallback(() => {
    if (highlightedElement) {
      const prevOutline = (highlightedElement as any).__commentWidgetOriginalOutline || '';
      const prevOutlineOffset = (highlightedElement as any).__commentWidgetOriginalOutlineOffset || '';
      highlightedElement.style.outline = prevOutline;
      highlightedElement.style.outlineOffset = prevOutlineOffset;
      if (!prevOutline) {
        highlightedElement.style.transition = '';
      }
      highlightedElement.removeAttribute('data-comment-widget-highlight');
      delete (highlightedElement as any).__commentWidgetOriginalOutline;
      delete (highlightedElement as any).__commentWidgetOriginalOutlineOffset;
      setHighlightedElement(null);
    }
  }, [highlightedElement]);
  
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (highlightedElement) {
        const prevOutline = (highlightedElement as any).__commentWidgetOriginalOutline || '';
        const prevOutlineOffset = (highlightedElement as any).__commentWidgetOriginalOutlineOffset || '';
        highlightedElement.style.outline = prevOutline;
        highlightedElement.style.outlineOffset = prevOutlineOffset;
      }
    };
  }, [highlightedElement]);

  return (
    <motion.div
      ref={bubbleRef}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isDragging ? 1.2 : 1, 
        opacity: isThreadOpen && !isActive ? 0.3 : 1,
        zIndex: isDragging ? 1500 : 50
      }}
      exit={undefined}
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
            : comment.resolved
              ? `bg-green-500 ${isDragging ? 'shadow-green-500/50' : 'shadow-green-500/30'}`
              : isActive 
                ? 'shadow-(--primary-color)/50' 
                : ''
          }
        `}
        style={{
          // Resolved comments always show green, even when active
          backgroundColor: comment.resolved
            ? '#22c55e' // green-500
            : isThreadOpen && !isActive
              ? undefined // Use gray-400 from className
              : primaryColor, // Use primary color for unresolved comments (active or not)
          boxShadow: comment.resolved
            ? isDragging ? '0 4px 6px -1px rgba(34, 197, 94, 0.5)' : '0 4px 6px -1px rgba(34, 197, 94, 0.3)'
            : !isThreadOpen && !isActive
              ? `0 4px 6px -1px ${primaryColor}30, 0 2px 4px -1px ${primaryColor}20`
              : undefined,
          transition: 'background-color 0.2s ease-out, box-shadow 0.2s ease-out, filter 0.2s ease-out',
        }}
        onMouseEnter={(e) => {
          if (!isActive && !isThreadOpen && !comment.resolved) {
            (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive && !isThreadOpen && !comment.resolved) {
            (e.currentTarget as HTMLElement).style.filter = 'brightness(1)';
          }
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

    </motion.div>
  );
};

