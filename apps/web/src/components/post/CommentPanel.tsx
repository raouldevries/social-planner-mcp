/**
 * Comment Panel Component
 *
 * Slide-in panel for viewing and adding comments on a post.
 */

import { useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { CommentInput } from './CommentInput';
import { CommentThread } from './CommentThread';
import {
  usePostComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useResolveComment,
} from '@/hooks/useComments';
import { useAuthStore } from '@/stores/authStore';

interface CommentPanelProps {
  postId: string;
  postAuthorId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentPanel({ postId, postAuthorId, isOpen, onClose }: CommentPanelProps) {
  const [showNewComment, setShowNewComment] = useState(false);
  const user = useAuthStore((state) => state.user);

  const { data: comments, isLoading, isError } = usePostComments(postId);
  const createComment = useCreateComment(postId);
  const updateComment = useUpdateComment(postId);
  const deleteComment = useDeleteComment(postId);
  const resolveComment = useResolveComment(postId);

  const isSubmitting =
    createComment.isPending ||
    updateComment.isPending ||
    deleteComment.isPending ||
    resolveComment.isPending;

  // Close panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCreateComment = useCallback(
    (content: string) => {
      createComment.mutate(
        { content },
        {
          onSuccess: () => {
            setShowNewComment(false);
          },
        }
      );
    },
    [createComment]
  );

  const handleReply = useCallback(
    (parentId: string, content: string) => {
      createComment.mutate({ content, parentId });
    },
    [createComment]
  );

  const handleEdit = useCallback(
    (commentId: string, content: string) => {
      updateComment.mutate({ commentId, content });
    },
    [updateComment]
  );

  const handleDelete = useCallback(
    (commentId: string) => {
      if (window.confirm('Are you sure you want to delete this comment?')) {
        deleteComment.mutate(commentId);
      }
    },
    [deleteComment]
  );

  const handleResolve = useCallback(
    (commentId: string) => {
      resolveComment.mutate(commentId);
    },
    [resolveComment]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" onClick={onClose} />

      {/* Panel */}
      <div
        className={clsx(
          'fixed top-0 right-0 h-full w-[400px] bg-white z-50',
          'shadow-xl border-l border-gray-200',
          'flex flex-col',
          'transform transition-transform duration-200 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-medium text-gray-900">Comments</h2>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => setShowNewComment(true)}>
              Add comment
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* New comment input */}
        {showNewComment && (
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <CommentInput
              onSubmit={handleCreateComment}
              onCancel={() => setShowNewComment(false)}
              isSubmitting={createComment.isPending}
              autoFocus
            />
          </div>
        )}

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Spinner size="lg" />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p>Failed to load comments</p>
            </div>
          ) : !comments || comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <CommentEmptyIcon />
              <p className="mt-3 text-sm">No comments yet</p>
              <p className="text-xs text-gray-400 mt-1">Start the conversation</p>
            </div>
          ) : (
            <div className="px-6 py-4 space-y-6">
              {comments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  postAuthorId={postAuthorId}
                  currentUserId={user?.id || ''}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onResolve={handleResolve}
                  isSubmitting={isSubmitting}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick add comment at bottom */}
        {!showNewComment && comments && comments.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => setShowNewComment(true)}
              className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-400 hover:border-gray-300 hover:bg-white transition-colors"
            >
              Add a comment...
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// Icons
function CloseIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CommentEmptyIcon() {
  return (
    <svg
      className="w-12 h-12 text-gray-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}
