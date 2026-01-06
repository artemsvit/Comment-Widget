import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommentContext } from './CommentContext';
import { useKeyboard } from './useKeyboard';
import { CommentBubble } from './CommentBubble';
import { CommentThread } from './CommentThread';
import { NewCommentPopup } from './NewCommentPopup';
import { MessageCircle } from 'lucide-react';

// Generate a robust CSS selector for an element (same as in useComments.ts)
function generateSelectorForElement(element: Element): string {
  // Prefer ID selector (most reliable)
  if (element.id) {
    return `#${element.id}`;
  }
  
  // Build a path selector
  const path: string[] = [];
  let current: Element | null = element;
  
  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();
    
    // Add ID if available
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break; // ID is unique, stop here
    }
    
    // Add classes if available
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(' ').filter(c => c.trim() && !c.startsWith('data-'));
      if (classes.length > 0) {
        // Use all classes for better specificity
        selector += `.${classes.join('.')}`;
      }
    }
    
    // Add nth-child if needed for uniqueness
    const parent: Element | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child: Element) => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current as Element) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    
    path.unshift(selector);
    current = parent;
    
    // Limit path depth to avoid overly long selectors
    if (path.length >= 5) break;
  }
  
  return path.join(' > ');
}

// Find the most specific (low-level) element from a stack of elements
// Filters out main containers and prefers interactive/content elements
function findLowLevelElement(elements: Element[]): HTMLElement | null {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxContainerSize = Math.max(viewportWidth, viewportHeight) * 0.9; // 90% of viewport (less restrictive)
  
  // Tags that are typically low-level content/interactive elements
  const preferredTags = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'SVG', 'SPAN', 'STRONG', 'EM', 'B', 'I', 'CODE', 'PRE', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH'];
  
  // Tags that are typically containers (to avoid)
  const containerTags = ['BODY', 'HTML'];
  
  // First pass: look for preferred elements
  for (const el of elements) {
    // Skip widget elements
    if (el.closest('#comment-widget-root') || el.closest('[data-comment-widget]')) {
      continue;
    }
    
    // Skip body and html
    if (el === document.body || el === document.documentElement) {
      continue;
    }
    
    const tagName = el.tagName;
    const htmlEl = el as HTMLElement;
    
    // Skip container tags
    if (containerTags.includes(tagName)) {
      continue;
    }
    
    // Get element dimensions
    const rect = htmlEl.getBoundingClientRect();
    const elementWidth = rect.width;
    const elementHeight = rect.height;
    
    // Prefer interactive/content elements (even if somewhat large)
    if (preferredTags.includes(tagName)) {
      // Only skip if it's extremely large (likely a full-page container)
      if (elementWidth < viewportWidth * 0.95 && elementHeight < viewportHeight * 0.95) {
        return htmlEl;
      }
    }
  }
  
  // Second pass: look for reasonable-sized elements
  for (const el of elements) {
    // Skip widget elements
    if (el.closest('#comment-widget-root') || el.closest('[data-comment-widget]')) {
      continue;
    }
    
    // Skip body and html
    if (el === document.body || el === document.documentElement) {
      continue;
    }
    
    const tagName = el.tagName;
    const htmlEl = el as HTMLElement;
    
    // Skip container tags
    if (containerTags.includes(tagName)) {
      continue;
    }
    
    // Get element dimensions
    const rect = htmlEl.getBoundingClientRect();
    const elementWidth = rect.width;
    const elementHeight = rect.height;
    
    // Skip elements that are too large (likely main containers)
    if (elementWidth > maxContainerSize || elementHeight > maxContainerSize) {
      continue;
    }
    
    // For divs, be more lenient - accept if they have content or are interactive
    if (tagName === 'DIV') {
      // Check if it has text content, is interactive, or is reasonably sized
      if (htmlEl.textContent?.trim() || 
          htmlEl.onclick || 
          htmlEl.getAttribute('role') ||
          htmlEl.getAttribute('data-') ||
          (elementWidth < viewportWidth * 0.7 && elementHeight < viewportHeight * 0.7)) {
        return htmlEl;
      }
      continue;
    }
    
    // For other elements, accept them if they're not too large
    return htmlEl;
  }
  
  // Fallback: return the first non-widget, non-body element that's not extremely large
  for (const el of elements) {
    if (el.closest('#comment-widget-root') || el.closest('[data-comment-widget]')) {
      continue;
    }
    if (el === document.body || el === document.documentElement) {
      continue;
    }
    const htmlEl = el as HTMLElement;
    const rect = htmlEl.getBoundingClientRect();
    // Only skip if it's extremely large (likely a full-page container)
    if (rect.width < viewportWidth * 0.95 && rect.height < viewportHeight * 0.95) {
      return htmlEl;
    }
  }
  
  return null;
}

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
  const [showPins, setShowPins] = useState(false);
  const lastDragHighlightRef = useRef<{ element: HTMLElement; timeout: NodeJS.Timeout } | null>(null);
  const currentDragHighlightRef = useRef<HTMLElement | null>(null);

  const allComments = getAllComments();
  const currentPageComments = getCommentsForCurrentPage();
  
  // Filter comments to only show those visible in viewport, and convert to container-relative coordinates if scoped
  const visibleComments = useMemo(() => {
    const sidebarWidth = isSidebarOpen ? 320 : 0;
    const viewportWidth = windowDimensions.width - sidebarWidth;
    const viewportHeight = windowDimensions.height;
    const margin = 200; // Larger margin to prevent flickering when scrolling

    // Detect left sidebar (config panel) - typically has class "config-panel" or "w-72" (288px width)
    const leftSidebarWidth = (() => {
      if (typeof document === 'undefined') return 0;
      const configPanel = document.querySelector('.config-panel, aside.w-72') as HTMLElement;
      if (configPanel) {
        const rect = configPanel.getBoundingClientRect();
        return rect.width;
      }
      return 0;
    })();

    return currentPageComments
      .map((comment) => {
        // Convert document coordinates to container-relative coordinates if scoped
        // Comments are stored in document coordinates, but we need container-relative for display
        let relativeX = comment.x;
        let relativeY = comment.y;
        
        if (isScoped) {
          // For scoped containers, convert document coordinates to container-relative
          // containerOffset is the container's position in document coordinates
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
        
        // Filter out comments under left sidebar (config panel)
        const notUnderLeftSidebar = leftSidebarWidth === 0 || viewportX >= leftSidebarWidth;
        
        // Filter out comments under right sidebar (when comment sidebar is open)
        // When sidebar is open, viewportWidth = windowWidth - 320, so comments with viewportX > viewportWidth are under sidebar
        const notUnderRightSidebar = !isSidebarOpen || viewportX <= viewportWidth;
        
        // Check if comment is within viewport bounds
        const inX = viewportX >= -margin && viewportX <= viewportWidth + margin;
        const inY = viewportY >= -margin && viewportY <= viewportHeight + margin;
        
        return inX && inY && notUnderLeftSidebar && notUnderRightSidebar;
      });
  }, [currentPageComments, isSidebarOpen, windowDimensions, scrollOffsets, containerOffset, isScoped]);

  // Delay showing pins after entering comment mode, hide immediately when exiting
  useEffect(() => {
    if (isVisible) {
      // Reset and start delay timer
      setShowPins(false);
      const timer = setTimeout(() => {
        // Only show pins if still in comment mode
        if (isVisible) {
          setShowPins(true);
        }
      }, 500); // 0.5 second delay
      
      return () => clearTimeout(timer);
    } else {
      // Immediately hide pins when exiting comment mode
      setShowPins(false);
      
      // Clear any drag highlights when exiting comment mode
      if (currentDragHighlightRef.current) {
        const prevEl = currentDragHighlightRef.current;
        const prevOutline = (prevEl as any).__commentWidgetDragOutline || '';
        const prevOutlineOffset = (prevEl as any).__commentWidgetDragOutlineOffset || '';
        prevEl.style.outline = prevOutline;
        prevEl.style.outlineOffset = prevOutlineOffset;
        delete (prevEl as any).__commentWidgetDragOutline;
        delete (prevEl as any).__commentWidgetDragOutlineOffset;
        currentDragHighlightRef.current = null;
      }
      
      // Clear any drop highlight timeouts
      if (lastDragHighlightRef.current) {
        clearTimeout(lastDragHighlightRef.current.timeout);
        const prevEl = lastDragHighlightRef.current.element;
        const prevOutline = (prevEl as any).__commentWidgetDragOutline || '';
        const prevOutlineOffset = (prevEl as any).__commentWidgetDragOutlineOffset || '';
        prevEl.style.outline = prevOutline;
        prevEl.style.outlineOffset = prevOutlineOffset;
        delete (prevEl as any).__commentWidgetDragOutline;
        delete (prevEl as any).__commentWidgetDragOutlineOffset;
        lastDragHighlightRef.current = null;
      }
    }
  }, [isVisible]);

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

  // Apply crosshair cursor only to preview-content area when in comment mode
  useEffect(() => {
    if (!isVisible) return;
    
    const shouldShowCrosshair = !activeCommentId && !isCreatingComment && !isNavigationMode;
    
    // Find preview-content element (the area where comments can be added)
    const previewContent = document.querySelector('.preview-content') as HTMLElement;
    
    if (shouldShowCrosshair && previewContent) {
      // Store original cursor style
      const originalCursor = previewContent.style.cursor || '';
      previewContent.style.cursor = 'crosshair';
      
      return () => {
        // Restore original cursor
        previewContent.style.cursor = originalCursor;
      };
    }
    
    return () => {
      // Cleanup: restore default cursor
      if (previewContent) {
        previewContent.style.cursor = '';
      }
    };
  }, [isVisible, activeCommentId, isCreatingComment, isNavigationMode]);

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
      // Prevent comment creation when clicking in left sidebar (config panel)
      if (target && (target.closest('.config-panel') || target.closest('aside.w-72'))) {
        return;
      }
      const root = document.getElementById('comment-widget-root');
      if (!root) return;
      
      // Always convert to document coordinates (as createComment expects document coordinates)
      // For scoped containers, we'll convert container-relative to document-relative
      let docX: number;
      let docY: number;
      
      if (isScoped && root.parentElement) {
        // For scoped containers: 
        // Calculate position relative to the container's content area (accounting for scroll)
        const container = root.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Recalculate container offset at click time to ensure accuracy
        const currentContainerOffsetX = containerRect.left + window.scrollX;
        const currentContainerOffsetY = containerRect.top + window.scrollY;
        
        // Get click position relative to container's visible area, then add scroll offset
        const containerRelativeX = e.clientX - containerRect.left + container.scrollLeft;
        const containerRelativeY = e.clientY - containerRect.top + container.scrollTop;
        
        // Store as document coordinates for consistency (container position + relative position)
        docX = containerRelativeX + currentContainerOffsetX;
        docY = containerRelativeY + currentContainerOffsetY;
      } else {
        // For full-page: convert to document coordinates
        docX = e.clientX + window.scrollX;
        docY = e.clientY + window.scrollY;
      }
      
      startCreatingComment({ x: docX, y: docY });
    };
    document.addEventListener('click', onDocClick, true);
    return () => {
      document.removeEventListener('click', onDocClick, true);
    };
  }, [isVisible, isCreatingComment, activeCommentId, isNavigationMode, isScoped, startCreatingComment, containerOffset]);

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

  // Convert activeComment coordinates to container-relative if scoped (to match pin positions)
  const activeComment = activeCommentId ? (() => {
    const comment = allComments.find(c => c.id === activeCommentId);
    if (!comment) return null;
    
    // Convert document coordinates to container-relative if scoped
    if (isScoped) {
      return {
        ...comment,
        x: comment.x - containerOffset.x,
        y: comment.y - containerOffset.y
      };
    }
    return comment;
  })() : null;

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
              {isVisible && showPins && visibleComments.map((comment) => (
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
                      
                      // Dynamically highlight element under pin during drag
                      // Convert document coordinates to viewport coordinates for element detection
                      // elementsFromPoint always needs viewport coordinates (clientX/clientY style)
                      let viewportX: number;
                      let viewportY: number;
                      
                      if (isScoped) {
                        // For scoped containers, we need to account for container position and scroll
                        const root = document.getElementById('comment-widget-root');
                        if (root && root.parentElement) {
                          const container = root.parentElement;
                          const containerRect = container.getBoundingClientRect();
                          // docX/docY are document-relative
                          // Convert to container-relative first
                          const containerDocX = containerRect.left + window.scrollX;
                          const containerDocY = containerRect.top + window.scrollY;
                          const containerRelativeX = docX - containerDocX;
                          const containerRelativeY = docY - containerDocY;
                          // Then to viewport: container's viewport position + relative position - scroll
                          viewportX = containerRect.left + containerRelativeX - container.scrollLeft;
                          viewportY = containerRect.top + containerRelativeY - container.scrollTop;
                        } else {
                          viewportX = docX - window.scrollX;
                          viewportY = docY - window.scrollY;
                        }
                      } else {
                        // For full-page, simple conversion
                        viewportX = docX - window.scrollX;
                        viewportY = docY - window.scrollY;
                      }
                      
                      const elements = document.elementsFromPoint(viewportX, viewportY);
                      
                      // Find low-level element (not main containers)
                      const targetElement = findLowLevelElement(elements);
                      
                      // Clear previous drag highlight if element changed
                      if (currentDragHighlightRef.current && currentDragHighlightRef.current !== targetElement) {
                        const prevEl = currentDragHighlightRef.current;
                        const prevOutline = (prevEl as any).__commentWidgetDragOutline || '';
                        const prevOutlineOffset = (prevEl as any).__commentWidgetDragOutlineOffset || '';
                        prevEl.style.outline = prevOutline;
                        prevEl.style.outlineOffset = prevOutlineOffset;
                        delete (prevEl as any).__commentWidgetDragOutline;
                        delete (prevEl as any).__commentWidgetDragOutlineOffset;
                        currentDragHighlightRef.current = null;
                      }
                      
                      // Highlight new element if different
                      if (targetElement && currentDragHighlightRef.current !== targetElement) {
                        const prevOutline = targetElement.style.outline;
                        const prevOutlineOffset = targetElement.style.outlineOffset;
                        targetElement.style.outline = `2px dashed ${primaryColor}`;
                        targetElement.style.outlineOffset = '2px';
                        
                        // Store original styles
                        (targetElement as any).__commentWidgetDragOutline = prevOutline;
                        (targetElement as any).__commentWidgetDragOutlineOffset = prevOutlineOffset;
                        currentDragHighlightRef.current = targetElement;
                      }
                    }}
                    onDragEnd={(finalX, finalY) => {
                      // Clear dynamic drag highlight
                      if (currentDragHighlightRef.current) {
                        const prevEl = currentDragHighlightRef.current;
                        const prevOutline = (prevEl as any).__commentWidgetDragOutline || '';
                        const prevOutlineOffset = (prevEl as any).__commentWidgetDragOutlineOffset || '';
                        prevEl.style.outline = prevOutline;
                        prevEl.style.outlineOffset = prevOutlineOffset;
                        delete (prevEl as any).__commentWidgetDragOutline;
                        delete (prevEl as any).__commentWidgetDragOutlineOffset;
                        currentDragHighlightRef.current = null;
                      }
                      
                      // Convert container-relative to document coordinates if scoped
                      let docX = finalX;
                      let docY = finalY;
                      
                      if (isScoped) {
                        docX = finalX + containerOffset.x;
                        docY = finalY + containerOffset.y;
                      }
                      
                      // Identify element under new position and update selector
                      // Convert document coordinates to viewport coordinates for element detection
                      let viewportX: number;
                      let viewportY: number;
                      
                      if (isScoped) {
                        // For scoped containers, we need to account for container position and scroll
                        const root = document.getElementById('comment-widget-root');
                        if (root && root.parentElement) {
                          const container = root.parentElement;
                          const containerRect = container.getBoundingClientRect();
                          // docX/docY are document-relative
                          // Convert to container-relative first
                          const containerDocX = containerRect.left + window.scrollX;
                          const containerDocY = containerRect.top + window.scrollY;
                          const containerRelativeX = docX - containerDocX;
                          const containerRelativeY = docY - containerDocY;
                          // Then to viewport: container's viewport position + relative position - scroll
                          viewportX = containerRect.left + containerRelativeX - container.scrollLeft;
                          viewportY = containerRect.top + containerRelativeY - container.scrollTop;
                        } else {
                          viewportX = docX - window.scrollX;
                          viewportY = docY - window.scrollY;
                        }
                      } else {
                        // For full-page, simple conversion
                        viewportX = docX - window.scrollX;
                        viewportY = docY - window.scrollY;
                      }
                      
                      const elements = document.elementsFromPoint(viewportX, viewportY);
                      
                      // Find low-level element (not main containers)
                      const targetElement = findLowLevelElement(elements);
                      
                      let newSelector: string | undefined = undefined;
                      if (targetElement) {
                        // Generate robust selector
                        newSelector = generateSelectorForElement(targetElement);
                      }
                      
                      // Update comment position and selector
                      updateCommentPosition(comment.id, docX, docY, newSelector);
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
                      // Convert document coordinates to container-relative for display if scoped
                      left: isScoped ? newCommentPosition.x - containerOffset.x : newCommentPosition.x,
                      top: isScoped ? newCommentPosition.y - containerOffset.y : newCommentPosition.y,
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
                position={
                  // Convert document coordinates to container-relative if scoped (to match preview dot position)
                  isScoped
                    ? {
                        x: newCommentPosition.x - containerOffset.x,
                        y: newCommentPosition.y - containerOffset.y
                      }
                    : newCommentPosition
                }
                onSubmit={createComment}
                onCancel={cancelCreatingComment}
              />
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bg-black/80 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm pointer-events-none font-medium shadow-xl border border-white/10"
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
