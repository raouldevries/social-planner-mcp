/**
 * Connect Account Modal Component
 *
 * Modal for selecting and connecting a new social account via OAuth.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import {
  type SocialPlatform,
  getPlatformDisplayName,
  getPlatformColor,
} from '@/hooks/useSocialAccounts';
import { PlatformIcon } from './PlatformIcon';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface ConnectAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLATFORMS: { platform: SocialPlatform; description: string }[] = [
  {
    platform: 'INSTAGRAM',
    description: 'Connect your Instagram Business or Creator account to schedule and publish posts.',
  },
  {
    platform: 'LINKEDIN',
    description: 'Connect your LinkedIn Page to share professional content with your network.',
  },
];

export function ConnectAccountModal({ isOpen, onClose }: ConnectAccountModalProps) {
  const [connectingPlatform, setConnectingPlatform] = useState<SocialPlatform | null>(null);

  const handleConnect = useCallback(async (platform: SocialPlatform) => {
    setConnectingPlatform(platform);
    try {
      // Get OAuth URL from API
      const response = await api.get(`/social-accounts/oauth/${platform.toLowerCase()}`);
      const { authUrl } = response.data as { authUrl: string };

      // Redirect to OAuth provider
      window.location.href = authUrl;
    } catch {
      setConnectingPlatform(null);
      toast.error(`Failed to start ${getPlatformDisplayName(platform)} connection`);
    }
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect Social Account"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select a platform to connect. You&apos;ll be redirected to authorize access.
        </p>

        <Alert variant="info">
          Make sure you have admin access to the accounts you want to connect.
          For Instagram, you need a Business or Creator account linked to a Facebook Page.
        </Alert>

        <div className="space-y-3 pt-2">
          {PLATFORMS.map(({ platform, description }) => (
            <PlatformOption
              key={platform}
              platform={platform}
              description={description}
              onConnect={() => handleConnect(platform)}
              isLoading={connectingPlatform === platform}
              disabled={connectingPlatform !== null}
            />
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface PlatformOptionProps {
  platform: SocialPlatform;
  description: string;
  onConnect: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

function PlatformOption({ platform, description, onConnect, isLoading, disabled }: PlatformOptionProps) {
  const platformName = getPlatformDisplayName(platform);
  const platformColor = getPlatformColor(platform);

  return (
    <button
      type="button"
      onClick={onConnect}
      disabled={disabled}
      className="w-full flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white"
      aria-label={`Connect ${platformName} account`}
    >
      <div
        className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: platformColor }}
      >
        {isLoading ? (
          <Spinner size="sm" className="text-white" />
        ) : (
          <PlatformIcon platform={platform} className="w-6 h-6 text-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900">{platformName}</h4>
        <p className="text-sm text-gray-500 mt-0.5">
          {isLoading ? 'Redirecting to authorization...' : description}
        </p>
      </div>
      <div className="flex-shrink-0 self-center">
        {!isLoading && (
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </button>
  );
}
