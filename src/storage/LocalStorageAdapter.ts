import { StorageAdapter } from './StorageAdapter';
import { Comment } from '../core/types';

export class LocalStorageAdapter implements StorageAdapter {
  private storageKey: string;

  constructor(storageKey: string = 'comment-widget-comments') {
    this.storageKey = storageKey;
  }

  async loadComments(): Promise<Comment[]> {
    try {
      const savedComments = localStorage.getItem(this.storageKey);
      if (savedComments) {
        const parsed = JSON.parse(savedComments);
        return parsed.map((comment: Comment) => ({
          ...comment,
          timestamp: new Date(comment.timestamp),
          replies: comment.replies.map((reply) => ({
            ...reply,
            timestamp: new Date(reply.timestamp),
          })),
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to load comments from localStorage:', error);
      return [];
    }
  }

  async saveComments(comments: Comment[]): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(comments));
    } catch (error) {
      console.error('Failed to save comments to localStorage:', error);
      throw error;
    }
  }

  subscribeToChanges(callback: (comments: Comment[]) => void): () => void {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === this.storageKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const comments = parsed.map((comment: Comment) => ({
            ...comment,
            timestamp: new Date(comment.timestamp),
            replies: comment.replies.map((reply) => ({
              ...reply,
              timestamp: new Date(reply.timestamp),
            })),
          }));
          callback(comments);
        } catch (error) {
          console.error('Failed to parse storage change:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }
}

