/**
 * Comment Thread Component
 *
 * Displays a single comment with its replies, actions, and nested threading.
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { Avatar } from '@/components/ui/Avatar';
import { CommentInput } from './CommentInput';
import type { CommentThread as CommentThreadType, CommentSummary } from '@/hooks/useComments';

interface CommentThreadProps {
  comment: CommentThreadType | CommentSummary;
  postAuthorId: string;
  currentUserId: string;
  onReply: (parentId: string, content: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onResolve: (commentId: string) => void;
  isSubmitting?: boolean;
  depth?: number;
}

export function CommentThread({
  comment,
  postAuthorId,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  isSubmitting = false,
  depth = 0,
}: CommentThreadProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const isAuthor = comment.author.id === currentUserId;
  const isPostAuthor = currentUserId === postAuthorId;
  const isExternalComment = comment.author.isExternal;

  // Check if within 24h edit window
  const canEdit = useMemo(() => {
    if (!isAuthor) return false;
    const createdAt = new Date(comment.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  }, [isAuthor, comment.createdAt]);

  // Can delete: author within 24h, or post author anytime
  const canDelete = useMemo(() => {
    if (isPostAuthor) return true;
    if (!isAuthor) return false;
    const createdAt = new Date(comment.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  }, [isAuthor, isPostAuthor, comment.createdAt]);

  // Format relative time
  const timeAgo = useMemo(() => {
    const date = new Date(comment.createdAt);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [comment.createdAt]);

  // Render content with highlighted mentions
  const renderContent = (content: string) => {
    // Replace @[Name](id) with highlighted span
    const mentionRegex = /@\[([^\]]+)\]\([a-f0-9-]+\)/g;
    const parts = content.split(mentionRegex);

    return parts.map((part, index) => {
      // Every odd index is a mention name
      if (index % 2 === 1) {
        return (
          <span key={index} className="text-primary-600 font-medium">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  const authorName = comment.author.fullName;
  const authorAvatar = comment.author.avatarUrl;

  const handleReply = (content: string) => {
    onReply(comment.id, content);
    setIsReplying(false);
  };

  const handleEdit = (content: string) => {
    onEdit(comment.id, content);
    setIsEditing(false);
  };

  return (
    <div className={clsx('group', depth > 0 && 'ml-8 mt-3')}>
      <div
        className={clsx('relative', comment.isResolved && 'opacity-60')}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex gap-3">
          <Avatar name={authorName} src={authorAvatar} size="sm" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">{authorName}</span>
              {isExternalComment && (
                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                  External
                </span>
              )}
              <span className="text-xs text-gray-400">{timeAgo}</span>
              {comment.isResolved && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckIcon />
                  Resolved
                </span>
              )}
            </div>

            {isEditing ? (
              <CommentInput
                initialValue={comment.content}
                onSubmit={handleEdit}
                onCancel={() => setIsEditing(false)}
                isSubmitting={isSubmitting}
                autoFocus
              />
            ) : (
              <p
                className={clsx(
                  'text-sm text-gray-700 whitespace-pre-wrap',
                  comment.isResolved && 'line-through'
                )}
              >
                {renderContent(comment.content)}
              </p>
            )}

            {/* Actions */}
            {!isEditing && (
              <div
                className={clsx(
                  'flex items-center gap-3 mt-2 transition-opacity',
                  showActions ? 'opacity-100' : 'opacity-0'
                )}
              >
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Reply
                </button>

                {canEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Edit
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Delete
                  </button>
                )}

                {isPostAuthor && (
                  <button
                    onClick={() => onResolve(comment.id)}
                    className="text-xs text-gray-500 hover:text-green-600 transition-colors"
                  >
                    {comment.isResolved ? 'Unresolve' : 'Resolve'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reply input */}
      {isReplying && (
        <div className="ml-11 mt-3">
          <CommentInput
            onSubmit={handleReply}
            onCancel={() => setIsReplying(false)}
            isSubmitting={isSubmitting}
            replyingTo={authorName}
            autoFocus
          />
        </div>
      )}

      {/* Nested replies */}
      {'replies' in comment && comment.replies && comment.replies.length > 0 && (
        <div className="border-l-2 border-gray-100">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              postAuthorId={postAuthorId}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onResolve={onResolve}
              isSubmitting={isSubmitting}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Icons
function CheckIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
