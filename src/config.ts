import { StorageAdapter } from './storage/StorageAdapter';

export interface CommentWidgetConfig {
  /**
   * Storage adapter for persisting comments
   */
  storage: StorageAdapter;
  
  /**
   * Primary color for the widget (hex color)
   * @default '#575CE5'
   */
  primaryColor?: string;
  
  /**
   * Position of the floating button
   * @default 'bottom-right'
   */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  
  /**
   * Enable keyboard shortcuts
   * @default true
   */
  enableKeyboardShortcuts?: boolean;
  
  /**
   * Keyboard shortcut to toggle comments
   * @default 'c'
   */
  keyboardShortcut?: string;

  /**
   * DOM element to mount the widget into.
   * If provided, the widget will be scoped to this element instead of the entire page.
   */
  container?: HTMLElement | null;

  /**
   * Whether to render the sidebar via a Portal to the document body.
   * If true (default), the sidebar is fixed to the browser viewport.
   * If false, the sidebar is rendered inside the widget container (useful for scoped demos).
   * @default true
   */
  usePortal?: boolean;

  /**
   * Hide the floating button
   * @default false
   */
  hideButton?: boolean;

  /**
   * Hide the sidebar (comments can still be viewed via comment threads)
   * @default false
   */
  hideSidebar?: boolean;
}

export const defaultConfig: Partial<CommentWidgetConfig> = {
  primaryColor: '#575CE5',
  position: 'bottom-right',
  enableKeyboardShortcuts: true,
  keyboardShortcut: 'c',
  container: null,
  usePortal: true,
  hideButton: false,
  hideSidebar: false,
};

export function mergeConfig(userConfig: CommentWidgetConfig): Required<CommentWidgetConfig> {
  return {
    ...defaultConfig,
    ...userConfig,
  } as Required<CommentWidgetConfig>;
}

