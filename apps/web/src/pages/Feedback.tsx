/**
 * Social Planner - Feedback Dashboard Page
 *
 * Page for viewing and managing user feedback submissions.
 * All authenticated users can view feedback and edit their own.
 * Admins can additionally change status and delete feedback.
 */

import { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import {
  useFeedbacks,
  useUpdateFeedback,
  useUpdateFeedbackContent,
  useDeleteFeedback,
} from '@/hooks/useFeedback';
import type { FeedbackFilters } from '@/hooks/useFeedback';
import { useUser, useIsAdmin } from '@/stores/authStore';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Empty, ErrorState } from '@/components/ui/Empty';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { FeedbackDetailModal } from '@/components/feedback/FeedbackDetailModal';
import { FEEDBACK_STATUS } from '@social-planner/shared';
import type { FeedbackSummary, FeedbackStatus } from '@social-planner/shared';

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

export function Feedback() {
  const user = useUser();
  const isAdmin = useIsAdmin();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Modal state
  const [deleteFeedback, setDeleteFeedback] = useState<FeedbackSummary | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackSummary | null>(null);

  // Query options
  const queryOptions: FeedbackFilters = {
    page,
    perPage,
    status: statusFilter || undefined,
  };

  // Queries and mutations
  const { data, isLoading, isError, refetch } = useFeedbacks(queryOptions);
  const updateMutation = useUpdateFeedback();
  const updateContentMutation = useUpdateFeedbackContent();
  const deleteMutation = useDeleteFeedback();

  // Handlers
  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as FeedbackStatus | '');
    setPage(1);
  }, []);

  const handleStatusChange = useCallback(
    (id: string, status: FeedbackStatus) => {
      updateMutation.mutate({ id, status });
    },
    [updateMutation]
  );

  const handleDeleteClick = useCallback((feedback: FeedbackSummary) => {
    setDeleteFeedback(feedback);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteFeedback) {
      deleteMutation.mutate(deleteFeedback.id, {
        onSettled: () => setDeleteFeedback(null),
      });
    }
  }, [deleteFeedback, deleteMutation]);

  const handleClearFilters = useCallback(() => {
    setStatusFilter('');
    setPage(1);
  }, []);

  const handleOpenDetail = useCallback(
    (feedback: FeedbackSummary) => {
      setSelectedFeedback(feedback);
      // Auto-mark as REVIEWED when opening a NEW feedback item
      if (isAdmin && feedback.status === 'NEW') {
        updateMutation.mutate({ id: feedback.id, status: 'REVIEWED' as FeedbackStatus });
      }
    },
    [isAdmin, updateMutation]
  );

  const handleEditClick = useCallback((feedback: FeedbackSummary) => {
    setEditingId(feedback.id);
    setEditContent(feedback.content);
  }, []);

  const handleEditSave = useCallback(() => {
    if (editingId && editContent.trim()) {
      updateContentMutation.mutate(
        { id: editingId, content: editContent.trim() },
        {
          onSuccess: () => {
            setEditingId(null);
            setEditContent('');
          },
        }
      );
    }
  }, [editingId, editContent, updateContentMutation]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditContent('');
  }, []);

  // Pagination
  const totalPages = data?.pagination?.totalPages ?? 1;
  const hasFilters = !!statusFilter;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div
        className="mb-6 sm:mb-8"
        data-feedback-target="feedback-header"
        data-feedback-label="Feedback Header"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
              Feedback
            </h1>
            <p className="text-sm text-neutral-500 mt-1">View and manage feedback</p>
          </div>
          <span className="text-sm text-gray-500">
            {data?.pagination?.total ?? 0}{' '}
            {data?.pagination?.total === 1 ? 'submission' : 'submissions'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6"
        data-feedback-target="feedback-filters"
        data-feedback-label="Feedback Filters"
      >
        <Select value={statusFilter} onChange={handleStatusFilterChange} className="w-full sm:w-44">
          <option value="">All statuses</option>
          {Object.entries(FEEDBACK_STATUS).map(([key, value]) => (
            <option key={key} value={value}>
              {STATUS_LABELS[value as FeedbackStatus]}
            </option>
          ))}
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load feedback"
          message="An error occurred while loading feedback submissions."
          onRetry={() => refetch()}
        />
      ) : !data?.data?.length ? (
        <Empty
          title="No feedback found"
          {...(hasFilters && { description: 'Try adjusting your filters' })}
          action={
            hasFilters ? (
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Feedback List */}
          <div
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            data-feedback-target="feedback-list"
            data-feedback-label="Feedback List"
          >
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {data.data.map((feedback) => (
                <FeedbackCard
                  key={feedback.id}
                  feedback={feedback}
                  isAdmin={isAdmin}
                  currentUserId={user?.id ?? ''}
                  editingId={editingId}
                  editContent={editContent}
                  onEditClick={handleEditClick}
                  onEditContentChange={setEditContent}
                  onEditSave={handleEditSave}
                  onEditCancel={handleEditCancel}
                  isEditSaving={updateContentMutation.isPending}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteClick}
                  onScreenshot={setScreenshotUrl}
                  onOpenDetail={handleOpenDetail}
                  isUpdating={updateMutation.isPending}
                />
              ))}
            </div>

            {/* Desktop Table View */}
            <table className="min-w-full divide-y divide-gray-200 hidden md:table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feedback
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.data.map((feedback) => (
                  <FeedbackRow
                    key={feedback.id}
                    feedback={feedback}
                    isAdmin={isAdmin}
                    currentUserId={user?.id ?? ''}
                    editingId={editingId}
                    editContent={editContent}
                    onEditClick={handleEditClick}
                    onEditContentChange={setEditContent}
                    onEditSave={handleEditSave}
                    onEditCancel={handleEditCancel}
                    isEditSaving={updateContentMutation.isPending}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteClick}
                    onScreenshot={setScreenshotUrl}
                    onOpenDetail={handleOpenDetail}
                    isUpdating={updateMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              data-feedback-target="feedback-pagination"
              data-feedback-label="Feedback Pagination"
            >
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="min-h-[44px] flex-1 sm:flex-initial"
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="min-h-[44px] flex-1 sm:flex-initial"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Feedback Detail Modal */}
      <FeedbackDetailModal
        feedback={selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        onScreenshot={setScreenshotUrl}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteFeedback}
        onClose={() => setDeleteFeedback(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Feedback"
        message="Are you sure you want to delete this feedback? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Screenshot Preview Modal */}
      <Modal
        isOpen={!!screenshotUrl}
        onClose={() => setScreenshotUrl(null)}
        size="full"
        title="Screenshot"
      >
        {screenshotUrl && (
          <img
            src={screenshotUrl}
            alt="Feedback screenshot"
            className="w-full rounded-lg border border-gray-200"
          />
        )}
      </Modal>
    </div>
  );
}

// Desktop table row
interface FeedbackItemProps {
  feedback: FeedbackSummary;
  isAdmin: boolean;
  currentUserId: string;
  editingId: string | null;
  editContent: string;
  onEditClick: (feedback: FeedbackSummary) => void;
  onEditContentChange: (content: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  isEditSaving: boolean;
  onStatusChange: (id: string, status: FeedbackStatus) => void;
  onDelete: (feedback: FeedbackSummary) => void;
  onScreenshot: (url: string) => void;
  onOpenDetail: (feedback: FeedbackSummary) => void;
  isUpdating: boolean;
}

function FeedbackRow({
  feedback,
  isAdmin,
  currentUserId,
  editingId,
  editContent,
  onEditClick,
  onEditContentChange,
  onEditSave,
  onEditCancel,
  isEditSaving,
  onStatusChange,
  onDelete,
  onScreenshot,
  onOpenDetail,
  isUpdating,
}: FeedbackItemProps) {
  const pagePath = extractPath(feedback.pageUrl);
  const isEditing = editingId === feedback.id;
  const isOwn = feedback.userId === currentUserId;

  return (
    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => onOpenDetail(feedback)}>
      {/* User */}
      <td className="px-6 py-4 whitespace-nowrap align-top">
        <div className="text-sm font-medium text-gray-900">{feedback.userName}</div>
        <div className="text-xs text-gray-400 mt-0.5 max-w-[140px] truncate" title={pagePath}>
          {pagePath}
        </div>
      </td>

      {/* Feedback */}
      <td className="px-6 py-4 align-top max-w-md">
        {isEditing ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={editContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={onEditSave} disabled={isEditSaving || !editContent.trim()}>
                {isEditSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="secondary" size="sm" onClick={onEditCancel} disabled={isEditSaving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-900 line-clamp-2">{feedback.content}</div>
            <div className="flex items-center gap-2 mt-1.5">
              {feedback.elementLabel && (
                <span className="inline-flex items-center text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                  {feedback.elementLabel}
                </span>
              )}
              {feedback.replyCount > 0 && (
                <span className="inline-flex items-center text-xs text-primary-600 bg-primary-50 rounded px-1.5 py-0.5">
                  {feedback.replyCount} {feedback.replyCount === 1 ? 'reply' : 'replies'}
                </span>
              )}
              {feedback.screenshotUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onScreenshot(feedback.screenshotUrl!);
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
                >
                  View screenshot
                </button>
              )}
            </div>
          </>
        )}
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap align-top" onClick={(e) => e.stopPropagation()}>
        {isAdmin ? (
          <select
            value={feedback.status}
            onChange={(e) => onStatusChange(feedback.id, e.target.value as FeedbackStatus)}
            disabled={isUpdating}
            className={clsx(
              'appearance-none w-28 py-1 px-2 rounded-lg text-xs font-medium text-center cursor-pointer',
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
              'inline-block w-28 py-1 px-2 rounded-lg text-xs font-medium text-center',
              STATUS_STYLES[feedback.status]
            )}
          >
            {STATUS_LABELS[feedback.status]}
          </span>
        )}
      </td>

      {/* Submitted */}
      <td className="px-6 py-4 whitespace-nowrap align-top text-sm text-gray-500">
        {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
      </td>

      {/* Actions */}
      <td
        className="px-6 py-4 whitespace-nowrap align-top text-right text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-3">
          {isOwn && !isEditing && (
            <button
              onClick={() => onEditClick(feedback)}
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Edit
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => onDelete(feedback)}
              className="text-sm text-red-600 hover:text-red-700 hover:underline"
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// Mobile card view
function FeedbackCard({
  feedback,
  isAdmin,
  currentUserId,
  editingId,
  editContent,
  onEditClick,
  onEditContentChange,
  onEditSave,
  onEditCancel,
  isEditSaving,
  onStatusChange,
  onDelete,
  onScreenshot,
  onOpenDetail,
  isUpdating,
}: FeedbackItemProps) {
  const pagePath = extractPath(feedback.pageUrl);
  const isEditing = editingId === feedback.id;
  const isOwn = feedback.userId === currentUserId;

  return (
    <div className="p-4 space-y-3 cursor-pointer" onClick={() => onOpenDetail(feedback)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm">{feedback.userName}</span>
            <span className="text-xs text-gray-400 truncate" title={pagePath}>
              {pagePath}
            </span>
          </div>
          {isEditing ? (
            <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onEditSave}
                  disabled={isEditSaving || !editContent.trim()}
                >
                  {isEditSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onEditCancel}
                  disabled={isEditSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700 mt-1 line-clamp-3">{feedback.content}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {feedback.elementLabel && (
                  <span className="inline-flex items-center text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                    {feedback.elementLabel}
                  </span>
                )}
                {feedback.replyCount > 0 && (
                  <span className="inline-flex items-center text-xs text-primary-600 bg-primary-50 rounded px-1.5 py-0.5">
                    {feedback.replyCount} {feedback.replyCount === 1 ? 'reply' : 'replies'}
                  </span>
                )}
                {feedback.screenshotUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onScreenshot(feedback.screenshotUrl!);
                    }}
                    className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    Screenshot
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          {isAdmin ? (
            <select
              value={feedback.status}
              onChange={(e) => onStatusChange(feedback.id, e.target.value as FeedbackStatus)}
              disabled={isUpdating}
              className={clsx(
                'appearance-none shrink-0 py-1 px-2 rounded-lg text-xs font-medium text-center cursor-pointer',
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
                'shrink-0 py-1 px-2 rounded-lg text-xs font-medium text-center',
                STATUS_STYLES[feedback.status]
              )}
            >
              {STATUS_LABELS[feedback.status]}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
        </span>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {isOwn && !isEditing && (
            <button
              onClick={() => onEditClick(feedback)}
              className="text-primary-600 hover:text-primary-700 min-h-[44px] px-2"
            >
              Edit
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => onDelete(feedback)}
              className="text-red-600 hover:text-red-700 min-h-[44px] px-2"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Extract pathname from full URL, falling back to the raw value */
function extractPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
