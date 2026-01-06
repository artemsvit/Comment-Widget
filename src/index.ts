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
      widgetContainer.style.position = 'absolute';
      widgetContainer.style.top = '0';
      widgetContainer.style.left = '0';
      widgetContainer.style.width = '100%';
      // When scoped, we need to match the container's scroll height if it's scrollable,
      // or just 100% if it's not. 
      // Actually, if we use 'absolute' inside a 'relative' container, 100% height
      // will only match the visible height if the container is scrolling.
      // We should check if we can make it cover the scrollHeight.
      // But for simplicity and robustness, sticky overlay or fixed overlay logic is tricky inside a div.
      // A better approach for the overlay is to be sticky itself or use JS to size it.
      // Let's try 100% first but ensure the parent is handled right.
      
      // If we want the overlay to cover the entire SCROLLABLE area:
      // widgetContainer.style.height = '100%'; 
      // But if the container has overflow: auto, absolute 100% is relative to the *padding box*.
      // If content overflows, we might need more.
      
      // Let's set min-height to 100% to be safe
      widgetContainer.style.minHeight = '100%';
      
      widgetContainer.style.pointerEvents = 'none';
      widgetContainer.style.zIndex = '999';
      
      // Ensure container handles positioning
      const containerStyle = window.getComputedStyle(mergedConfig.container);
      if (containerStyle.position === 'static') {
        mergedConfig.container.style.position = 'relative';
      }
      
      mergedConfig.container.appendChild(widgetContainer);

      // Add ResizeObserver to sync height with scrollHeight
      // We need to monitor both the container size and its content size (scrollHeight)
      const resizeObserver = new ResizeObserver(() => {
        if (widgetContainer && mergedConfig.container) {
          const scrollHeight = mergedConfig.container.scrollHeight;
          const clientHeight = mergedConfig.container.clientHeight;
          // Only update if scrollHeight is actually larger than clientHeight (overflowing)
          // or if it just changed.
          widgetContainer.style.height = `${Math.max(scrollHeight, clientHeight)}px`;
        }
      });
      
      // Observe the container itself
      resizeObserver.observe(mergedConfig.container);
      
      // Also observe the children of the container to detect content changes
      // This is a bit expensive but necessary if content grows without container resizing
      // A MutationObserver might be better for content changes, but ResizeObserver on children is robust for layout changes
      // Actually, we can just observe the container and rely on it firing when scrollHeight changes?
      // ResizeObserver fires when content box changes. It does NOT fire when scrollHeight changes due to children.
      // So we need to observe the children or use a MutationObserver.
      // Let's use a simple interval check or MutationObserver for robustness in this demo.
      // Or just observe the first child wrapper if it exists.
      
      // Better: Observe the body or a specific content wrapper if possible.
      // For now, let's attach a MutationObserver to detect DOM changes that might affect height.
      const mutationObserver = new MutationObserver(() => {
         if (widgetContainer && mergedConfig.container) {
            const scrollHeight = mergedConfig.container.scrollHeight;
            const clientHeight = mergedConfig.container.clientHeight;
            widgetContainer.style.height = `${Math.max(scrollHeight, clientHeight)}px`;
         }
      });
      
      mutationObserver.observe(mergedConfig.container, { 
        childList: true, 
        subtree: true, 
        attributes: true,
        attributeFilter: ['style', 'class'] 
      });

      // Initial sync
      const scrollHeight = mergedConfig.container.scrollHeight;
      const clientHeight = mergedConfig.container.clientHeight;
      widgetContainer.style.height = `${Math.max(scrollHeight, clientHeight)}px`;

      // Store observers to disconnect later
      (widgetContainer as any).__observers = [resizeObserver, mutationObserver];

    } else {
      // Full screen fixed
      widgetContainer.style.position = 'fixed';
      widgetContainer.style.top = '0';
      widgetContainer.style.left = '0';
      widgetContainer.style.width = '100%';
      widgetContainer.style.height = '100%';
      widgetContainer.style.pointerEvents = 'none';
      widgetContainer.style.zIndex = '999999';
      document.body.appendChild(widgetContainer);
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
  (window as any).CommentWidget = {
    init,
    initCommentWidget,
    LocalStorageAdapter,
    APIAdapter,
    FirebaseAdapter,
    SupabaseAdapter,
  };
}

