import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Check, Reply, ChevronRight, MessageCircle } from 'lucide-react';
import { Comment } from './types';
import { useCommentContext } from './CommentContext';

interface CommentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  comments: Comment[];
  onNavigateToComment: (comment: Comment) => void;
}

export const CommentSidebar: React.FC<CommentSidebarProps> = ({
  isOpen,
  onClose,
  comments,
  onNavigateToComment,
}) => {
  const [filter, setFilter] = useState<'all' | 'resolved' | 'unresolved'>('all');
  const [sortBy, setSortBy] = useState<'page' | 'author' | 'date'>('page');
  const { primaryColor } = useCommentContext();

  const filteredComments = comments.filter(comment => {
    switch (filter) {
      case 'resolved':
        return comment.resolved;
      case 'unresolved':
        return !comment.resolved;
      default:
        return true;
    }
  });

  const sortComments = (comments: Comment[]) => {
    const sorted = [...comments];
    switch (sortBy) {
      case 'author':
        return sorted.sort((a, b) => (a.author || 'Anonymous').localeCompare(b.author || 'Anonymous'));
      case 'date':
        return sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      case 'page':
      default:
        return sorted.sort((a, b) => (a.pageUrl || '/').localeCompare(b.pageUrl || '/'));
    }
  };

  const displayComments = sortComments(filteredComments);

  const handleNavigateToComment = (comment: Comment) => {
    onNavigateToComment(comment);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'tween', duration: 0.3, ease: "easeInOut" }}
          className="bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl pointer-events-auto"
          style={{ zIndex: 2147483646 }}
          onClick={(e) => e.stopPropagation()} // Prevent clicks from closing/triggering widget
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900 text-sm">Comments</h2>
              <span 
                className="text-white text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                {displayComments.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Controls */}
          <div className="p-4 border-b border-slate-200 bg-white shrink-0">
            <div className="flex gap-2 items-center justify-between">
              <div className="flex gap-1">
                {(['all', 'unresolved', 'resolved'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                      filter === status
                        ? 'text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    style={{
                      backgroundColor: filter === status ? primaryColor : undefined,
                    }}
                  >
                    {status === 'all' ? 'All' : status === 'resolved' ? 'Resolved' : 'Open'}
                  </button>
                ))}
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs py-1 pl-2 pr-6 bg-slate-50 border border-slate-200 rounded-md text-slate-600 focus:outline-none focus:border-primary-500 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.25rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.2em'
                }}
              >
                <option value="page">By Page</option>
                <option value="author">By Author</option>
                <option value="date">By Date</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto bg-white">
            {displayComments.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <MessageCircle className="w-12 h-12 mx-auto opacity-30 mb-3" />
                <p className="text-sm">No comments found</p>
              </div>
            ) : (
              <div className="space-y-0">
                {displayComments.map(comment => (
                  <div
                    key={comment.id}
                    onClick={() => handleNavigateToComment(comment)}
                    className="p-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <div 
                        className="w-2 h-2 rounded-full mt-2 shrink-0" 
                        style={{ backgroundColor: comment.resolved ? '#10b981' : primaryColor }}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 line-clamp-2 mb-1 leading-relaxed">
                          {comment.text}
                        </p>
                        
                        <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <div 
                              className="w-4 h-4 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${primaryColor}1A` }}
                            >
                              <span className="text-[10px] font-semibold" style={{ color: primaryColor }}>
                                {(comment.author || 'A').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{comment.author || 'Anonymous'}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(comment.timestamp).toLocaleDateString()}</span>
                          </div>

                          {comment.replies.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Reply className="w-3 h-3" />
                              <span>{comment.replies.length}</span>
                            </div>
                          )}

                          {comment.resolved && (
                            <div className="flex items-center gap-1 text-emerald-500">
                              <Check className="w-3 h-3" />
                              <span className="font-medium">Resolved</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


