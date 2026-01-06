import { Comment } from '../core/types';

export interface StorageAdapter {
  /**
   * Load all comments from storage
   */
  loadComments(): Promise<Comment[]>;
  
  /**
   * Save comments to storage
   */
  saveComments(comments: Comment[]): Promise<void>;
  
  /**
   * Optional: Subscribe to real-time changes
   * Returns unsubscribe function
   */
  subscribeToChanges?(callback: (comments: Comment[]) => void): () => void;
}

