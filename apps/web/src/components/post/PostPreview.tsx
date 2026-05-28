/**
 * Post Preview
 *
 * Container component that shows platform-specific previews with tabs
 * and account selector dropdown for multi-account scenarios.
 */

import { useState, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { SOCIAL_PLATFORM, type PostMediaItem, type SocialAccountSummary } from '@social-planner/shared';
import { InstagramPreview } from './InstagramPreview';
import { LinkedInPreview } from './LinkedInPreview';

interface PostPreviewProps {
  content: string;
  media: PostMediaItem[];
  selectedAccounts: SocialAccountSummary[];
  channelOverrides?: Record<string, string>;
}

type Platform = typeof SOCIAL_PLATFORM.INSTAGRAM | typeof SOCIAL_PLATFORM.LINKEDIN;

export function PostPreview({
  content,
  media,
  selectedAccounts,
  channelOverrides,
}: PostPreviewProps) {
  // Group accounts by platform
  const accountsByPlatform = useMemo(() => {
    const instagram = selectedAccounts.filter((a) => a.platform === SOCIAL_PLATFORM.INSTAGRAM);
    const linkedin = selectedAccounts.filter((a) => a.platform === SOCIAL_PLATFORM.LINKEDIN);
    return { instagram, linkedin };
  }, [selectedAccounts]);

  // Available platforms (only show tabs for platforms with selected accounts)
  const availablePlatforms = useMemo(() => {
    const platforms: Platform[] = [];
    if (accountsByPlatform.instagram.length > 0) platforms.push(SOCIAL_PLATFORM.INSTAGRAM);
    if (accountsByPlatform.linkedin.length > 0) platforms.push(SOCIAL_PLATFORM.LINKEDIN);
    return platforms;
  }, [accountsByPlatform]);

  // Active platform state
  const [activePlatform, setActivePlatform] = useState<Platform | null>(
    availablePlatforms[0] ?? null
  );

  // Selected account for each platform
  const [selectedAccountByPlatform, setSelectedAccountByPlatform] = useState<
    Record<Platform, string | null>
  >({
    [SOCIAL_PLATFORM.INSTAGRAM]: accountsByPlatform.instagram[0]?.id ?? null,
    [SOCIAL_PLATFORM.LINKEDIN]: accountsByPlatform.linkedin[0]?.id ?? null,
  });

  // Update active platform when available platforms change
  useEffect(() => {
    if (availablePlatforms.length > 0 && !availablePlatforms.includes(activePlatform as Platform)) {
      setActivePlatform(availablePlatforms[0] ?? null);
    } else if (availablePlatforms.length === 0) {
      setActivePlatform(null);
    }
  }, [availablePlatforms, activePlatform]);

  // Update selected accounts when accounts change
  useEffect(() => {
    setSelectedAccountByPlatform((prev) => ({
      [SOCIAL_PLATFORM.INSTAGRAM]:
        accountsByPlatform.instagram.find((a) => a.id === prev[SOCIAL_PLATFORM.INSTAGRAM])?.id ??
        accountsByPlatform.instagram[0]?.id ??
        null,
      [SOCIAL_PLATFORM.LINKEDIN]:
        accountsByPlatform.linkedin.find((a) => a.id === prev[SOCIAL_PLATFORM.LINKEDIN])?.id ??
        accountsByPlatform.linkedin[0]?.id ??
        null,
    }));
  }, [accountsByPlatform]);

  // Get current accounts for active platform
  const currentPlatformAccounts =
    activePlatform === SOCIAL_PLATFORM.INSTAGRAM
      ? accountsByPlatform.instagram
      : activePlatform === SOCIAL_PLATFORM.LINKEDIN
        ? accountsByPlatform.linkedin
        : [];

  const selectedAccountId = activePlatform ? selectedAccountByPlatform[activePlatform] : null;
  const selectedAccount = currentPlatformAccounts.find((a) => a.id === selectedAccountId);

  // Don't render if no channels selected
  if (selectedAccounts.length === 0) {
    return null;
  }

  const handleAccountChange = (accountId: string) => {
    if (activePlatform) {
      setSelectedAccountByPlatform((prev) => ({
        ...prev,
        [activePlatform]: accountId,
      }));
    }
  };

  return (
    <div className="border-t border-gray-100 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between px-6 mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</p>

        {/* Platform tabs (segmented control) */}
        {availablePlatforms.length > 1 && (
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {availablePlatforms.map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => setActivePlatform(platform)}
                className={clsx(
                  'px-3 py-1 text-xs font-medium rounded-md transition-all duration-150',
                  activePlatform === platform
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {platform === SOCIAL_PLATFORM.INSTAGRAM ? 'Instagram' : 'LinkedIn'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Account selector (only show if multiple accounts for active platform) */}
      {currentPlatformAccounts.length > 1 && (
        <div className="px-6 mb-4">
          <div className="relative">
            <select
              value={selectedAccountId ?? ''}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {currentPlatformAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Preview content */}
      <div className="px-6 pb-4">
        {(() => {
          const override = selectedAccount ? channelOverrides?.[selectedAccount.id] : undefined;
          const previewContent = override !== undefined ? override : content;

          return (
            <>
              {activePlatform === SOCIAL_PLATFORM.INSTAGRAM && selectedAccount && (
                <InstagramPreview
                  content={previewContent}
                  media={media}
                  account={selectedAccount}
                />
              )}
              {activePlatform === SOCIAL_PLATFORM.LINKEDIN && selectedAccount && (
                <LinkedInPreview content={previewContent} media={media} account={selectedAccount} />
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

// Icons
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
