/**
 * Share Link Modal
 *
 * Modal for creating and managing share links for calendar or post sharing.
 */

import { useState, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import {
  useCreateCalendarShareLink,
  useCreatePostShareLink,
  useUserShareLinks,
  useDeleteShareLink,
  type ShareLink,
} from '@/hooks/useShareLink';

export interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'calendar' | 'post';
  month?: string; // YYYY-MM format for calendar mode
  postId?: string; // Post ID for post mode
}

const EXPIRATION_OPTIONS = [
  { value: '1', label: '1 hour' },
  { value: '24', label: '24 hours' },
  { value: '168', label: '7 days' },
  { value: '720', label: '30 days' },
];

const PERMISSION_OPTIONS = [
  { value: 'VIEW', label: 'View only' },
  { value: 'VIEW_COMMENT', label: 'View and comment' },
];

export function ShareLinkModal({ isOpen, onClose, mode, month, postId }: ShareLinkModalProps) {
  // Form state
  const [expiresInHours, setExpiresInHours] = useState('168'); // Default 7 days
  const [permissions, setPermissions] = useState<'VIEW' | 'VIEW_COMMENT'>('VIEW_COMMENT');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);

  // Generated link state
  const [generatedLink, setGeneratedLink] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState(false);

  // Mutations
  const createCalendarLink = useCreateCalendarShareLink();
  const createPostLink = useCreatePostShareLink();
  const deleteLink = useDeleteShareLink();

  // Query existing links
  const { data: userLinks, isLoading: isLoadingLinks } = useUserShareLinks();

  // Filter links based on mode
  const relevantLinks = useMemo(() => {
    if (!userLinks) return [];
    if (mode === 'calendar') {
      return userLinks.filter((link) => link.calendarShare);
    }
    return userLinks.filter((link) => link.postId === postId);
  }, [userLinks, mode, postId]);

  // Reset form when modal closes
  const handleClose = useCallback(() => {
    setGeneratedLink(null);
    setCopied(false);
    setPassword('');
    setUsePassword(false);
    onClose();
  }, [onClose]);

  // Create share link
  const handleCreate = useCallback(async () => {
    const baseData = {
      expiresInHours: Number(expiresInHours),
      permissions,
    };

    // Only include password if using password protection and it's valid
    const data = usePassword && password.length >= 8 ? { ...baseData, password } : baseData;

    try {
      let link: ShareLink;
      if (mode === 'calendar' && month) {
        link = await createCalendarLink.mutateAsync({ ...data, month });
      } else if (mode === 'post' && postId) {
        link = await createPostLink.mutateAsync({ ...data, postId });
      } else {
        return;
      }
      setGeneratedLink(link);
    } catch {
      // Error handled by mutation
    }
  }, [
    mode,
    month,
    postId,
    expiresInHours,
    permissions,
    password,
    usePassword,
    createCalendarLink,
    createPostLink,
  ]);

  // Copy link to clipboard
  const handleCopy = useCallback(async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = generatedLink.url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedLink]);

  // Delete a share link
  const handleDelete = useCallback(
    (linkId: string) => {
      deleteLink.mutate(linkId);
      if (generatedLink?.id === linkId) {
        setGeneratedLink(null);
      }
    },
    [deleteLink, generatedLink]
  );

  const isCreating = createCalendarLink.isPending || createPostLink.isPending;
  const title = mode === 'calendar' ? 'Share Calendar' : 'Share Post';
  const description =
    mode === 'calendar'
      ? `Share your planned posts for ${month ? formatMonthDisplay(month) : 'this month'} with external reviewers.`
      : 'Share this post with external reviewers for feedback.';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" title={title} description={description}>
      <div className="space-y-6">
        {/* Generated Link Display */}
        {generatedLink && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium text-green-800">Link created!</span>
            </div>
            <div className="flex items-center gap-2">
              <Input value={generatedLink.url} readOnly className="flex-1 text-sm bg-white" />
              <Button variant={copied ? 'primary' : 'secondary'} size="sm" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            {generatedLink.hasPassword && (
              <p className="mt-2 text-sm text-green-700">This link is password protected.</p>
            )}
          </div>
        )}

        {/* Create New Link Form */}
        {!generatedLink && (
          <div className="space-y-4">
            {/* Expiration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link expires in
              </label>
              <Select value={expiresInHours} onChange={(e) => setExpiresInHours(e.target.value)}>
                {EXPIRATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Permissions</label>
              <Select
                value={permissions}
                onChange={(e) => setPermissions(e.target.value as 'VIEW' | 'VIEW_COMMENT')}
              >
                {PERMISSION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Password Protection */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usePassword}
                  onChange={(e) => setUsePassword(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Password protect this link
                </span>
              </label>
              {usePassword && (
                <div className="mt-2">
                  <Input
                    type="password"
                    placeholder="Enter password (min 8 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={password.length > 0 && password.length < 8}
                  />
                  {password.length > 0 && password.length < 8 && (
                    <p className="mt-1 text-xs text-red-600">
                      Password must be at least 8 characters
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Create Button */}
            <Button
              variant="primary"
              className="w-full"
              onClick={handleCreate}
              isLoading={isCreating}
              disabled={usePassword && password.length > 0 && password.length < 8}
            >
              Generate Share Link
            </Button>
          </div>
        )}

        {/* Existing Links */}
        {relevantLinks.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Existing share links</h3>
            {isLoadingLinks ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : (
              <div className="space-y-2">
                {relevantLinks.map((link) => (
                  <ShareLinkItem
                    key={link.id}
                    link={link}
                    onDelete={handleDelete}
                    isDeleting={deleteLink.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Back/Close Button */}
        {generatedLink && (
          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setGeneratedLink(null)}>
              Create another
            </Button>
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Helper component for displaying a share link
function ShareLinkItem({
  link,
  onDelete,
  isDeleting,
}: {
  link: ShareLink;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const isExpired = new Date(link.expiresAt) < new Date();

  return (
    <div
      className={clsx(
        'flex items-center justify-between p-3 rounded-lg border',
        isExpired ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              link.permissions === 'VIEW_COMMENT'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            )}
          >
            {link.permissions === 'VIEW_COMMENT' ? 'View + Comment' : 'View only'}
          </span>
          {link.hasPassword && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">
              Password
            </span>
          )}
          {isExpired && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium">
              Expired
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1 truncate">{link.url}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Created {formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })}
          {!isExpired && (
            <>
              {' · '}Expires {formatDistanceToNow(new Date(link.expiresAt), { addSuffix: true })}
            </>
          )}
        </p>
      </div>
      <Button variant="danger" size="sm" onClick={() => onDelete(link.id)} disabled={isDeleting}>
        Delete
      </Button>
    </div>
  );
}

// Helper to format month for display
function formatMonthDisplay(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(Number(year), Number(monthNum) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
