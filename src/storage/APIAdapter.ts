import { StorageAdapter } from './StorageAdapter';
import { Comment } from '../core/types';

export interface APIAdapterConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  endpoints?: {
    load?: string;
    save?: string;
  };
}

export class APIAdapter implements StorageAdapter {
  private config: APIAdapterConfig;

  constructor(config: APIAdapterConfig) {
    this.config = {
      ...config,
      endpoints: {
        load: config.endpoints?.load || '/comments',
        save: config.endpoints?.save || '/comments',
      },
    };
  }

  async loadComments(): Promise<Comment[]> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}${this.config.endpoints!.load}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load comments: ${response.statusText}`);
      }

      const data = await response.json();
      return data.map((comment: Comment) => ({
        ...comment,
        timestamp: new Date(comment.timestamp),
        replies: comment.replies.map((reply) => ({
          ...reply,
          timestamp: new Date(reply.timestamp),
        })),
      }));
    } catch (error) {
      console.error('Failed to load comments from API:', error);
      return [];
    }
  }

  async saveComments(comments: Comment[]): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}${this.config.endpoints!.save}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers,
          },
          body: JSON.stringify(comments),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save comments: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to save comments to API:', error);
      throw error;
    }
  }
}

