/**
 * Social Accounts Page
 *
 * Manage connected Instagram and LinkedIn accounts.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Empty } from '@/components/ui/Empty';
import { Alert } from '@/components/ui/Alert';
import { SocialAccountCard, ConnectAccountModal, PlatformIcon } from '@/components/social-accounts';
import {
  useSocialAccounts,
  useConnectInstagram,
  useLinkedInCallback,
  useCompleteLinkedInConnection,
  type SocialPlatform,
  type LinkedInOAuthResult,
  type LinkedInOrganization,
} from '@/hooks/useSocialAccounts';
import { useCanEdit } from '@/stores/authStore';
import toast from 'react-hot-toast';

export function SocialAccounts() {
  const canConnect = useCanEdit(); // Admins and Editors can connect accounts

  const [searchParams, setSearchParams] = useSearchParams();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showOrgSelectModal, setShowOrgSelectModal] = useState(false);
  const [linkedInOAuthData, setLinkedInOAuthData] = useState<LinkedInOAuthResult | null>(null);

  // Track if OAuth callback has been processed to prevent double-firing
  const oauthProcessedRef = useRef(false);

  // Fetch accounts
  const { data, isLoading, isError, refetch } = useSocialAccounts({ perPage: 50 });

  // OAuth mutations
  const connectInstagram = useConnectInstagram();
  const linkedInCallback = useLinkedInCallback();
  const completeLinkedIn = useCompleteLinkedInConnection();

  // Handle LinkedIn OAuth callback result
  const handleLinkedInCallback = useCallback(
    async (code: string) => {
      try {
        const result = await linkedInCallback.mutateAsync(code);
        console.log('LinkedIn callback success:', result);
        console.log('Organizations count:', result.organizations?.length);

        if (result.organizations && result.organizations.length > 0) {
          // Has organizations - show selection modal
          console.log('Showing org selection modal');
          setLinkedInOAuthData(result);
          setShowOrgSelectModal(true);
        } else {
          // No organizations - connect personal profile directly
          console.log('No organizations, connecting personal profile');
          completeLinkedIn.mutate({
            accessToken: result.accessToken,
            expiresIn: result.expiresIn,
            userProfile: result.userProfile,
          });
        }
      } catch {
        // Error is already handled by the mutation's onError
      }
    },
    [linkedInCallback, completeLinkedIn]
  );

  // Handle OAuth callback - extract code from URL
  useEffect(() => {
    // Prevent double-processing on re-renders
    if (oauthProcessedRef.current) return;

    const code = searchParams.get('code');
    const platform = searchParams.get('platform') as SocialPlatform | null;
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      oauthProcessedRef.current = true;
      // Clear URL params
      setSearchParams({});
      // Show error toast
      toast.error(errorDescription || `OAuth authorization failed: ${error}`);
      return;
    }

    if (code && platform) {
      oauthProcessedRef.current = true;
      // Clear URL params first
      setSearchParams({});

      if (platform === 'INSTAGRAM') {
        // Instagram: direct connection
        connectInstagram.mutate(code);
      } else if (platform === 'LINKEDIN') {
        // LinkedIn: use async handler
        handleLinkedInCallback(code);
      }
    }
  }, [searchParams, setSearchParams, connectInstagram, handleLinkedInCallback]);

  const handleSelectOrganization = useCallback(
    (organization?: LinkedInOrganization) => {
      if (!linkedInOAuthData) return;

      completeLinkedIn.mutate(
        {
          accessToken: linkedInOAuthData.accessToken,
          expiresIn: linkedInOAuthData.expiresIn,
          ...(organization ? { organization } : { userProfile: linkedInOAuthData.userProfile }),
        },
        {
          onSettled: () => {
            setShowOrgSelectModal(false);
            setLinkedInOAuthData(null);
          },
        }
      );
    },
    [linkedInOAuthData, completeLinkedIn]
  );

  const handleCloseOrgSelectModal = useCallback(() => {
    setShowOrgSelectModal(false);
    setLinkedInOAuthData(null);
    toast.error('LinkedIn connection cancelled');
  }, []);

  const handleCloseConnectModal = useCallback(() => {
    setShowConnectModal(false);
  }, []);

  // Group accounts by platform (memoized to avoid recalculation on every render)
  const instagramAccounts = useMemo(
    () => data?.data.filter((a) => a.platform === 'INSTAGRAM') ?? [],
    [data?.data]
  );
  const linkedinAccounts = useMemo(
    () => data?.data.filter((a) => a.platform === 'LINKEDIN') ?? [],
    [data?.data]
  );

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        role="status"
        aria-label="Loading social accounts"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12" role="alert">
        <p className="text-gray-500 mb-4">Failed to load social accounts</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  const hasAccounts = (data?.data.length ?? 0) > 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8"
        data-feedback-target="social-header"
        data-feedback-label="Social Accounts Header"
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
            Social Accounts
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Connect your Instagram and LinkedIn accounts to publish content
          </p>
        </div>
        {canConnect && (
          <Button
            variant="primary"
            onClick={() => setShowConnectModal(true)}
            className="w-full sm:w-auto"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Connect Account
          </Button>
        )}
      </div>

      {/* OAuth Pending State - hide when org selection modal is open */}
      {(connectInstagram.isPending || linkedInCallback.isPending || completeLinkedIn.isPending) &&
        !showOrgSelectModal && (
          <Alert variant="info" className="mb-6">
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span>Connecting account...</span>
            </div>
          </Alert>
        )}

      {/* Empty State */}
      {!hasAccounts && (
        <Empty
          title="No accounts connected"
          description="Connect your social media accounts to start scheduling and publishing content."
          action={
            canConnect ? (
              <Button variant="primary" onClick={() => setShowConnectModal(true)}>
                Connect Your First Account
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Account Lists */}
      {hasAccounts && (
        <div className="space-y-8">
          {/* Instagram Section */}
          {instagramAccounts.length > 0 && (
            <section
              data-feedback-target="social-instagram"
              data-feedback-label="Instagram Accounts"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-[#E4405F]">
                  <PlatformIcon platform="INSTAGRAM" className="w-5 h-5" />
                </span>
                Instagram
                <span className="text-sm font-normal text-gray-500">
                  ({instagramAccounts.length}{' '}
                  {instagramAccounts.length === 1 ? 'account' : 'accounts'})
                </span>
              </h2>
              <div className="space-y-4">
                {instagramAccounts.map((account) => (
                  <SocialAccountCard key={account.id} account={account} />
                ))}
              </div>
            </section>
          )}

          {/* LinkedIn Section */}
          {linkedinAccounts.length > 0 && (
            <section data-feedback-target="social-linkedin" data-feedback-label="LinkedIn Accounts">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-[#0A66C2]">
                  <PlatformIcon platform="LINKEDIN" className="w-5 h-5" />
                </span>
                LinkedIn
                <span className="text-sm font-normal text-gray-500">
                  ({linkedinAccounts.length}{' '}
                  {linkedinAccounts.length === 1 ? 'account' : 'accounts'})
                </span>
              </h2>
              <div className="space-y-4">
                {linkedinAccounts.map((account) => (
                  <SocialAccountCard key={account.id} account={account} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Connect Modal */}
      <ConnectAccountModal isOpen={showConnectModal} onClose={handleCloseConnectModal} />

      {/* LinkedIn Organization Selection Modal */}
      {showOrgSelectModal && linkedInOAuthData && (
        <LinkedInOrgSelectModal
          isOpen={showOrgSelectModal}
          onClose={handleCloseOrgSelectModal}
          onSelect={handleSelectOrganization}
          organizations={linkedInOAuthData.organizations}
          userProfile={linkedInOAuthData.userProfile}
          isLoading={completeLinkedIn.isPending}
        />
      )}
    </div>
  );
}

// LinkedIn Organization Selection Modal Component
interface LinkedInOrgSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (organization?: LinkedInOrganization) => void;
  organizations: LinkedInOrganization[];
  userProfile: { sub: string; name: string; picture?: string };
  isLoading: boolean;
}

function LinkedInOrgSelectModal({
  isOpen,
  onClose,
  onSelect,
  organizations,
  userProfile,
  isLoading,
}: LinkedInOrgSelectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select LinkedIn Account</h2>
          <p className="text-sm text-gray-600 mb-6">
            Choose which account you want to connect for posting content.
          </p>

          <div className="space-y-3">
            {/* Organization options */}
            {organizations.map((org) => (
              <button
                key={org.organizationUrn}
                type="button"
                onClick={() => onSelect(org)}
                disabled={isLoading}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                  {org.logoUrl ? (
                    <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
                  ) : (
                    <PlatformIcon platform="LINKEDIN" className="w-6 h-6 text-[#0A66C2]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{org.name}</h4>
                  <p className="text-sm text-gray-500">Company Page</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Organization
                </span>
              </button>
            ))}

            {/* Personal profile option */}
            <button
              type="button"
              onClick={() => onSelect(undefined)}
              disabled={isLoading}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {userProfile.picture ? (
                  <img
                    src={userProfile.picture}
                    alt={userProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{userProfile.name}</h4>
                <p className="text-sm text-gray-500">Personal Profile</p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Personal</span>
            </button>
          </div>

          {/* Cancel button */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
              <Spinner size="lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
