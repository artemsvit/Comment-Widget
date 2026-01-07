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
// Filters out main containers and prefers medium-sized block elements
// Excludes small inline elements like spans and labels
function findLowLevelElement(elements: Element[]): HTMLElement | null {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxContainerSize = Math.max(viewportWidth, viewportHeight) * 0.9; // 90% of viewport
  const minElementSize = 50; // Minimum size for an element to be considered (50px)
  const minArea = 2000; // Minimum area (width * height) for an element to be considered
  
  // Tags to exclude (small inline elements)
  const excludedTags = ['SPAN', 'STRONG', 'EM', 'B', 'I', 'CODE', 'LABEL', 'SMALL', 'SUB', 'SUP', 'MARK'];
  
  // Tags that are typically containers (to avoid)
  const containerTags = ['BODY', 'HTML'];
  
  // Block-level elements that are good candidates (medium-sized blocks)
  const preferredBlockTags = ['SECTION', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER', 'NAV', 'MAIN', 'DIV'];
  
  // First pass: look for elements with IDs (most reliable, prefer medium-sized)
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
    
    // Skip excluded small elements
    if (excludedTags.includes(tagName)) {
      continue;
    }
    
    // Prefer elements with IDs
    if (htmlEl.id) {
      const rect = htmlEl.getBoundingClientRect();
      const elementWidth = rect.width;
      const elementHeight = rect.height;
      const area = elementWidth * elementHeight;
      
      // Must be medium-sized (not too small, not too large)
      if (elementWidth >= minElementSize && elementHeight >= minElementSize &&
          area >= minArea &&
          elementWidth < viewportWidth * 0.9 && elementHeight < viewportHeight * 0.9) {
        return htmlEl;
      }
    }
  }
  
  // Second pass: look for preferred block-level elements (medium-sized)
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
    
    // Skip excluded small elements
    if (excludedTags.includes(tagName)) {
      continue;
    }
    
    // Get element dimensions
    const rect = htmlEl.getBoundingClientRect();
    const elementWidth = rect.width;
    const elementHeight = rect.height;
    const area = elementWidth * elementHeight;
    
    // Skip elements that are too small or too large
    if (elementWidth < minElementSize || elementHeight < minElementSize || area < minArea) {
      continue;
    }
    
    if (elementWidth > maxContainerSize || elementHeight > maxContainerSize) {
      continue;
    }
    
    // Prefer block-level elements
    if (preferredBlockTags.includes(tagName)) {
      return htmlEl;
    }
    
    // Accept interactive elements if they're medium-sized
    if (['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) {
      return htmlEl;
    }
    
    // Accept heading and paragraph elements if medium-sized
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P'].includes(tagName)) {
      return htmlEl;
    }
  }
  
  // Third pass: look for any medium-sized element (fallback)
  for (const el of elements) {
    if (el.closest('#comment-widget-root') || el.closest('[data-comment-widget]')) {
      continue;
    }
    if (el === document.body || el === document.documentElement) {
      continue;
    }
    
    const tagName = el.tagName;
    const htmlEl = el as HTMLElement;
    
    // Skip excluded small elements
    if (excludedTags.includes(tagName)) {
      continue;
    }
    
    const rect = htmlEl.getBoundingClientRect();
    const elementWidth = rect.width;
    const elementHeight = rect.height;
    const area = elementWidth * elementHeight;
    
    // Must be medium-sized
    if (elementWidth >= minElementSize && elementHeight >= minElementSize &&
        area >= minArea &&
        elementWidth < viewportWidth * 0.9 && elementHeight < viewportHeight * 0.9) {
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
  
  // Track elements with drag highlights for efficient cleanup
  const dragHighlightedElementsRef = useRef<Set<HTMLElement>>(new Set());
  
  // Clear all highlights on mount - optimized version without querySelectorAll('*')
  useEffect(() => {
    const clearAllHighlights = () => {
      // Clear all hover highlights (these have a data attribute, so querySelector is efficient)
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
      
      // Clear tracked drag highlights (from our ref, no DOM scan needed)
      dragHighlightedElementsRef.current.forEach((htmlEl) => {
        if ((htmlEl as any).__commentWidgetDragOutline !== undefined) {
          const prevOutline = (htmlEl as any).__commentWidgetDragOutline || '';
          const prevOutlineOffset = (htmlEl as any).__commentWidgetDragOutlineOffset || '';
          htmlEl.style.outline = prevOutline;
          htmlEl.style.outlineOffset = prevOutlineOffset;
          if (!prevOutline) {
            htmlEl.style.transition = '';
          }
          delete (htmlEl as any).__commentWidgetDragOutline;
          delete (htmlEl as any).__commentWidgetDragOutlineOffset;
        }
      });
      dragHighlightedElementsRef.current.clear();
    };
    
    // Clear immediately on mount
    clearAllHighlights();
    
    // Clear on unmount
    return () => clearAllHighlights();
  }, []);

  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [scrollOffsets, setScrollOffsets] = useState({ x: window.scrollX, y: window.scrollY });
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });
  const [showPins, setShowPins] = useState(false);
  const [draggingCommentId, setDraggingCommentId] = useState<string | null>(null);
  const [recentlyDraggedCommentIds, setRecentlyDraggedCommentIds] = useState<Set<string>>(new Set());
  const lastDragHighlightRef = useRef<{ element: HTMLElement; timeout: NodeJS.Timeout } | null>(null);
  const currentDragHighlightRef = useRef<HTMLElement | null>(null);
  const measureContainerRef = useRef<(() => void) | null>(null);

  const allComments = getAllComments();
  const currentPageComments = getCommentsForCurrentPage();
  
  // Filter comments to only show those visible in viewport, and convert to container-relative coordinates if scoped
  const visibleComments = useMemo(() => {
    const sidebarWidth = isSidebarOpen ? 320 : 0;
    const viewportWidth = windowDimensions.width - sidebarWidth;
    const viewportHeight = windowDimensions.height;
    const margin = 200; // Larger margin to prevent flickering when scrolling
    
    // For recently dragged/interacted comments, use a larger margin to ensure they stay visible
    const getMarginForComment = (commentId: string) => {
      if (recentlyDraggedCommentIds.has(commentId) || draggingCommentId === commentId || activeCommentId === commentId) {
        return margin * 3; // Much larger margin (600px) for recently dragged/interacted comments
      }
      return margin;
    };

    // Detect left sidebar (config panel) - typically has class "config-panel" or "w-72" (288px width)
    // For scoped containers, we don't need to filter by left sidebar since the container itself
    // is positioned to the right of the sidebar. Only apply this check for full-page mode.
    const leftSidebarWidth = (() => {
      if (typeof document === 'undefined') return 0;
      if (isScoped) return 0; // Skip left sidebar check for scoped containers
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
          // Always recalculate container offset fresh from DOM to avoid stale state issues
          // This ensures coordinates are always accurate, especially after popup closes or drag ends
          const root = document.getElementById('comment-widget-root');
          if (root && root.parentElement) {
            const container = root.parentElement;
            const containerRect = container.getBoundingClientRect();
            const freshContainerOffsetX = containerRect.left + window.scrollX;
            const freshContainerOffsetY = containerRect.top + window.scrollY;
            relativeX = comment.x - freshContainerOffsetX;
            relativeY = comment.y - freshContainerOffsetY;
          } else {
            // Fallback to state only if root not found (shouldn't happen)
            relativeX = comment.x - containerOffset.x;
            relativeY = comment.y - containerOffset.y;
          }
        }
        
        return { ...comment, x: relativeX, y: relativeY };
      })
      .filter((comment) => {
        // Always show comments that are being dragged, were recently dragged, or are active
        if (draggingCommentId === comment.id || recentlyDraggedCommentIds.has(comment.id) || activeCommentId === comment.id) {
          return true;
        }
        
        // For scoped containers, we're now setting the widget height to match scrollHeight
        // So pins should always be visible within the scrollable area
        // We only need to filter out pins that are under sidebars or truly outside bounds
        
        // For recently interacted comments, be more lenient with sidebar filters
        const isRecentlyInteracted = recentlyDraggedCommentIds.has(comment.id) || draggingCommentId === comment.id;
        
        let viewportX: number;
        let viewportY: number;
        let effectiveViewportWidth: number;
        let effectiveViewportHeight: number;
        
        if (isScoped) {
          const root = document.getElementById('comment-widget-root');
          if (root && root.parentElement) {
            const container = root.parentElement;
            const freshScrollX = container.scrollLeft;
            const freshScrollY = container.scrollTop;
            effectiveViewportWidth = container.clientWidth - (isSidebarOpen ? 320 : 0);
            effectiveViewportHeight = container.clientHeight;
            viewportX = comment.x - freshScrollX;
            viewportY = comment.y - freshScrollY;
          } else {
            const freshScrollX = scrollOffsets.x;
            const freshScrollY = scrollOffsets.y;
            effectiveViewportWidth = viewportWidth;
            effectiveViewportHeight = viewportHeight;
            viewportX = comment.x - freshScrollX;
            viewportY = comment.y - freshScrollY;
          }
        } else {
          // For full-page, check if comment-widget-root is inside a scrollable container
          const root = document.getElementById('comment-widget-root');
          let scrollableContainer: HTMLElement | null = null;
          
          if (root) {
            // Find the nearest scrollable ancestor
            let parent: HTMLElement | null = root.parentElement;
            while (parent && parent !== document.body) {
              const style = window.getComputedStyle(parent);
              const overflowY = style.overflowY;
              const overflowX = style.overflowX;
              if ((overflowY === 'auto' || overflowY === 'scroll' || overflowX === 'auto' || overflowX === 'scroll') &&
                  (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth)) {
                scrollableContainer = parent;
                break;
              }
              parent = parent.parentElement;
            }
          }
          
          if (scrollableContainer) {
            // Found a scrollable container - account for its scroll position
            const containerRect = scrollableContainer.getBoundingClientRect();
            const containerDocX = containerRect.left + window.scrollX;
            const containerDocY = containerRect.top + window.scrollY;
            
            // Convert comment position (document coords) to container-relative
            const containerRelativeX = comment.x - containerDocX;
            const containerRelativeY = comment.y - containerDocY;
            
            // Then to viewport: container-relative - container scroll
            viewportX = containerRelativeX - scrollableContainer.scrollLeft;
            viewportY = containerRelativeY - scrollableContainer.scrollTop;
            
            effectiveViewportWidth = scrollableContainer.clientWidth - (isSidebarOpen ? 320 : 0);
            effectiveViewportHeight = scrollableContainer.clientHeight;
          } else {
            // No scrollable container found, use window scroll
            const freshScrollX = window.scrollX;
            const freshScrollY = window.scrollY;
            viewportX = comment.x - freshScrollX;
            viewportY = comment.y - freshScrollY;
            effectiveViewportWidth = viewportWidth;
            effectiveViewportHeight = viewportHeight;
          }
        }
        
        // Filter out comments under left sidebar (config panel)
        // Skip this check for recently interacted comments to avoid false negatives
        const notUnderLeftSidebar = isRecentlyInteracted || leftSidebarWidth === 0 || viewportX >= leftSidebarWidth;
        
        // Filter out comments under right sidebar (when comment sidebar is open)
        // Skip this check for recently interacted comments to avoid false negatives
        const notUnderRightSidebar = isRecentlyInteracted || !isSidebarOpen || viewportX <= effectiveViewportWidth;
        
        // Validate coordinates are not invalid (NaN, Infinity, or extremely large values)
        const hasValidCoordinates = !isNaN(viewportX) && !isNaN(viewportY) && 
                                    isFinite(viewportX) && isFinite(viewportY) &&
                                    Math.abs(viewportX) < 100000 && Math.abs(viewportY) < 100000;
        
        // If coordinates are invalid, don't show the pin
        if (!hasValidCoordinates) {
          return false;
        }
        
        // Use larger margin for visibility check - be very lenient
        // Pins should be visible if they're within the scrollable content area
        const commentMargin = getMarginForComment(comment.id);
        const inX = viewportX >= -commentMargin && viewportX <= effectiveViewportWidth + commentMargin;
        const inY = viewportY >= -commentMargin && viewportY <= effectiveViewportHeight + commentMargin;
        
        // For scoped containers, always show pins that have valid coordinates and aren't under sidebars
        // The widget container now covers the full scrollHeight, so pins should always be visible
        if (isScoped) {
          return notUnderLeftSidebar && notUnderRightSidebar;
        }
        
        return inX && inY && notUnderLeftSidebar && notUnderRightSidebar;
      });
  }, [currentPageComments, isSidebarOpen, windowDimensions, scrollOffsets, containerOffset, isScoped, draggingCommentId, recentlyDraggedCommentIds, activeCommentId]);

  // Clear highlights when comment mode is turned off (no periodic polling needed)
  useEffect(() => {
    if (!isVisible) {
      // Clear all hover highlights (data attribute query is efficient)
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
      
      // Clear tracked drag highlights (from ref, no DOM scan)
      dragHighlightedElementsRef.current.forEach((htmlEl) => {
        if ((htmlEl as any).__commentWidgetDragOutline !== undefined) {
          const prevOutline = (htmlEl as any).__commentWidgetDragOutline || '';
          const prevOutlineOffset = (htmlEl as any).__commentWidgetDragOutlineOffset || '';
          htmlEl.style.outline = prevOutline;
          htmlEl.style.outlineOffset = prevOutlineOffset;
          if (!prevOutline) {
            htmlEl.style.transition = '';
          }
          delete (htmlEl as any).__commentWidgetDragOutline;
          delete (htmlEl as any).__commentWidgetDragOutlineOffset;
        }
      });
      dragHighlightedElementsRef.current.clear();
    }
  }, [isVisible]);
  
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
      
      // Clear ALL highlights when exiting comment mode
      // Clear drag highlights
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
      
      // Clear ALL hover highlights from pins (find all elements with comment widget outline markers)
      const allHighlightedElements = document.querySelectorAll('[data-comment-widget-highlight]');
      allHighlightedElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const prevOutline = (htmlEl as any).__commentWidgetOriginalOutline || '';
        const prevOutlineOffset = (htmlEl as any).__commentWidgetOriginalOutlineOffset || '';
        htmlEl.style.outline = prevOutline;
        htmlEl.style.outlineOffset = prevOutlineOffset;
        delete (htmlEl as any).__commentWidgetOriginalOutline;
        delete (htmlEl as any).__commentWidgetOriginalOutlineOffset;
        htmlEl.removeAttribute('data-comment-widget-highlight');
      });
      
      // Clear tracked drag highlights (from ref, no DOM scan)
      dragHighlightedElementsRef.current.forEach((htmlEl) => {
        if ((htmlEl as any).__commentWidgetDragOutline !== undefined) {
          const prevOutline = (htmlEl as any).__commentWidgetDragOutline || '';
          const prevOutlineOffset = (htmlEl as any).__commentWidgetDragOutlineOffset || '';
          htmlEl.style.outline = prevOutline;
          htmlEl.style.outlineOffset = prevOutlineOffset;
          delete (htmlEl as any).__commentWidgetDragOutline;
          delete (htmlEl as any).__commentWidgetDragOutlineOffset;
        }
      });
      dragHighlightedElementsRef.current.clear();
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

    // Store measureContainer ref so we can call it after drag
    measureContainerRef.current = measureContainer;
    
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
              overflow: 'visible', // Prevent contributing to scroll height
              backgroundColor: 'rgba(0, 0, 0, 0.01)', // Reduced opacity to avoid covering pins
              cursor: activeCommentId || isCreatingComment 
                ? 'default' 
                : isNavigationMode 
                  ? 'default' 
                  : 'crosshair'
            }}
          />

          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000, overflow: 'visible' }}>
            <AnimatePresence>
              {isVisible && showPins && visibleComments.map((comment) => (
                <div key={comment.id} className="pointer-events-auto" style={{ zIndex: 1001 }}>
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
                    onDragStart={() => {
                      // Mark this comment as being dragged so it stays visible
                      setDraggingCommentId(comment.id);
                      
                      // Clear any hover highlights when drag starts
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
                    }}
                    onDrag={(newX, newY) => {
                      // newX and newY are container-relative from CommentBubble when scoped
                      // Convert back to document coordinates for storage
                      let docX = newX;
                      let docY = newY;
                      
                      if (isScoped) {
                        // Recalculate container offset fresh to avoid stale state
                        const root = document.getElementById('comment-widget-root');
                        if (root && root.parentElement) {
                          const container = root.parentElement;
                          const containerRect = container.getBoundingClientRect();
                          const currentContainerOffsetX = containerRect.left + window.scrollX;
                          const currentContainerOffsetY = containerRect.top + window.scrollY;
                          docX = newX + currentContainerOffsetX;
                          docY = newY + currentContainerOffsetY;
                        } else {
                          // Fallback to state if root not found
                          docX = newX + containerOffset.x;
                          docY = newY + containerOffset.y;
                        }
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
                        
                        // Track this element for efficient cleanup
                        dragHighlightedElementsRef.current.add(targetElement);
                      }
                    }}
                    onDragEnd={(finalX, finalY) => {
                      // Clear dynamic drag highlight immediately
                      if (currentDragHighlightRef.current) {
                        const prevEl = currentDragHighlightRef.current;
                        const prevOutline = (prevEl as any).__commentWidgetDragOutline || '';
                        const prevOutlineOffset = (prevEl as any).__commentWidgetDragOutlineOffset || '';
                        prevEl.style.outline = prevOutline;
                        prevEl.style.outlineOffset = prevOutlineOffset;
                        if (!prevOutline) {
                          prevEl.style.transition = '';
                        }
                        delete (prevEl as any).__commentWidgetDragOutline;
                        delete (prevEl as any).__commentWidgetDragOutlineOffset;
                        currentDragHighlightRef.current = null;
                      }
                      
                      // Clear tracked drag highlights (from ref, no DOM scan)
                      dragHighlightedElementsRef.current.forEach((htmlEl) => {
                        if ((htmlEl as any).__commentWidgetDragOutline !== undefined && htmlEl !== currentDragHighlightRef.current) {
                          const prevOutline = (htmlEl as any).__commentWidgetDragOutline || '';
                          const prevOutlineOffset = (htmlEl as any).__commentWidgetDragOutlineOffset || '';
                          htmlEl.style.outline = prevOutline;
                          htmlEl.style.outlineOffset = prevOutlineOffset;
                          if (!prevOutline) {
                            htmlEl.style.transition = '';
                          }
                          delete (htmlEl as any).__commentWidgetDragOutline;
                          delete (htmlEl as any).__commentWidgetDragOutlineOffset;
                        }
                      });
                      dragHighlightedElementsRef.current.clear();
                      
                      // Convert container-relative to document coordinates if scoped
                      // Recalculate container offset fresh to avoid stale state
                      let docX = finalX;
                      let docY = finalY;
                      
                      if (isScoped) {
                        const root = document.getElementById('comment-widget-root');
                        if (root && root.parentElement) {
                          const container = root.parentElement;
                          const containerRect = container.getBoundingClientRect();
                          const currentContainerOffsetX = containerRect.left + window.scrollX;
                          const currentContainerOffsetY = containerRect.top + window.scrollY;
                          docX = finalX + currentContainerOffsetX;
                          docY = finalY + currentContainerOffsetY;
                        } else {
                          // Fallback to state if root not found
                          docX = finalX + containerOffset.x;
                          docY = finalY + containerOffset.y;
                        }
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
                      
                      // Mark as recently dragged to keep it visible while container offset updates
                      setRecentlyDraggedCommentIds(prev => new Set(prev).add(comment.id));
                      
                      // Clear dragging state
                      setDraggingCommentId(null);
                      
                      // Remove from recently dragged set after a longer delay to allow visibility filter to stabilize
                      // Use multiple timeouts to ensure it stays visible through multiple render cycles
                      setTimeout(() => {
                        // First check: verify the comment is still in the viewport before removing
                        const root = document.getElementById('comment-widget-root');
                        const isScopedCheck = root && root.parentElement && root.parentElement !== document.body;
                        
                        if (isScopedCheck && root && root.parentElement) {
                          const container = root.parentElement;
                          const containerRect = container.getBoundingClientRect();
                          const containerDocX = containerRect.left + window.scrollX;
                          const containerDocY = containerRect.top + window.scrollY;
                          const containerRelativeX = docX - containerDocX;
                          const containerRelativeY = docY - containerDocY;
                          const viewportX = containerRelativeX - container.scrollLeft;
                          const viewportY = containerRelativeY - container.scrollTop;
                          
                          const sidebarWidth = isSidebarOpen ? 320 : 0;
                          const viewportWidth = (isScopedCheck ? container.clientWidth : window.innerWidth) - sidebarWidth;
                          const viewportHeight = isScopedCheck ? container.clientHeight : window.innerHeight;
                          const margin = 200;
                          
                          const isVisible = viewportX >= -margin && viewportX <= viewportWidth + margin &&
                                           viewportY >= -margin && viewportY <= viewportHeight + margin;
                          
                          // Only remove if it's actually visible, otherwise keep it longer
                          if (isVisible) {
                            setRecentlyDraggedCommentIds(prev => {
                              const next = new Set(prev);
                              next.delete(comment.id);
                              return next;
                            });
                          } else {
                            // Keep it visible for longer if coordinates seem wrong
                            setTimeout(() => {
                              setRecentlyDraggedCommentIds(prev => {
                                const next = new Set(prev);
                                next.delete(comment.id);
                                return next;
                              });
                            }, 1000);
                          }
                        } else {
                          // For full-page, check visibility
                          const viewportX = docX - window.scrollX;
                          const viewportY = docY - window.scrollY;
                          const sidebarWidth = isSidebarOpen ? 320 : 0;
                          const viewportWidth = window.innerWidth - sidebarWidth;
                          const viewportHeight = window.innerHeight;
                          const margin = 200;
                          
                          const isVisible = viewportX >= -margin && viewportX <= viewportWidth + margin &&
                                           viewportY >= -margin && viewportY <= viewportHeight + margin;
                          
                          if (isVisible) {
                            setRecentlyDraggedCommentIds(prev => {
                              const next = new Set(prev);
                              next.delete(comment.id);
                              return next;
                            });
                          } else {
                            setTimeout(() => {
                              setRecentlyDraggedCommentIds(prev => {
                                const next = new Set(prev);
                                next.delete(comment.id);
                                return next;
                              });
                            }, 1000);
                          }
                        }
                      }, 1000);
                      
                      // Force recalculation of container offset and scroll offsets
                      // to ensure visibility filter uses fresh values
                      if (measureContainerRef.current) {
                        // Use requestAnimationFrame to ensure state updates are processed first
                        requestAnimationFrame(() => {
                          measureContainerRef.current?.();
                          // Force another update after a short delay to ensure visibility is recalculated
                          setTimeout(() => {
                            measureContainerRef.current?.();
                          }, 100);
                        });
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
                  onClose={() => {
                    const closedCommentId = activeComment.id;
                    // Mark as recently interacted when thread closes to keep pin visible
                    setRecentlyDraggedCommentIds(prev => new Set(prev).add(closedCommentId));
                    setActiveComment(null);
                    
                    // Force multiple recalculations of container offset to ensure visibility is accurate
                    if (measureContainerRef.current) {
                      requestAnimationFrame(() => {
                        measureContainerRef.current?.();
                        setTimeout(() => {
                          measureContainerRef.current?.();
                          setTimeout(() => {
                            measureContainerRef.current?.();
                          }, 200);
                        }, 200);
                      });
                    }
                    
                    // Remove from recently interacted set after a longer delay
                    // Verify coordinates are correct before removing
                    setTimeout(() => {
                      // Check if comment is actually visible before removing from set
                      const comment = getAllComments().find(c => c.id === closedCommentId);
                      if (comment) {
                        const root = document.getElementById('comment-widget-root');
                        const isScopedCheck = root && root.parentElement && root.parentElement !== document.body;
                        
                        let isVisible = false;
                        if (isScopedCheck && root && root.parentElement) {
                          const container = root.parentElement;
                          const containerRect = container.getBoundingClientRect();
                          const containerDocX = containerRect.left + window.scrollX;
                          const containerDocY = containerRect.top + window.scrollY;
                          const containerRelativeX = comment.x - containerDocX;
                          const containerRelativeY = comment.y - containerDocY;
                          const viewportX = containerRelativeX - container.scrollLeft;
                          const viewportY = containerRelativeY - container.scrollTop;
                          
                          const sidebarWidth = isSidebarOpen ? 320 : 0;
                          const viewportWidth = container.clientWidth - sidebarWidth;
                          const viewportHeight = container.clientHeight;
                          const margin = 600; // Use large margin for recently interacted
                          
                          isVisible = viewportX >= -margin && viewportX <= viewportWidth + margin &&
                                     viewportY >= -margin && viewportY <= viewportHeight + margin;
                        } else {
                          const viewportX = comment.x - window.scrollX;
                          const viewportY = comment.y - window.scrollY;
                          const sidebarWidth = isSidebarOpen ? 320 : 0;
                          const viewportWidth = window.innerWidth - sidebarWidth;
                          const viewportHeight = window.innerHeight;
                          const margin = 600;
                          
                          isVisible = viewportX >= -margin && viewportX <= viewportWidth + margin &&
                                     viewportY >= -margin && viewportY <= viewportHeight + margin;
                        }
                        
                        // Only remove if it's actually visible, otherwise keep it longer
                        if (isVisible) {
                          setRecentlyDraggedCommentIds(prev => {
                            const next = new Set(prev);
                            next.delete(closedCommentId);
                            return next;
                          });
                        } else {
                          // Keep it visible for even longer if coordinates seem wrong
                          setTimeout(() => {
                            setRecentlyDraggedCommentIds(prev => {
                              const next = new Set(prev);
                              next.delete(closedCommentId);
                              return next;
                            });
                          }, 2000);
                        }
                      } else {
                        // Comment not found, remove from set
                        setRecentlyDraggedCommentIds(prev => {
                          const next = new Set(prev);
                          next.delete(closedCommentId);
                          return next;
                        });
                      }
                    }, 2000); // Increased from 500ms to 2000ms
                  }}
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
