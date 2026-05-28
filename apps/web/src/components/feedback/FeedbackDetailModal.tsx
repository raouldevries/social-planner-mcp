/**
 * Social Planner - Feedback Detail Modal
 *
 * Shows full feedback content, metadata, screenshot, and a reply thread.
 */

import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  useFeedbackReplies,
  useCreateFeedbackReply,
  useDeleteFeedbackReply,
  useUpdateFeedback,
} from '@/hooks/useFeedback';
import { useUser, useIsAdmin } from '@/stores/authStore';
import { FEEDBACK_STATUS } from '@social-planner/shared';
import type { FeedbackSummary, FeedbackStatus, FeedbackReply } from '@social-planner/shared';

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  NEW: 'New',
  REVIEWED: 'Reviewed',
  RESOLVED: 'Resolved',
};

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  NEW: 'border border-amber-300 text-amber-700 bg-amber-50',
  REVIEWED: 'border border-blue-300 text-blue-700 bg-blue-50',
  RESOLVED: 'border border-green-300 text-green-700 bg-green-50',
};

interface FeedbackDetailModalProps {
  feedback: FeedbackSummary | null;
  onClose: () => void;
  onScreenshot: (url: string) => void;
}

export function FeedbackDetailModal({ feedback, onClose, onScreenshot }: FeedbackDetailModalProps) {
  const user = useUser();
  const isAdmin = useIsAdmin();
  const [replyContent, setReplyContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: replies, isLoading: repliesLoading } = useFeedbackReplies(feedback?.id ?? null);
  const createReply = useCreateFeedbackReply();
  const deleteReply = useDeleteFeedbackReply();
  const updateFeedback = useUpdateFeedback();

  // Auto-scroll to bottom when new replies arrive
  const repliesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (replies?.length) {
      repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replies?.length]);

  const handleSubmitReply = () => {
    if (!feedback || !replyContent.trim()) return;

    createReply.mutate(
      { feedbackId: feedback.id, content: replyContent.trim() },
      {
        onSuccess: () => setReplyContent(''),
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmitReply();
    }
  };

  const handleStatusChange = (status: FeedbackStatus) => {
    if (!feedback) return;
    updateFeedback.mutate({ id: feedback.id, status });
  };

  const handleDeleteReply = (reply: FeedbackReply) => {
    deleteReply.mutate({ replyId: reply.id, feedbackId: reply.feedbackId });
  };

  if (!feedback) return null;

  const pagePath = extractPath(feedback.pageUrl);

  return (
    <Modal isOpen={!!feedback} onClose={onClose} size="lg" title="Feedback Detail">
      <div className="space-y-5">
        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-neutral-900">{feedback.userName}</span>
          <span className="text-neutral-400">&middot;</span>
          <span className="text-neutral-500" title={feedback.pageUrl}>
            {pagePath}
          </span>
          {feedback.elementLabel && (
            <>
              <span className="text-neutral-400">&middot;</span>
              <span className="inline-flex items-center text-xs text-neutral-500 bg-neutral-100 rounded px-1.5 py-0.5">
                {feedback.elementLabel}
              </span>
            </>
          )}
          <span className="text-neutral-400">&middot;</span>
          <span className="text-neutral-500">
            {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <select
              value={feedback.status}
              onChange={(e) => handleStatusChange(e.target.value as FeedbackStatus)}
              disabled={updateFeedback.isPending}
              className={clsx(
                'appearance-none py-1 px-2 rounded-lg text-xs font-medium text-center cursor-pointer',
                'focus:outline-none focus:ring-1',
                STATUS_STYLES[feedback.status]
              )}
            >
              {Object.entries(FEEDBACK_STATUS).map(([key, value]) => (
                <option key={key} value={value}>
                  {STATUS_LABELS[value as FeedbackStatus]}
                </option>
              ))}
            </select>
          ) : (
            <span
              className={clsx(
                'inline-block py-1 px-2 rounded-lg text-xs font-medium',
                STATUS_STYLES[feedback.status]
              )}
            >
              {STATUS_LABELS[feedback.status]}
            </span>
          )}
        </div>

        {/* Full content */}
        <div className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          {feedback.content}
        </div>

        {/* Screenshot */}
        {feedback.screenshotUrl && (
          <button
            onClick={() => onScreenshot(feedback.screenshotUrl!)}
            className="block w-full max-h-48 overflow-hidden rounded-lg border border-neutral-200 hover:border-primary-300 transition-colors cursor-pointer"
          >
            <img
              src={feedback.screenshotUrl}
              alt="Feedback screenshot"
              className="w-full object-cover object-top"
            />
          </button>
        )}

        {/* Reply Thread */}
        <div className="border-t border-neutral-200 pt-4">
          <h3 className="text-sm font-medium text-neutral-700 mb-3">
            Replies{replies?.length ? ` (${replies.length})` : ''}
          </h3>

          {repliesLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : replies?.length ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {replies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  currentUserId={user?.id ?? ''}
                  isAdmin={isAdmin}
                  onDelete={handleDeleteReply}
                  isDeleting={deleteReply.isPending}
                />
              ))}
              <div ref={repliesEndRef} />
            </div>
          ) : (
            <p className="text-sm text-neutral-400 py-2">No replies yet</p>
          )}

          {/* Reply Input */}
          <div className="mt-4">
            <textarea
              ref={textareaRef}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a reply..."
              rows={2}
              className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y placeholder:text-neutral-400"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-neutral-400">
                {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to send
              </span>
              <Button
                size="sm"
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || createReply.isPending}
              >
                {createReply.isPending ? 'Sending...' : 'Reply'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ReplyItem({
  reply,
  currentUserId,
  isAdmin,
  onDelete,
  isDeleting,
}: {
  reply: FeedbackReply;
  currentUserId: string;
  isAdmin: boolean;
  onDelete: (reply: FeedbackReply) => void;
  isDeleting: boolean;
}) {
  const canDelete = reply.authorId === currentUserId || isAdmin;

  return (
    <div className="flex gap-3 text-sm group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-neutral-900">{reply.authorName}</span>
          <span className="text-xs text-neutral-400">
            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
          </span>
          {canDelete && (
            <button
              onClick={() => onDelete(reply)}
              disabled={isDeleting}
              className="text-xs text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Delete
            </button>
          )}
        </div>
        <p className="text-neutral-700 mt-0.5 whitespace-pre-wrap">{reply.content}</p>
      </div>
    </div>
  );
}

function extractPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
