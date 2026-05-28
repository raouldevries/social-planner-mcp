/**
 * Post Editor Page
 *
 * Full-featured post editor with rich text editing, channel selection,
 * media attachments, and scheduling.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  POST_STATUS,
  PLATFORM_LIMITS,
  SOCIAL_PLATFORM,
  type PostMediaItem,
} from '@social-planner/shared';
import {
  usePost,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  useApprovePost,
  useRejectPost,
  useSchedulePost,
  usePublishPostNow,
  useUnschedulePost,
  useSocialAccounts,
  useAddCollaborator,
  useRemoveCollaborator,
  postKeys,
} from '@/hooks/usePost';
import { useTeamMembers } from '@/hooks/useUsers';
import {
  useCreatePostShareLink,
  usePostShareLinks,
  useDeleteShareLink,
  useSendReviewRequest,
} from '@/hooks/useShareLink';
import { useAuthStore } from '@/stores/authStore';
import {
  RichTextEditor,
  ChannelSelector,
  ChannelOverrides,
  SchedulingSection,
  PostPreview,
  CommentPanel,
  VersionHistoryModal,
  PostAnalyticsPanel,
  type ScheduleMode,
} from '@/components/post';
import { useAutosave } from '@/hooks/useAutosave';
import { useCommentCounts } from '@/hooks/useComments';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { SuccessLoadingButton, type ProgressReporter } from '@/components/ui/SuccessLoadingButton';
import { StatusIndicator } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/Dropdown';
import { Avatar } from '@/components/ui/Avatar';
import { MediaPicker } from '@/components/media/MediaPicker';
import { toast } from '@/components/ui/Toast';

/**
 * Collapsible section wrapper for mobile sidebar
 * On mobile: renders as collapsible details/summary
 * On desktop: renders children directly without collapse
 */
function MobileCollapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <>
      {/* Mobile: collapsible */}
      <details className="lg:hidden group" open={defaultOpen}>
        <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-white rounded-lg border border-neutral-200 mb-2 hover:bg-neutral-50 transition-colors">
          <span className="text-sm font-medium text-neutral-900">{title}</span>
          <svg
            className="w-5 h-5 text-neutral-500 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="mt-2">{children}</div>
      </details>
      {/* Desktop: render directly */}
      <div className="hidden lg:block">{children}</div>
    </>
  );
}

export function PostEditor() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const isNew = !id || id === 'new';
  const isAdmin = user?.role === 'ADMIN';

  // Determine return path based on navigation source (default to calendar)
  const returnPath =
    (location.state as { from?: 'calendar' | 'posts' } | null)?.from === 'posts'
      ? '/posts'
      : '/calendar';

  // Fetch post data if editing
  const {
    data: post,
    isLoading: isLoadingPost,
    isError: isPostError,
  } = usePost(isNew ? undefined : id);
  const { data: accounts = [], isLoading: isLoadingAccounts } = useSocialAccounts();

  // Mutations
  const createPost = useCreatePost();
  const createPostSilent = useCreatePost({ silent: true });
  const updatePost = useUpdatePost(id || '');
  const updatePostSilent = useUpdatePost(id || '', { silent: true });
  const deletePost = useDeletePost({ redirectTo: returnPath });
  const approvePost = useApprovePost(id || '');
  const rejectPost = useRejectPost(id || '');
  const schedulePost = useSchedulePost(id || '', { silent: true });
  const scheduleForPublish = useSchedulePost(id || '', { silent: true, skipCacheUpdate: true });
  const publishPostNow = usePublishPostNow(id || '');
  const unschedulePost = useUnschedulePost(id || '');

  // Publishing state - shown while worker publishes in background
  const [isPublishing, setIsPublishing] = useState(false);

  // Poll for status updates while publishing
  useEffect(() => {
    if (!isPublishing || !id) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'detail', id] });
    }, 5000);

    return () => clearInterval(interval);
  }, [isPublishing, id, queryClient]);

  // Clear publishing state when post becomes PUBLISHED
  useEffect(() => {
    if (isPublishing && post?.status === 'PUBLISHED') {
      setIsPublishing(false);
      toast.success('Post published!');
    }
  }, [isPublishing, post?.status]);

  // Form state
  const [content, setContent] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('scheduled');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [media, setMedia] = useState<PostMediaItem[]>([]);
  const [channelOverrides, setChannelOverrides] = useState<Record<string, string>>({});
  const [isAmbassadorAvailable, setIsAmbassadorAvailable] = useState(false);

  // Stable callbacks for SchedulingSection to prevent re-render loops
  const handleScheduleModeChange = useCallback((mode: ScheduleMode) => {
    setScheduleMode(mode);
  }, []);

  const handleScheduledAtChange = useCallback((value: string | null) => {
    setScheduledAt(value);
  }, []);

  // UI state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
  const [showExternalReviewModal, setShowExternalReviewModal] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<string | null>(null);
  const [externalReviewEmail, setExternalReviewEmail] = useState('');
  const [externalReviewMessage, setExternalReviewMessage] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'report'>('details');
  const [isSavingNewPost, setIsSavingNewPost] = useState(false);

  // Ref for debounced new post creation
  const newPostDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCreatingNewPostRef = useRef(false);

  // Ref to track if we've done the initial sync from post data
  // This prevents the useEffect from overwriting local state during autosave
  const hasInitialScheduleModeSyncRef = useRef(false);
  const hasInitialMediaSyncRef = useRef(false);
  const hasInitialChannelOverridesSyncRef = useRef(false);
  const lastPostIdRef = useRef<string | undefined>(id);

  // Reset the sync ref when navigating to a different post
  useEffect(() => {
    if (id !== lastPostIdRef.current) {
      hasInitialScheduleModeSyncRef.current = false;
      hasInitialMediaSyncRef.current = false;
      hasInitialChannelOverridesSyncRef.current = false;
      lastPostIdRef.current = id;
    }
  }, [id]);

  // Comment counts
  const { data: commentCounts } = useCommentCounts(isNew ? undefined : id);

  // Collaboration hooks
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: shareLinks = [] } = usePostShareLinks(id || '');
  const createShareLink = useCreatePostShareLink();
  const deleteShareLink = useDeleteShareLink();
  const sendReviewRequest = useSendReviewRequest();
  const addCollaborator = useAddCollaborator(id || '');
  const removeCollaborator = useRemoveCollaborator(id || '');

  // Derived state - editable for draft, rejected, and approved (after unscheduling)
  // Moved up here so it can be used by useAutosave
  const isEditable =
    isNew ||
    post?.status === POST_STATUS.DRAFT ||
    post?.status === POST_STATUS.REJECTED ||
    post?.status === POST_STATUS.APPROVED;

  // Auto-save hook (only for existing posts, not new ones)
  const {
    status: autosaveStatus,
    error: autosaveError,
    save: autosave,
    saveImmediate: autosaveImmediate,
    retry: autosaveRetry,
  } = useAutosave({
    postId: isNew ? null : id || null,
    enabled: isEditable && !isNew,
    onConflict: (serverContent, serverUpdatedAt) => {
      // For now, just log the conflict - could show a modal in the future
      console.warn('Autosave conflict detected', { serverContent, serverUpdatedAt });
    },
    onSaved: useCallback(
      (savedContent: string) => {
        if (!id) return;
        // Update TanStack Query cache so navigating away/back shows saved content
        queryClient.setQueryData(postKeys.detail(id), (old: unknown) => {
          if (!old) return old;
          return { ...(old as Record<string, unknown>), baseContent: savedContent };
        });
      },
      [id, queryClient]
    ),
  });

  // Check if link sharing is enabled (has active share links)
  const hasActiveShareLink = shareLinks.length > 0;

  // Handle link sharing toggle
  const handleToggleLinkSharing = useCallback(async () => {
    if (!id) return;

    if (hasActiveShareLink) {
      // Delete all share links
      for (const link of shareLinks) {
        await deleteShareLink.mutateAsync(link.id);
      }
    } else {
      // Create a new share link with default settings
      await createShareLink.mutateAsync({
        postId: id,
        expiresInHours: 168, // 7 days
        permissions: 'VIEW_COMMENT',
      });
    }
  }, [id, hasActiveShareLink, shareLinks, createShareLink, deleteShareLink]);

  // Handle adding team member as collaborator
  const handleAddTeamMember = useCallback(() => {
    if (selectedTeamMember) {
      addCollaborator.mutate(selectedTeamMember, {
        onSuccess: () => {
          setShowTeamMemberModal(false);
          setSelectedTeamMember(null);
        },
      });
    }
  }, [selectedTeamMember, addCollaborator]);

  // Handle creating share link and copying to clipboard
  const handleCopyReviewLink = useCallback(async () => {
    if (!id) return;

    // Create a share link for the external reviewer
    const link = await createShareLink.mutateAsync({
      postId: id,
      expiresInHours: 720, // 30 days
      permissions: 'VIEW_COMMENT',
    });

    // Copy link to clipboard
    navigator.clipboard.writeText(link.url);
    setShowExternalReviewModal(false);
    setExternalReviewEmail('');
    setExternalReviewMessage('');
  }, [id, createShareLink]);

  // Handle sending external review request via email
  const handleSendReviewEmail = useCallback(async () => {
    if (!id || !externalReviewEmail) return;

    await sendReviewRequest.mutateAsync({
      postId: id,
      recipientEmail: externalReviewEmail,
      ...(externalReviewMessage && { message: externalReviewMessage }),
    });

    setShowExternalReviewModal(false);
    setExternalReviewEmail('');
    setExternalReviewMessage('');
  }, [id, externalReviewEmail, externalReviewMessage, sendReviewRequest]);

  // Team members are already fetched excluding current user via the API

  // Initialize form from post data or URL params
  useEffect(() => {
    if (post) {
      setContent(post.baseContent || '');
      setSelectedAccountIds(post.channels.map((c) => c.socialAccountId));
      // Only sync media on initial load to prevent overwriting local additions during autosave
      if (!hasInitialMediaSyncRef.current) {
        hasInitialMediaSyncRef.current = true;
        setMedia(post.media || []);
      }
      // Only sync channel overrides on initial load
      if (!hasInitialChannelOverridesSyncRef.current) {
        hasInitialChannelOverridesSyncRef.current = true;
        const overrides: Record<string, string> = {};
        for (const ch of post.channels) {
          if (ch.customContent) overrides[ch.socialAccountId] = ch.customContent;
        }
        setChannelOverrides(overrides);
      }
      setIsAmbassadorAvailable(post.isAmbassadorAvailable || false);
      // Only sync scheduleMode on initial load to prevent overwriting during mutations
      // (e.g., when Publish Now triggers updatePostSilent then schedulePost)
      if (!hasInitialScheduleModeSyncRef.current && post.scheduledAt) {
        hasInitialScheduleModeSyncRef.current = true;
        setScheduleMode('scheduled');
        setScheduledAt(post.scheduledAt);
      } else if (!hasInitialScheduleModeSyncRef.current) {
        hasInitialScheduleModeSyncRef.current = true;
      }
    } else if (isNew) {
      // Check for scheduledAt in URL (from calendar click)
      const scheduledAtParam = searchParams.get('scheduledAt');
      if (scheduledAtParam) {
        setScheduleMode('scheduled');
        setScheduledAt(new Date(scheduledAtParam).toISOString());
      }
    }
  }, [post, isNew, searchParams]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (newPostDebounceRef.current) {
        clearTimeout(newPostDebounceRef.current);
      }
    };
  }, []);

  // Channel override handler
  const handleChannelOverrideChange = useCallback(
    (accountId: string, customContent: string | null) => {
      setChannelOverrides((prev) => {
        if (customContent === null) {
          const next = { ...prev };
          delete next[accountId];
          return next;
        }
        return { ...prev, [accountId]: customContent };
      });
    },
    []
  );

  // Prune overrides when channels are deselected
  useEffect(() => {
    setChannelOverrides((prev) => {
      const selectedSet = new Set(selectedAccountIds);
      const pruned: Record<string, string> = {};
      for (const [id, val] of Object.entries(prev)) {
        if (selectedSet.has(id)) pruned[id] = val;
      }
      if (Object.keys(pruned).length !== Object.keys(prev).length) return pruned;
      return prev;
    });
  }, [selectedAccountIds]);

  // Build channel data with customContent for save mutations
  const buildChannelData = useCallback(() => {
    return selectedAccountIds.map((accountId) => ({
      socialAccountId: accountId,
      ...(channelOverrides[accountId] !== undefined && {
        customContent: channelOverrides[accountId],
      }),
    }));
  }, [selectedAccountIds, channelOverrides]);

  // Derived state for permissions
  const canSubmit = isEditable && content.trim().length > 0 && selectedAccountIds.length > 0;
  const canApprove = isAdmin && post?.status === POST_STATUS.PENDING_APPROVAL;
  const canReject = isAdmin && post?.status === POST_STATUS.PENDING_APPROVAL;
  // Allow scheduling for any post that's not already scheduled or published
  const canSchedule =
    !isNew && post?.status !== POST_STATUS.SCHEDULED && post?.status !== POST_STATUS.PUBLISHED;
  const canUnschedule = post?.status === POST_STATUS.SCHEDULED && scheduleMode !== 'now';

  // Get character limit based on selected platforms
  const getCharacterLimit = useCallback(() => {
    const platforms = selectedAccountIds
      .map((accountId) => accounts.find((a) => a.id === accountId)?.platform)
      .filter(Boolean);

    if (platforms.includes(SOCIAL_PLATFORM.INSTAGRAM)) {
      return PLATFORM_LIMITS.INSTAGRAM.textMaxLength;
    }
    if (platforms.includes(SOCIAL_PLATFORM.LINKEDIN)) {
      return PLATFORM_LIMITS.LINKEDIN.textMaxLength;
    }
    return undefined;
  }, [selectedAccountIds, accounts]);

  // Handlers

  // Content change handler with autosave
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);

      if (isNew) {
        // For new posts, debounce auto-creation
        if (newPostDebounceRef.current) {
          clearTimeout(newPostDebounceRef.current);
        }

        // Only auto-create if there's actual content and we're not already creating
        if (newContent.trim() && !isCreatingNewPostRef.current) {
          setIsSavingNewPost(true); // Show saving indicator immediately
          newPostDebounceRef.current = setTimeout(async () => {
            isCreatingNewPostRef.current = true;
            try {
              const mediaIds = media.map((m) => m.mediaAssetId);

              const newPost = await createPostSilent.mutateAsync({
                baseContent: newContent,
                channels: buildChannelData(),
                mediaIds,
                isAmbassadorAvailable,
                scheduledAt: scheduleMode === 'scheduled' ? scheduledAt : null,
              });

              // Navigate to the new post URL so normal autosave takes over
              // Use replace to avoid adding to history
              navigate(`/posts/${newPost.id}`, { replace: true });
            } catch {
              // If creation fails, allow retry on next content change
              isCreatingNewPostRef.current = false;
              setIsSavingNewPost(false);
            }
          }, 800); // Same debounce as autosave
        } else if (!newContent.trim()) {
          setIsSavingNewPost(false);
        }
      } else {
        // Trigger autosave for existing posts
        autosave(newContent);
      }
    },
    [
      isNew,
      autosave,
      buildChannelData,
      media,
      isAmbassadorAvailable,
      scheduleMode,
      scheduledAt,
      createPostSilent,
      navigate,
    ]
  );

  // Handle blur on editor - save immediately
  const handleEditorBlur = useCallback(() => {
    if (!isNew && content) {
      autosaveImmediate(content);
    }
  }, [isNew, content, autosaveImmediate]);

  const handleSave = useCallback(async () => {
    const channelData = buildChannelData();
    const mediaIds = media.map((m) => m.mediaAssetId);

    if (isNew) {
      createPost.mutate({
        baseContent: content,
        channels: channelData,
        mediaIds,
        isAmbassadorAvailable,
        scheduledAt: scheduleMode === 'scheduled' ? scheduledAt : null,
      });
    } else {
      updatePost.mutate({
        baseContent: content,
        channels: channelData,
        mediaIds,
        isAmbassadorAvailable,
        scheduledAt: scheduleMode === 'scheduled' ? scheduledAt : null,
      });
    }
  }, [
    isNew,
    content,
    buildChannelData,
    media,
    isAmbassadorAvailable,
    scheduleMode,
    scheduledAt,
    createPost,
    updatePost,
  ]);

  const handleApprove = useCallback(() => {
    approvePost.mutate();
  }, [approvePost]);

  const handleReject = useCallback(() => {
    if (rejectReason.trim()) {
      rejectPost.mutate({ reason: rejectReason });
      setShowRejectModal(false);
      setRejectReason('');
    }
  }, [rejectPost, rejectReason]);

  const handleSchedule = useCallback(
    async (reportProgress: ProgressReporter) => {
      // Validate required fields
      if (!scheduledAt && scheduleMode === 'scheduled') {
        throw new Error('Scheduled time is required');
      }

      if (selectedAccountIds.length === 0) {
        throw new Error('At least one channel is required');
      }

      reportProgress('Saving...', 30);

      // First save the post with current channels, then schedule
      const mediaIds = media.map((m) => m.mediaAssetId);

      // Use mutateAsync to properly chain promises and propagate errors
      await updatePostSilent.mutateAsync({
        baseContent: content,
        channels: buildChannelData(),
        mediaIds,
        isAmbassadorAvailable,
      });

      if (scheduleMode === 'now') {
        reportProgress('Publishing...', 60);

        // Schedule with a near-future time to move post to SCHEDULED status
        // Use scheduleForPublish to skip cache update so the button stays visible
        const targetTime = new Date(Date.now() + 5000).toISOString();
        await scheduleForPublish.mutateAsync({ scheduledAt: targetTime });

        reportProgress('Publishing...', 80);

        // Immediately queue all channels for publishing
        await publishPostNow.mutateAsync();

        // Mark as publishing - UI will show "Publishing..." instead of "Scheduled"
        setIsPublishing(true);

        // Show a toast explaining background publishing
        const hasVideo = media.some((m) => m.fileType.startsWith('video/'));
        if (hasVideo) {
          toast.success('Video is being published — this may take a few minutes', {
            duration: 6000,
          });
        } else {
          toast.success('Post is being published');
        }
      } else {
        reportProgress('Scheduling...', 70);
        await schedulePost.mutateAsync({ scheduledAt: scheduledAt! });
      }
    },
    [
      schedulePost,
      scheduleForPublish,
      publishPostNow,
      scheduledAt,
      scheduleMode,
      updatePostSilent,
      buildChannelData,
      media,
      content,
      isAmbassadorAvailable,
    ]
  );

  const handleUnschedule = useCallback(() => {
    unschedulePost.mutate();
  }, [unschedulePost]);

  const handleDelete = useCallback(() => {
    if (id) {
      deletePost.mutate(id);
    }
  }, [deletePost, id]);

  const handleRemoveMedia = useCallback((mediaAssetId: string) => {
    setMedia((prev) => prev.filter((m) => m.mediaAssetId !== mediaAssetId));
  }, []);

  const handleReorderMedia = useCallback((newOrder: PostMediaItem[]) => {
    setMedia(newOrder);
  }, []);

  const handleOpenMediaLibrary = useCallback(() => {
    setShowMediaPicker(true);
  }, []);

  const handleMediaSelect = useCallback(
    (
      assets: {
        id: string;
        fileName: string;
        fileType: string;
        fileSize: number | string;
        url: string;
        thumbnailUrl: string | null;
        width?: number | null;
        height?: number | null;
      }[]
    ) => {
      // Convert MediaAssetSummary to PostMediaItem format
      const newMedia: PostMediaItem[] = assets.map((asset, index) => ({
        id: asset.id, // Use asset id as the PostMediaItem id
        mediaAssetId: asset.id,
        fileName: asset.fileName,
        fileType: asset.fileType,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl,
        altText: null,
        position: media.length + index,
        width: asset.width ?? null,
        height: asset.height ?? null,
      }));
      setMedia((prev) => [...prev, ...newMedia]);
      setShowMediaPicker(false);
    },
    [media.length]
  );

  // Get selected accounts for preview - MUST be called before early returns
  const selectedAccounts = useMemo(() => {
    return accounts.filter((a) => selectedAccountIds.includes(a.id));
  }, [accounts, selectedAccountIds]);

  // Back button handler - MUST be defined before early returns
  const handleBack = useCallback(async () => {
    // Save content before navigating away
    if (isNew && content.trim()) {
      // For new posts with content, create as draft
      setIsSavingNewPost(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const mediaIds = media.map((m) => m.mediaAssetId);
      const startTime = Date.now();
      const MIN_SAVE_DISPLAY_MS = 600;
      try {
        await createPost.mutateAsync({
          baseContent: content,
          channels: buildChannelData(),
          mediaIds,
          isAmbassadorAvailable,
          scheduledAt: scheduleMode === 'scheduled' ? scheduledAt : null,
        });
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_SAVE_DISPLAY_MS) {
          await new Promise((resolve) => setTimeout(resolve, MIN_SAVE_DISPLAY_MS - elapsed));
        }
      } catch {
        // If save fails, still navigate away
      } finally {
        setIsSavingNewPost(false);
      }
    } else if (!isNew && content) {
      await autosaveImmediate(content);
    }
    // Navigate back to source view
    if (returnPath === '/calendar') {
      const targetDate = scheduledAt || post?.scheduledAt;
      if (targetDate) {
        const date = new Date(targetDate);
        navigate(`/calendar?date=${date.toISOString().split('T')[0]}`);
      } else {
        navigate('/calendar');
      }
    } else {
      navigate(returnPath);
    }
  }, [
    isNew,
    content,
    buildChannelData,
    media,
    isAmbassadorAvailable,
    scheduleMode,
    scheduledAt,
    createPost,
    autosaveImmediate,
    returnPath,
    post?.scheduledAt,
    navigate,
  ]);

  // Loading state
  if (!isNew && isLoadingPost) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state - post not found or failed to load
  if (!isNew && isPostError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <p className="mb-4">Post not found or failed to load</p>
          <Button variant="secondary" onClick={() => navigate('/posts')}>
            Back to Posts
          </Button>
        </div>
      </div>
    );
  }

  const isSaving = createPost.isPending || updatePost.isPending || updatePostSilent.isPending;
  const characterLimit = getCharacterLimit();

  return (
    <div className="max-w-4xl mx-auto pb-20 sm:pb-0">
      {/* Header - Desktop */}
      <div
        className="hidden sm:flex items-center justify-between mb-6"
        data-feedback-target="post-editor-header"
        data-feedback-label="Post Editor Header"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150"
            title={returnPath === '/posts' ? 'Back to Posts' : 'Back to Calendar'}
          >
            <BackIcon />
          </button>
          <h1 className="text-xl font-medium text-gray-900">{isNew ? 'New Post' : 'Edit Post'}</h1>
          {isPublishing ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Publishing...
            </span>
          ) : (
            post && <StatusIndicator status={post.status} />
          )}
          {/* More options menu */}
          {!isNew && id && (
            <Dropdown
              trigger={
                <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150">
                  <MoreIcon />
                </button>
              }
              align="left"
            >
              <DropdownItem onClick={() => setShowVersionHistory(true)} icon={<HistoryIcon />}>
                Version History
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem
                onClick={() => setShowDeleteModal(true)}
                icon={<TrashIcon />}
                destructive
              >
                Delete Post
              </DropdownItem>
            </Dropdown>
          )}
        </div>

        {/* Desktop action buttons */}
        <div className="flex items-center gap-2">
          {!isNew && id && (
            <button
              onClick={() => setShowComments(true)}
              className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150"
              title="Comments"
            >
              <CommentIcon />
              {commentCounts && commentCounts.unresolved > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                  {commentCounts.unresolved}
                </span>
              )}
            </button>
          )}
          {!isNew && id && (
            <Dropdown
              trigger={
                <Button variant="secondary" size="sm">
                  Collaborate
                  <ChevronDownIcon />
                </Button>
              }
              align="right"
            >
              <DropdownItem onClick={() => setShowTeamMemberModal(true)} icon={<UserPlusIcon />}>
                Ask team member to edit
              </DropdownItem>
              <DropdownItem onClick={() => setShowExternalReviewModal(true)} icon={<MailIcon />}>
                Ask someone to review
              </DropdownItem>
              <DropdownDivider />
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  Link sharing {hasActiveShareLink ? 'enabled' : 'disabled'}
                </span>
                <button
                  onClick={handleToggleLinkSharing}
                  className={clsx(
                    'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                    hasActiveShareLink ? 'bg-primary-600' : 'bg-gray-200'
                  )}
                  role="switch"
                  aria-checked={hasActiveShareLink}
                >
                  <span
                    className={clsx(
                      'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      hasActiveShareLink ? 'translate-x-4' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </Dropdown>
          )}
          {isEditable && (
            <Button variant="secondary" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Spinner size="sm" /> : 'Save Draft'}
            </Button>
          )}
          {canSubmit && (
            <Button variant="secondary" size="sm" onClick={() => setShowExternalReviewModal(true)}>
              {shareLinks.length > 0 ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Review Sent
                </span>
              ) : (
                'Request Review'
              )}
            </Button>
          )}
          {canApprove && (
            <Button variant="primary" size="sm" onClick={handleApprove}>
              Approve
            </Button>
          )}
          {canReject && (
            <Button variant="danger" size="sm" onClick={() => setShowRejectModal(true)}>
              Reject
            </Button>
          )}
          {canSchedule && (
            <SuccessLoadingButton
              onClick={handleSchedule}
              onError={(message) => toast.error(message)}
              idleText={scheduleMode === 'now' ? 'Publish Now' : 'Schedule'}
              successText={scheduleMode === 'now' ? 'Published!' : 'Scheduled!'}
              disabled={scheduleMode === 'scheduled' && !scheduledAt}
            />
          )}
          {canUnschedule && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleUnschedule}
              disabled={unschedulePost.isPending}
            >
              {unschedulePost.isPending ? <Spinner size="sm" /> : 'Unschedule'}
            </Button>
          )}
        </div>
      </div>

      {/* Header - Mobile: Clean compact header */}
      <div
        className="flex sm:hidden items-center justify-between mb-4"
        data-feedback-target="post-editor-header-mobile"
        data-feedback-label="Post Editor Header"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <BackIcon />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-medium text-gray-900">
              {isNew ? 'New Post' : 'Edit Post'}
            </h1>
            {isPublishing ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Publishing...
              </span>
            ) : (
              post && <StatusIndicator status={post.status} />
            )}
          </div>
        </div>

        {/* Mobile header actions - minimal, secondary only */}
        <div className="flex items-center gap-1">
          {/* Comment badge button */}
          {!isNew && id && (
            <button
              onClick={() => setShowComments(true)}
              className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <CommentIcon />
              {commentCounts && commentCounts.unresolved > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                  {commentCounts.unresolved}
                </span>
              )}
            </button>
          )}

          {/* More menu - secondary actions */}
          {!isNew && id && (
            <Dropdown
              trigger={
                <button className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <MoreIcon />
                </button>
              }
              align="right"
            >
              <DropdownItem onClick={() => setShowTeamMemberModal(true)} icon={<UserPlusIcon />}>
                Collaborate
              </DropdownItem>
              <DropdownItem onClick={() => setShowExternalReviewModal(true)} icon={<MailIcon />}>
                {shareLinks.length > 0 ? (
                  <span className="flex items-center gap-1.5">
                    Request Review
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                  </span>
                ) : (
                  'Request Review'
                )}
              </DropdownItem>
              <DropdownItem onClick={() => setShowVersionHistory(true)} icon={<HistoryIcon />}>
                Version History
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem
                onClick={() => setShowDeleteModal(true)}
                icon={<TrashIcon />}
                destructive
              >
                Delete Post
              </DropdownItem>
            </Dropdown>
          )}
        </div>
      </div>

      {/* Mobile Fixed Bottom Action Bar */}
      <div
        className="fixed sm:hidden bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40 safe-area-bottom"
        data-feedback-target="post-editor-actions-mobile"
        data-feedback-label="Post Actions"
      >
        <div className="flex items-center gap-3">
          {/* Save Draft - secondary */}
          {isEditable && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? <Spinner size="sm" /> : 'Save Draft'}
            </Button>
          )}

          {/* Primary actions */}
          {canApprove && (
            <>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowRejectModal(true)}
                className="flex-1"
              >
                Reject
              </Button>
              <Button variant="primary" size="sm" onClick={handleApprove} className="flex-1">
                Approve
              </Button>
            </>
          )}

          {canSchedule && (
            <SuccessLoadingButton
              onClick={handleSchedule}
              onError={(message) => toast.error(message)}
              idleText={scheduleMode === 'now' ? 'Publish Now' : 'Schedule'}
              successText={scheduleMode === 'now' ? 'Published!' : 'Scheduled!'}
              disabled={scheduleMode === 'scheduled' && !scheduledAt}
              className="flex-1"
            />
          )}

          {canUnschedule && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleUnschedule}
              disabled={unschedulePost.isPending}
              className="flex-1"
            >
              {unschedulePost.isPending ? <Spinner size="sm" /> : 'Unschedule'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for published posts */}
      {post?.status === POST_STATUS.PUBLISHED && (
        <div
          className="flex gap-1 mb-6 border-b border-gray-200"
          data-feedback-target="post-editor-tabs"
          data-feedback-label="Post Details/Report Tabs"
        >
          <button
            onClick={() => setActiveTab('details')}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'details'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'report'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Report
          </button>
        </div>
      )}

      {/* Report tab content for published posts */}
      {post?.status === POST_STATUS.PUBLISHED && activeTab === 'report' ? (
        <Card
          padding="none"
          data-feedback-target="post-editor-report"
          data-feedback-label="Post Analytics Report"
        >
          <PostAnalyticsPanel postId={id!} />
        </Card>
      ) : (
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div
            className="lg:col-span-2 space-y-6"
            data-feedback-target="post-editor-content"
            data-feedback-label="Post Content"
          >
            {/* Content editor with integrated media */}
            <Card padding="none">
              <RichTextEditor
                content={content}
                onChange={handleContentChange}
                onBlur={handleEditorBlur}
                placeholder="Write your post..."
                characterLimit={characterLimit}
                disabled={!isEditable}
                media={media}
                onMediaRemove={handleRemoveMedia}
                onMediaReorder={handleReorderMedia}
                onOpenMediaLibrary={handleOpenMediaLibrary}
                {...(isNew
                  ? isSavingNewPost
                    ? { autosaveStatus: 'saving' as const }
                    : {}
                  : {
                      autosaveStatus,
                      autosaveError,
                      onAutosaveRetry: autosaveRetry,
                    })}
              />
              {/* Post preview */}
              <PostPreview
                content={content}
                media={media}
                selectedAccounts={selectedAccounts}
                channelOverrides={channelOverrides}
              />
            </Card>

            {/* Channel content overrides */}
            {(selectedAccounts.length >= 2 || Object.keys(channelOverrides).length > 0) && (
              <Card padding="lg">
                <ChannelOverrides
                  selectedAccounts={selectedAccounts}
                  baseContent={content}
                  overrides={channelOverrides}
                  onOverrideChange={handleChannelOverrideChange}
                  disabled={!isEditable}
                />
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div
            className="space-y-4 lg:space-y-6"
            data-feedback-target="post-editor-sidebar"
            data-feedback-label="Post Sidebar"
          >
            {/* Scheduling (for new posts, posts that can be scheduled, or scheduled posts) */}
            {(isNew || (post && (canSchedule || canUnschedule))) && (
              <MobileCollapsible title="Scheduling" defaultOpen>
                <Card
                  padding="lg"
                  data-feedback-target="post-editor-scheduling"
                  data-feedback-label="Post Scheduling"
                >
                  <SchedulingSection
                    mode={scheduleMode}
                    scheduledAt={scheduledAt}
                    onModeChange={handleScheduleModeChange}
                    onScheduledAtChange={handleScheduledAtChange}
                    disabled={!isEditable && !canSchedule}
                  />
                </Card>
              </MobileCollapsible>
            )}

            {/* Channel selection */}
            <MobileCollapsible title="Channels" defaultOpen>
              <Card
                padding="lg"
                data-feedback-target="post-editor-channels"
                data-feedback-label="Channel Selection"
              >
                {isLoadingAccounts ? (
                  <div className="flex justify-center py-4">
                    <Spinner size="sm" />
                  </div>
                ) : (
                  <ChannelSelector
                    accounts={accounts}
                    selectedAccountIds={selectedAccountIds}
                    onSelectionChange={setSelectedAccountIds}
                    disabled={!isEditable}
                  />
                )}
              </Card>
            </MobileCollapsible>

            {/* Collaborators section (only for existing posts) */}
            {!isNew && id && (
              <MobileCollapsible title="Collaborators">
                <Card padding="lg">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        Collaborators
                        {post?.collaborators && post.collaborators.length > 0 && (
                          <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-primary-700 bg-primary-50 rounded-full">
                            {post.collaborators.length}
                          </span>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowTeamMemberModal(true)}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                    {post?.collaborators && post.collaborators.length > 0 ? (
                      <div className="space-y-2">
                        {post.collaborators.map((collab) => (
                          <div key={collab.userId} className="flex items-center gap-2.5 py-1.5">
                            <Avatar
                              name={collab.user.fullName}
                              src={collab.user.avatarUrl}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 truncate">
                                {collab.user.fullName}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeCollaborator.mutate(collab.userId)}
                              disabled={removeCollaborator.isPending}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                              title="Remove collaborator"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No collaborators</p>
                    )}
                  </div>
                </Card>
              </MobileCollapsible>
            )}

            {/* Ambassador Sharing Toggle (admin only) */}
            {isAdmin && (
              <Card
                padding="lg"
                data-feedback-target="post-editor-ambassador"
                data-feedback-label="Ambassador Sharing"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Ambassador Sharing</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Allow ambassadors to share this post
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAmbassadorAvailable(!isAmbassadorAvailable)}
                    className={clsx(
                      'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                      isAmbassadorAvailable ? 'bg-primary-600' : 'bg-gray-200'
                    )}
                    role="switch"
                    aria-checked={isAmbassadorAvailable}
                  >
                    <span
                      className={clsx(
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        isAmbassadorAvailable ? 'translate-x-4' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </Card>
            )}

            {/* Rejection reason (if rejected) */}
            {post?.status === POST_STATUS.REJECTED && post.rejectionReason && (
              <Card padding="lg" className="bg-red-50">
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800 mb-1">Rejected</p>
                    <p className="text-sm text-red-700">{post.rejectionReason}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Post">
        <div className="space-y-4">
          <div>
            <Label htmlFor="reject-reason">Reason for rejection</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejecting this post..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} disabled={!rejectReason.trim()}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Post">
        <div className="space-y-4">
          {post?.status === 'PUBLISHED' ? (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <h4 className="font-medium text-amber-800">This post has been published</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Make sure you have deleted this post from LinkedIn and Instagram first.
                      Deleting here will only remove it from Social Planner, not from the social
                      platforms.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                Are you sure you want to delete this post? This action cannot be undone.
              </p>
            </>
          ) : (
            <p className="text-gray-600">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deletePost.isPending}>
              {deletePost.isPending ? <Spinner size="sm" /> : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ask Team Member Modal */}
      <Modal
        isOpen={showTeamMemberModal}
        onClose={() => {
          setShowTeamMemberModal(false);
          setSelectedTeamMember(null);
        }}
        title="Ask team member to edit"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select a team member to collaborate with on this post.
          </p>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {teamMembers
              .filter((member) => !post?.collaborators?.some((c) => c.userId === member.id))
              .map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedTeamMember(member.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                    selectedTeamMember === member.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <Avatar name={member.fullName} src={member.avatarUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{member.fullName}</p>
                    <p className="text-xs text-gray-500 truncate">{member.email}</p>
                  </div>
                  <span className="text-xs text-gray-400 capitalize">
                    {member.role.toLowerCase()}
                  </span>
                </button>
              ))}
            {teamMembers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No team members available</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowTeamMemberModal(false);
                setSelectedTeamMember(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddTeamMember}
              disabled={!selectedTeamMember || addCollaborator.isPending}
            >
              {addCollaborator.isPending ? <Spinner size="sm" /> : 'Add Collaborator'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ask External Reviewer Modal */}
      <Modal
        isOpen={showExternalReviewModal}
        onClose={() => {
          setShowExternalReviewModal(false);
          setExternalReviewEmail('');
          setExternalReviewMessage('');
        }}
        title="Ask someone to review"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Send a review link to someone outside your team. They can view and comment on this post.
          </p>
          <div>
            <Label htmlFor="reviewer-email">Email address</Label>
            <Input
              id="reviewer-email"
              type="email"
              placeholder="reviewer@example.com"
              value={externalReviewEmail}
              onChange={(e) => setExternalReviewEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="review-message">Message (optional)</Label>
            <Textarea
              id="review-message"
              placeholder="Add a note for the reviewer..."
              value={externalReviewMessage}
              onChange={(e) => setExternalReviewMessage(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowExternalReviewModal(false);
                setExternalReviewEmail('');
                setExternalReviewMessage('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleCopyReviewLink}
              disabled={createShareLink.isPending || sendReviewRequest.isPending}
            >
              {createShareLink.isPending ? <Spinner size="sm" /> : 'Copy Link'}
            </Button>
            <Button
              variant="primary"
              onClick={handleSendReviewEmail}
              disabled={
                !externalReviewEmail || createShareLink.isPending || sendReviewRequest.isPending
              }
            >
              {sendReviewRequest.isPending ? <Spinner size="sm" /> : 'Send Email'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        multiple
      />

      {/* Comment Panel */}
      {!isNew && id && post && (
        <CommentPanel
          postId={id}
          postAuthorId={post.author.id}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
        />
      )}

      {/* Version History Modal */}
      {!isNew && id && (
        <VersionHistoryModal
          postId={id}
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
    </div>
  );
}

// Icons
function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      className="w-4 h-4 ml-1"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}
