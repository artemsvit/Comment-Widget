export interface Comment {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
  timestamp: Date;
  replies: Reply[];
  resolved: boolean;
  pageUrl: string;
  parentId?: string;
  selector?: string; // CSS selector of the element the comment is attached to
}

export interface Reply {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  commentId: string;
}

export interface CommentPosition {
  x: number;
  y: number;
}

export interface CommentFormData {
  text: string;
  author: string;
}

export interface CommentSystemState {
  comments: Comment[];
  activeCommentId: string | null;
  isVisible: boolean;
  isCreatingComment: boolean;
  newCommentPosition: CommentPosition | null;
  showPreviewDot: boolean;
}

