/**
 * Social Account Card Component
 *
 * Displays a connected social account with status and actions.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import {
  type SocialAccountSummary,
  getPlatformDisplayName,
  getPlatformColor,
  useDisconnectAccount,
  useRefreshToken,
} from '@/hooks/useSocialAccounts';
import { useIsAdmin } from '@/stores/authStore';
import { PlatformIcon } from './PlatformIcon';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface SocialAccountCardProps {
  account: SocialAccountSummary;
}

export function SocialAccountCard({ account }: SocialAccountCardProps) {
  const isAdmin = useIsAdmin();
  const disconnectAccount = useDisconnectAccount();
  const refreshToken = useRefreshToken();

  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const handleDisconnect = useCallback(async () => {
    await disconnectAccount.mutateAsync(account.id);
    setShowDisconnectModal(false);
  }, [account.id, disconnectAccount]);

  const handleRefreshToken = useCallback(async () => {
    await refreshToken.mutateAsync(account.id);
  }, [account.id, refreshToken]);

  const [isReconnecting, setIsReconnecting] = useState(false);
  const handleReconnect = useCallback(async () => {
    setIsReconnecting(true);
    try {
      const response = await api.get(`/social-accounts/oauth/${account.platform.toLowerCase()}`);
      const { authUrl } = response.data as { authUrl: string };
      window.location.href = authUrl;
    } catch {
      setIsReconnecting(false);
      toast.error(`Failed to start ${getPlatformDisplayName(account.platform)} reconnection`);
    }
  }, [account.platform]);

  const [imageError, setImageError] = useState(false);

  const platformColor = getPlatformColor(account.platform);
  const platformName = getPlatformDisplayName(account.platform);

  // Check token expiry status
  const tokenExpiryDate = account.tokenExpiresAt ? new Date(account.tokenExpiresAt) : null;
  const daysUntilExpiry = tokenExpiryDate ? differenceInDays(tokenExpiryDate, new Date()) : null;
  const isTokenExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const isTokenExpiringSoon =
    daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 14;

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          {/* Platform Icon / Profile Image */}
          <div className="flex-shrink-0">
            {account.profileImageUrl && !imageError ? (
              <img
                src={account.profileImageUrl}
                alt={`${account.accountName} profile`}
                className="w-14 h-14 rounded-full object-cover border-2"
                style={{ borderColor: platformColor }}
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: platformColor }}
              >
                <PlatformIcon platform={account.platform} className="w-7 h-7 text-white" />
              </div>
            )}
          </div>

          {/* Account Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {account.accountName}
              </h3>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
                style={{ backgroundColor: `${platformColor}20`, color: platformColor }}
              >
                {platformName}
              </span>
            </div>

            {account.accountType && (
              <p className="text-sm text-gray-500 mb-2">{account.accountType}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-400">
              {account.lastSyncAt && (
                <span>
                  Last synced{' '}
                  {formatDistanceToNow(new Date(account.lastSyncAt), { addSuffix: true })}
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
                Connected
              </span>
            </div>

            {/* Token Expiry Info - Admin Only */}
            {isAdmin && tokenExpiryDate && (
              <div className="mt-2 text-xs text-gray-500">
                <span className="font-medium">Token expires:</span>{' '}
                {format(tokenExpiryDate, 'MMM d, yyyy')}
                {daysUntilExpiry !== null && (
                  <span
                    className={
                      isTokenExpired
                        ? 'text-red-600 ml-1'
                        : isTokenExpiringSoon
                          ? 'text-amber-600 ml-1'
                          : 'ml-1'
                    }
                  >
                    ({isTokenExpired ? 'expired' : `${daysUntilExpiry} days left`})
                  </span>
                )}
              </div>
            )}

            {/* Token Expiry Warning */}
            {isTokenExpired && (
              <Alert variant="error" className="mt-3 text-xs">
                {account.platform === 'LINKEDIN'
                  ? 'Token has expired. Please reconnect to restore publishing.'
                  : 'Token has expired. Please refresh to restore publishing.'}
              </Alert>
            )}
            {isTokenExpiringSoon && !isTokenExpired && (
              <Alert variant="warning" className="mt-3 text-xs">
                {account.platform === 'LINKEDIN'
                  ? `Token expires in ${daysUntilExpiry} days. Reconnect to avoid interruptions.`
                  : `Token expires in ${daysUntilExpiry} days. Consider refreshing to avoid interruptions.`}
              </Alert>
            )}
          </div>

          {/* Actions */}
          {isAdmin && (
            <div className="flex-shrink-0 flex flex-col gap-2">
              {(isTokenExpiringSoon || isTokenExpired) && account.platform === 'INSTAGRAM' && (
                <Button
                  variant={isTokenExpired ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={handleRefreshToken}
                  isLoading={refreshToken.isPending}
                  aria-label={`Refresh token for ${account.accountName}`}
                >
                  Refresh Token
                </Button>
              )}
              {(isTokenExpiringSoon || isTokenExpired) && account.platform === 'LINKEDIN' && (
                <Button
                  variant={isTokenExpired ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={handleReconnect}
                  isLoading={isReconnecting}
                  aria-label={`Reconnect ${account.accountName}`}
                >
                  Reconnect
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDisconnectModal(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                aria-label={`Disconnect ${account.accountName}`}
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      <Modal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        title="Disconnect Account"
        size="sm"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            Are you sure you want to disconnect <strong>{account.accountName}</strong>? This will
            prevent publishing to this account until reconnected.
          </Alert>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            {account.profileImageUrl && !imageError ? (
              <img
                src={account.profileImageUrl}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: platformColor }}
              >
                <PlatformIcon platform={account.platform} className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{account.accountName}</p>
              <p className="text-sm text-gray-500">{platformName}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowDisconnectModal(false)}
              disabled={disconnectAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDisconnect}
              isLoading={disconnectAccount.isPending}
            >
              Disconnect
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
