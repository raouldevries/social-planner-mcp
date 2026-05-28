/**
 * Ambassador Queue Page
 *
 * Shows posts available for ambassador sharing with ability to record shares.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  useAmbassadorStatus,
  useAmbassadorQueue,
  useAmbassadorStats,
  useRecordShare,
  usePendingInvitations,
  useRespondToInvitation,
  type AmbassadorQueuePost,
} from '@/hooks/useAmbassador';
import { SOCIAL_PLATFORM, type SocialPlatform } from '@social-planner/shared';
import { useCanEdit } from '@/stores/authStore';

export function AmbassadorQueue() {
  const { data: status, isLoading: isLoadingStatus } = useAmbassadorStatus();
  const { data: queue, isLoading: isLoadingQueue } = useAmbassadorQueue();
  const { data: stats } = useAmbassadorStats();
  const { data: invitations } = usePendingInvitations();
  const respondToInvitation = useRespondToInvitation();
  const canEdit = useCanEdit();
  const navigate = useNavigate();

  if (isLoadingStatus) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show pending invitations if any
  if (invitations && invitations.length > 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div
          className="mb-6 sm:mb-8"
          data-feedback-target="ambassador-invitations-header"
          data-feedback-label="Ambassador Invitations Header"
        >
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
            Ambassador Program
          </h1>
          <p className="text-sm text-neutral-500 mt-1">You have pending invitations</p>
        </div>

        <div
          className="space-y-4"
          data-feedback-target="ambassador-invitations"
          data-feedback-label="Pending Invitations"
        >
          {invitations.map((inv) => (
            <Card key={inv.membership.id} padding="lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-medium text-gray-900">{inv.group.name}</h3>
                  {inv.group.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{inv.group.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {inv.group.memberCount} member{inv.group.memberCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="min-h-[44px] flex-1 sm:flex-initial"
                    onClick={() =>
                      respondToInvitation.mutate({
                        membershipId: inv.membership.id,
                        accept: false,
                      })
                    }
                    disabled={respondToInvitation.isPending}
                  >
                    Decline
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="min-h-[44px] flex-1 sm:flex-initial"
                    onClick={() =>
                      respondToInvitation.mutate({
                        membershipId: inv.membership.id,
                        accept: true,
                      })
                    }
                    isLoading={respondToInvitation.isPending}
                  >
                    Accept
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Not an ambassador
  if (!status?.isActive) {
    return (
      <div className="max-w-4xl mx-auto">
        <div
          className="mb-6 sm:mb-8"
          data-feedback-target="ambassador-inactive-header"
          data-feedback-label="Ambassador Program Header"
        >
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
            Ambassador Program
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Share company content with your network</p>
        </div>

        <Card
          padding="lg"
          data-feedback-target="ambassador-inactive-content"
          data-feedback-label="Ambassador Not Active"
        >
          <div className="text-center py-8">
            <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-gray-900">Not yet an ambassador</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {canEdit
                ? 'Set up ambassador groups in settings to start sharing company content.'
                : 'Contact your administrator to join an ambassador group and start sharing company content.'}
            </p>
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => navigate('/settings?tab=ambassadors')}
              >
                Manage Ambassadors
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div
        className="mb-6 sm:mb-8"
        data-feedback-target="ambassador-header"
        data-feedback-label="Ambassador Queue Header"
      >
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
          Ambassador Queue
        </h1>
        <p className="text-sm text-neutral-500 mt-1">Content available for you to share</p>
      </div>

      {/* Stats */}
      {stats && (
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8"
          data-feedback-target="ambassador-stats"
          data-feedback-label="Sharing Statistics"
        >
          <Card padding="md">
            <p className="text-2xl font-bold text-gray-900">{stats.totalShares}</p>
            <p className="text-sm text-gray-500">Total Shares</p>
          </Card>
          <Card padding="md">
            <p className="text-2xl font-bold text-gray-900">{stats.thisMonthShares}</p>
            <p className="text-sm text-gray-500">This Month</p>
          </Card>
          <Card padding="md">
            <p className="text-2xl font-bold text-gray-900">{stats.postsShared}</p>
            <p className="text-sm text-gray-500">Posts Shared</p>
          </Card>
        </div>
      )}

      {/* Queue */}
      <div data-feedback-target="ambassador-queue" data-feedback-label="Ambassador Queue">
        {isLoadingQueue ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : queue && queue.length > 0 ? (
          <div className="space-y-4">
            {queue.map((post) => (
              <QueuePostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <Card padding="lg">
            <div className="text-center py-8">
              <CheckCircleIcon className="w-12 h-12 text-green-300 mx-auto mb-4" />
              <h3 className="text-sm font-medium text-gray-900">All caught up!</h3>
              <p className="text-sm text-gray-500 mt-1">
                No new content available for sharing right now.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================================
// QUEUE POST CARD
// ============================================

interface QueuePostCardProps {
  post: AmbassadorQueuePost;
}

function QueuePostCard({ post }: QueuePostCardProps) {
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <>
      <Card padding="lg">
        <div className="flex gap-4">
          {/* Media Preview */}
          {post.media[0] && (
            <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
              <img src={post.media[0].url} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Avatar name={post.author.fullName} src={post.author.avatarUrl} size="sm" />
                <span className="text-sm text-gray-600">{post.author.fullName}</span>
              </div>
              <div className="flex items-center gap-2">
                {post.channels.map((ch, i) => (
                  <PlatformBadge key={i} platform={ch.platform} />
                ))}
                {post.hasShared && (
                  <Badge variant="success" size="sm">
                    Shared
                  </Badge>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-900 line-clamp-2 mb-3">
              {post.baseContent || 'No content'}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {post.publishedAt
                  ? `Published ${formatDate(post.publishedAt)}`
                  : post.scheduledAt
                    ? `Scheduled for ${formatDate(post.scheduledAt)}`
                    : `Created ${formatDate(post.createdAt)}`}
              </span>

              {!post.hasShared && (
                <Button variant="primary" size="sm" onClick={() => setShowShareModal(true)}>
                  Share
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <ShareModal post={post} isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
    </>
  );
}

// ============================================
// SHARE MODAL
// ============================================

interface ShareModalProps {
  post: AmbassadorQueuePost;
  isOpen: boolean;
  onClose: () => void;
}

function ShareModal({ post, isOpen, onClose }: ShareModalProps) {
  const recordShare = useRecordShare();
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>(
    SOCIAL_PLATFORM.LINKEDIN
  );
  const [shareUrl, setShareUrl] = useState('');

  const handleShare = useCallback(async () => {
    const trimmedUrl = shareUrl.trim();
    await recordShare.mutateAsync({
      postId: post.id,
      platform: selectedPlatform,
      ...(trimmedUrl ? { shareUrl: trimmedUrl } : {}),
    });
    // Reset form and close
    setSelectedPlatform(SOCIAL_PLATFORM.LINKEDIN);
    setShareUrl('');
    onClose();
  }, [recordShare, post.id, selectedPlatform, shareUrl, onClose]);

  const handleClose = useCallback(() => {
    setSelectedPlatform(SOCIAL_PLATFORM.LINKEDIN);
    setShareUrl('');
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Record Share" size="sm">
      <div className="space-y-4">
        <div>
          <Label>Platform</Label>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setSelectedPlatform(SOCIAL_PLATFORM.LINKEDIN)}
              className={clsx(
                'flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors min-h-[44px]',
                selectedPlatform === SOCIAL_PLATFORM.LINKEDIN
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              LinkedIn
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatform(SOCIAL_PLATFORM.INSTAGRAM)}
              className={clsx(
                'flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors min-h-[44px]',
                selectedPlatform === SOCIAL_PLATFORM.INSTAGRAM
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              Instagram
            </button>
          </div>
        </div>

        <div>
          <Label htmlFor="share-url">Share URL (optional)</Label>
          <Input
            id="share-url"
            type="url"
            value={shareUrl}
            onChange={(e) => setShareUrl(e.target.value)}
            placeholder="https://linkedin.com/posts/..."
          />
          <p className="text-xs text-gray-500 mt-1">Paste the URL of your post after sharing</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-2">Content to share:</p>
          <p className="text-sm text-gray-700 line-clamp-3">{post.baseContent}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleShare} isLoading={recordShare.isPending}>
          Record Share
        </Button>
      </div>
    </Modal>
  );
}

// ============================================
// HELPERS
// ============================================

function PlatformBadge({ platform }: { platform: SocialPlatform }) {
  if (platform === SOCIAL_PLATFORM.LINKEDIN) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
        LinkedIn
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">
      Instagram
    </span>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ============================================
// ICONS
// ============================================

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
