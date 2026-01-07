import './index.css';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { CommentWidget } from './widget/CommentWidget';
import { CommentWidgetConfig, mergeConfig } from './config';
import { Comment } from './core/types';

// Import and export types and adapters
import { LocalStorageAdapter } from './storage/LocalStorageAdapter';
import { APIAdapter } from './storage/APIAdapter';
import { FirebaseAdapter } from './storage/FirebaseAdapter';
import { SupabaseAdapter } from './storage/SupabaseAdapter';

export { LocalStorageAdapter, APIAdapter, FirebaseAdapter, SupabaseAdapter };
export type { StorageAdapter } from './storage/StorageAdapter';
export type { CommentWidgetConfig, Comment };

// Widget instance management
let widgetRoot: Root | null = null;
let widgetContainer: HTMLDivElement | null = null;

export interface CommentWidgetAPI {
  /**
   * Destroy the widget and remove it from the DOM
   */
  destroy: () => void;
  
  /**
   * Activate comment mode (show pins/overlay)
   */
  show: () => void;
  
  /**
   * Deactivate comment mode (hide pins/overlay)
   */
  hide: () => void;

  /**
   * Activate comment creation mode
   * @param position Optional position to start creating a comment at { x, y }
   */
  startComment: (position?: { x: number; y: number }) => void;

  /**
   * Get all comments
   */
  getAllComments: () => Comment[];

  /**
   * Navigate to a specific comment
   */
  navigateToComment: (commentId: string) => void;
}

/**
 * Initialize the comment widget
 * @param config Widget configuration
 * @returns Widget API for controlling the widget
 */
export function initCommentWidget(config: CommentWidgetConfig): CommentWidgetAPI {
  // Merge with defaults
  const mergedConfig = mergeConfig(config);

  // Custom event dispatcher to communicate with React component
  const dispatchWidgetEvent = (detail: any) => {
    window.dispatchEvent(new CustomEvent('comment-widget-event', { detail }));
  };

  // Create container if it doesn't exist
  if (!widgetContainer) {
    widgetContainer = document.createElement('div');
    widgetContainer.id = 'comment-widget-root';
    
    if (mergedConfig.container) {
      // Scoped to container
      // Use position: absolute to cover the entire scrollable content area
      widgetContainer.style.position = 'absolute';
      widgetContainer.style.top = '0';
      widgetContainer.style.left = '0';
      widgetContainer.style.width = '100%';
      // Set height to match scrollHeight so pins can be placed anywhere in the scrollable area
      // Use min-height: 100% as fallback
      widgetContainer.style.minHeight = '100%';
      // overflow: visible ensures pins slightly outside bounds are still visible
      widgetContainer.style.overflow = 'visible';
      widgetContainer.style.pointerEvents = 'none';
      widgetContainer.style.zIndex = '999';
      
      // Ensure container handles positioning
      const containerStyle = window.getComputedStyle(mergedConfig.container);
      if (containerStyle.position === 'static') {
        mergedConfig.container.style.position = 'relative';
      }
      
      mergedConfig.container.appendChild(widgetContainer);

      // Sync height with container's scrollHeight to ensure pins are visible in scrollable areas
      // Use a debounced approach to avoid feedback loops
      let heightSyncTimeout: ReturnType<typeof setTimeout> | null = null;
      let lastScrollHeight = 0;
      
      const syncHeight = () => {
        if (!widgetContainer || !mergedConfig.container) return;
        
        // Get the scroll height of actual content (excluding our widget container)
        // We need to temporarily hide our container to get accurate scrollHeight
        const prevDisplay = widgetContainer.style.display;
        widgetContainer.style.display = 'none';
        const contentScrollHeight = mergedConfig.container.scrollHeight;
        widgetContainer.style.display = prevDisplay;
        
        // Only update if scrollHeight actually changed (avoid feedback loop)
        if (contentScrollHeight !== lastScrollHeight) {
          lastScrollHeight = contentScrollHeight;
          const clientHeight = mergedConfig.container.clientHeight;
          widgetContainer.style.height = `${Math.max(contentScrollHeight, clientHeight)}px`;
        }
      };
      
      const debouncedSyncHeight = () => {
        if (heightSyncTimeout) clearTimeout(heightSyncTimeout);
        heightSyncTimeout = setTimeout(syncHeight, 50);
      };
      
      // Use ResizeObserver to detect container size changes
      const resizeObserver = new ResizeObserver(debouncedSyncHeight);
      resizeObserver.observe(mergedConfig.container);
      
      // Use MutationObserver to detect content changes that affect height
      const mutationObserver = new MutationObserver(debouncedSyncHeight);
      mutationObserver.observe(mergedConfig.container, { 
        childList: true, 
        subtree: true, 
        attributes: true,
        attributeFilter: ['style', 'class'] 
      });

      // Initial sync
      syncHeight();

      // Store observers to disconnect later
      (widgetContainer as any).__observers = [resizeObserver, mutationObserver];
      (widgetContainer as any).__heightSyncTimeout = heightSyncTimeout;

    } else {
      // Full page absolute - covers entire document
      widgetContainer.style.position = 'absolute';
      widgetContainer.style.top = '0';
      widgetContainer.style.left = '0';
      widgetContainer.style.width = '100%';
      // Height will be set to document height via ResizeObserver
      widgetContainer.style.height = `${Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight)}px`;
      widgetContainer.style.pointerEvents = 'none';
      widgetContainer.style.zIndex = '999999';
      document.body.appendChild(widgetContainer);

      // Sync height with document scrollHeight for full-page mode
      const updateFullPageHeight = () => {
        if (widgetContainer) {
          const docHeight = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight,
            window.innerHeight
          );
          widgetContainer.style.height = `${docHeight}px`;
        }
      };

      const resizeObserver = new ResizeObserver(updateFullPageHeight);
      resizeObserver.observe(document.body);
      resizeObserver.observe(document.documentElement);

      const mutationObserver = new MutationObserver(updateFullPageHeight);
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });

      // Initial sync
      updateFullPageHeight();

      // Store observers for cleanup
      (widgetContainer as any).__observers = [resizeObserver, mutationObserver];
    }
  }

  // Create root and render widget
  if (!widgetRoot) {
    widgetRoot = createRoot(widgetContainer);
  }

  widgetRoot.render(
    React.createElement(CommentWidget, { config: mergedConfig })
  );

  // Return API
  return {
    destroy: () => {
      if (widgetRoot) {
        widgetRoot.unmount();
        widgetRoot = null;
      }
      if (widgetContainer) {
        // Disconnect observers if they exist
        if ((widgetContainer as any).__observers) {
          (widgetContainer as any).__observers.forEach((obs: any) => {
            if (obs.disconnect) obs.disconnect();
          });
        }
        
        // Clear height sync timeout if exists
        if ((widgetContainer as any).__heightSyncTimeout) {
          clearTimeout((widgetContainer as any).__heightSyncTimeout);
        }

        if (widgetContainer.parentElement) {
          widgetContainer.parentElement.removeChild(widgetContainer);
        }
        widgetContainer = null;
      }
    },
    show: () => {
      if (widgetContainer) {
        widgetContainer.style.display = 'block'; // Ensure container is visible
        dispatchWidgetEvent({ type: 'SET_VISIBLE', visible: true });
      }
    },
    hide: () => {
      // Don't hide container, just set internal state to invisible
      dispatchWidgetEvent({ type: 'SET_VISIBLE', visible: false });
    },
    startComment: (position?: { x: number; y: number }) => {
      dispatchWidgetEvent({ type: 'START_COMMENT', position });
    },
    getAllComments: () => {
      return (window as any)._commentWidgetInternals?.getAllComments() || [];
    },
    navigateToComment: (commentId: string) => {
      (window as any)._commentWidgetInternals?.navigateToComment(commentId);
    }
  };
}

/**
 * Default initialization for CDN usage
 * Exposed as window.CommentWidget.init()
 */
export function init(config: CommentWidgetConfig): CommentWidgetAPI {
  return initCommentWidget(config);
}

// For UMD build - expose on window
if (typeof window !== 'undefined') {
  // Ensure we don't overwrite if it exists (though typically we want to set it)
  // Use a temporary object to hold exports
  const exports = {
    init,
    initCommentWidget,
    LocalStorageAdapter,
    APIAdapter,
    FirebaseAdapter,
    SupabaseAdapter,
  };
  
  // Force assignment to window
  (window as any).CommentWidget = exports;
  
  // Also expose properties directly on window for convenience
  (window as any).initCommentWidget = initCommentWidget;
  (window as any).LocalStorageAdapter = LocalStorageAdapter;
  
  console.log('Comment Widget Loaded (Bundled)');
}

