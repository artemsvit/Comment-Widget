import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, MapPin, Check, Reply, ChevronRight, MessageCircle } from 'lucide-react';
import { Comment } from './types';
import { format } from 'date-fns';
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

  const groupedComments = () => {
    switch (sortBy) {
      case 'page':
        return filteredComments.reduce((groups, comment) => {
          const pageKey = comment.pageUrl || '/';
          const pageName = getPageDisplayName(pageKey);
          if (!groups[pageName]) groups[pageName] = [];
          groups[pageName].push(comment);
          return groups;
        }, {} as Record<string, Comment[]>);
      
      case 'author':
        return filteredComments.reduce((groups, comment) => {
          const author = comment.author || 'Anonymous';
          if (!groups[author]) groups[author] = [];
          groups[author].push(comment);
          return groups;
        }, {} as Record<string, Comment[]>);
      
      case 'date':
        return filteredComments.reduce((groups, comment) => {
          const dateKey = format(comment.timestamp, 'MMM d, yyyy');
          if (!groups[dateKey]) groups[dateKey] = [];
          groups[dateKey].push(comment);
          return groups;
        }, {} as Record<string, Comment[]>);
      
      default:
        return { 'All Comments': filteredComments };
    }
  };

  const getPageDisplayName = (pageUrl: string): string => {
    if (!pageUrl || pageUrl === '/') return 'Home';
    
    const segments = pageUrl.split('/').filter(Boolean);
    if (segments.length === 0) return 'Home';
    
    const lastSegment = segments[segments.length - 1];
    return lastSegment
      .replace(/-/g, ' ')
      .replace(/#/g, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Page';
  };

  const handleNavigateToComment = (comment: Comment) => {
    onNavigateToComment(comment);
  };

  const groups = groupedComments();

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'tween', duration: 0.3, ease: "easeInOut" }}
          className="bg-white border-l border-gray-200 flex flex-col overflow-hidden cursor-default"
          style={{ cursor: 'default', zIndex: 100 }}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white cursor-default">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-black">Comments</h2>
              <span 
                className="text-white text-xs px-2 py-0.5 rounded-full font-medium min-w-[20px] h-5 flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                {filteredComments.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="p-4 border-b border-gray-200 bg-white cursor-default">
            <div className="flex gap-2 items-center justify-between">
              {(['all', 'unresolved', 'resolved'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    filter === status
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={{
                    backgroundColor: filter === status ? primaryColor : undefined,
                  }}
                >
                  {status === 'all' ? 'All' : status === 'resolved' ? 'Resolved' : 'Open'}
                </button>
              ))}
              
              <select
                id="comment-sort"
                name="comment-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'page' | 'author' | 'date')}
                className="ml-auto px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer appearance-none bg-gray-100 text-gray-600 hover:bg-gray-200 min-w-[100px] focus:outline-none"
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 8px center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '12px'
                }}
              >
                <option value="page">By Page</option>
                <option value="author">By Author</option>
                <option value="date">By Date</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white cursor-default">
            {Object.keys(groups).length === 0 ? (
              <div className="p-8 text-center text-gray-500 cursor-default">
                <MessageCircle className="w-12 h-12 mx-auto opacity-30 mb-3" style={{ strokeWidth: 1.5 }} />
                <p className="text-sm">No comments found</p>
              </div>
            ) : (
              Object.entries(groups).map(([groupName, groupComments]) => (
                <div key={groupName} className="border-b border-gray-100 last:border-b-0">
                  <div className="sticky top-0 bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800 text-sm">{groupName}</h3>
                    <span className="text-xs text-gray-500">
                      {groupComments.length} comment{groupComments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                    
                  <div className="space-y-0">
                    {groupComments.map(comment => (
                      <div
                        key={comment.id}
                        className="p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors"
                        onClick={() => handleNavigateToComment(comment)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 shrink-0`} 
                               style={{
                                 backgroundColor: comment.resolved ? '#23C16B' : primaryColor
                               }} />
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 line-clamp-2 mb-2 leading-relaxed">
                              {comment.text}
                            </p>
                            
                            <div className="flex items-center flex-wrap gap-3 text-xs text-gray-500">
                              <div className="flex items-center gap-1.5">
                                <div 
                                  className="w-4 h-4 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: `${primaryColor}1A` }}
                                >
                                  <span 
                                    className="text-[10px] font-semibold"
                                    style={{ color: primaryColor }}
                                  >
                                    {comment.author.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-medium">{comment.author}</span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{format(comment.timestamp, 'MMM d, h:mm a')}</span>
                              </div>

                              {comment.replies.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Reply className="w-3 h-3" />
                                  <span>{comment.replies.length}</span>
                                </div>
                              )}

                              {comment.resolved && (
                                <div className="flex items-center gap-1" style={{ color: '#23C16B' }}>
                                  <Check className="w-3 h-3" />
                                  <span className="font-medium">Resolved</span>
                                </div>
                              )}
                            </div>

                            {sortBy !== 'page' && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                                <MapPin className="w-3 h-3" />
                                <span>{getPageDisplayName(comment.pageUrl)}</span>
                              </div>
                            )}
                          </div>

                          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


