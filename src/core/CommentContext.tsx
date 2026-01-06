import React, { createContext, useContext, ReactNode } from 'react';
import { useComments } from './useComments';
import { StorageAdapter } from '../storage/StorageAdapter';

interface CommentProviderProps {
  children: ReactNode;
  storageAdapter: StorageAdapter;
  primaryColor?: string;
}

// Create the context
const CommentContext = createContext<ReturnType<typeof useComments> | null>(null);

// Provider component
export const CommentProvider: React.FC<CommentProviderProps> = ({ 
  children, 
  storageAdapter,
  primaryColor = '#575CE5'
}) => {
  const commentState = useComments(storageAdapter, primaryColor);
  return (
    <CommentContext.Provider value={commentState}>
      {children}
    </CommentContext.Provider>
  );
};

// Hook to use the comment context
export const useCommentContext = () => {
  const context = useContext(CommentContext);
  if (!context) {
    throw new Error('useCommentContext must be used within a CommentProvider');
  }
  return context;
};

