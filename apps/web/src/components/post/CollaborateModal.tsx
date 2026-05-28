/**
 * Collaborate Modal
 *
 * Modal for creating and managing share links for post review.
 * Inspired by StoryChief's collaboration features.
 */

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import {
  useCreatePostShareLink,
  usePostShareLinks,
  useDeleteShareLink,
  type ShareLink,
} from '@/hooks/useShareLink';
import toast from 'react-hot-toast';

interface CollaborateModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

type TabId = 'create' | 'manage';

const EXPIRATION_OPTIONS = [
  { value: 1, label: '1 hour' },
  { value: 24, label: '24 hours' },
  { value: 168, label: '7 days' },
  { value: 720, label: '30 days' },
];

export function CollaborateModal({ isOpen, onClose, postId }: CollaborateModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('create');
  const [expiresInHours, setExpiresInHours] = useState(168); // 7 days default
  const [permissions, setPermissions] = useState<'VIEW' | 'VIEW_COMMENT'>('VIEW_COMMENT');
  const [password, setPassword] = useState('');
  const [generatedLink, setGeneratedLink] = useState<ShareLink | null>(null);

  const createShareLink = useCreatePostShareLink();
  const { data: shareLinks = [], isLoading: isLoadingLinks } = usePostShareLinks(postId);
  const deleteShareLink = useDeleteShareLink();

  const handleCreateLink = useCallback(async () => {
    try {
      const link = await createShareLink.mutateAsync({
        postId,
        expiresInHours,
        permissions,
        ...(password ? { password } : {}),
      });
      setGeneratedLink(link);
      setPassword('');
    } catch {
      // Error handled by mutation
    }
  }, [createShareLink, postId, expiresInHours, permissions, password]);

  const handleCopyLink = useCallback(() => {
    if (generatedLink?.url) {
      navigator.clipboard.writeText(generatedLink.url);
      toast.success('Link copied to clipboard');
    }
  }, [generatedLink]);

  const handleDeleteLink = useCallback(
    async (linkId: string) => {
      try {
        await deleteShareLink.mutateAsync(linkId);
        if (generatedLink?.id === linkId) {
          setGeneratedLink(null);
        }
      } catch {
        // Error handled by mutation
      }
    },
    [deleteShareLink, generatedLink]
  );

  const handleClose = useCallback(() => {
    setGeneratedLink(null);
    setPassword('');
    onClose();
  }, [onClose]);

  const activeShareLinks = shareLinks.filter((link) => new Date(link.expiresAt) > new Date());

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" title="Collaborate">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={clsx(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'create'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Create Link
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('manage')}
          className={clsx(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'manage'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Active Links
          {activeShareLinks.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
              {activeShareLinks.length}
            </span>
          )}
        </button>
      </div>

      {/* Create Link Tab */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Description */}
          <p className="text-sm text-gray-500">
            Create a shareable link to allow external reviewers to view this post and leave comments
            without needing an account.
          </p>

          {/* Generated Link Display */}
          {generatedLink && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Link created successfully
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink.url}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-green-300 rounded-lg focus:outline-none"
                />
                <Button variant="secondary" size="sm" onClick={handleCopyLink}>
                  <CopyIcon className="w-4 h-4" />
                </Button>
              </div>
              {generatedLink.hasPassword && (
                <p className="mt-2 text-xs text-green-700">
                  Password protected - share the password separately
                </p>
              )}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            {/* Expiration */}
            <div>
              <Label htmlFor="expiration">Link expires in</Label>
              <select
                id="expiration"
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {EXPIRATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Permissions */}
            <div>
              <Label>Permissions</Label>
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPermissions('VIEW')}
                  className={clsx(
                    'flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all',
                    permissions === 'VIEW'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  <EyeIcon className="w-5 h-5 mx-auto mb-1" />
                  View only
                </button>
                <button
                  type="button"
                  onClick={() => setPermissions('VIEW_COMMENT')}
                  className={clsx(
                    'flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all',
                    permissions === 'VIEW_COMMENT'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  <CommentIcon className="w-5 h-5 mx-auto mb-1" />
                  View + Comment
                </button>
              </div>
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password">Password (optional)</Label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty for no password"
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-400">
                If set, reviewers must enter this password to access the post
              </p>
            </div>
          </div>

          {/* Create Button */}
          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              onClick={handleCreateLink}
              isLoading={createShareLink.isPending}
            >
              Generate Link
            </Button>
          </div>
        </div>
      )}

      {/* Manage Links Tab */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          {isLoadingLinks ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : activeShareLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <LinkIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No active share links</p>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Create one now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeShareLinks.map((link) => (
                <ShareLinkItem
                  key={link.id}
                  link={link}
                  onDelete={() => handleDeleteLink(link.id)}
                  isDeleting={deleteShareLink.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// Share Link Item Component
interface ShareLinkItemProps {
  link: ShareLink;
  onDelete: () => void;
  isDeleting: boolean;
}

function ShareLinkItem({ link, onDelete, isDeleting }: ShareLinkItemProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(link.url);
    toast.success('Link copied to clipboard');
  };

  const expiresAt = new Date(link.expiresAt);
  const now = new Date();
  const hoursRemaining = Math.max(
    0,
    Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))
  );

  let expirationText: string;
  if (hoursRemaining < 1) {
    expirationText = 'Expires soon';
  } else if (hoursRemaining < 24) {
    expirationText = `${hoursRemaining}h remaining`;
  } else {
    const daysRemaining = Math.round(hoursRemaining / 24);
    expirationText = `${daysRemaining}d remaining`;
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          {link.permissions === 'VIEW_COMMENT' ? (
            <CommentIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <EyeIcon className="w-4 h-4 text-gray-400" />
          )}
          <span className="font-medium text-gray-700">
            {link.permissions === 'VIEW_COMMENT' ? 'View + Comment' : 'View only'}
          </span>
          {link.hasPassword && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
              Password
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1 truncate">{link.url}</p>
        <p className="text-xs text-gray-400 mt-0.5">{expirationText}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleCopy}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          title="Copy link"
        >
          <CopyIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          title="Delete link"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Icons
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
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
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
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
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CommentIcon({ className }: { className?: string }) {
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
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
      />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
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
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
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
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}
