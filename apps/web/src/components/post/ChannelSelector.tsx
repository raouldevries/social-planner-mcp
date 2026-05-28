/**
 * Channel Selector
 *
 * Component for selecting social media channels (accounts) to publish to.
 * Apple-style toggle switches with refined styling.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { SOCIAL_PLATFORM, type SocialAccountSummary } from '@social-planner/shared';
import { getPlatformColor } from '@/hooks/useSocialAccounts';
import { PlatformIcon } from '@/components/social-accounts/PlatformIcon';

interface ChannelSelectorProps {
  accounts: SocialAccountSummary[];
  selectedAccountIds: string[];
  onSelectionChange: (accountIds: string[]) => void;
  disabled?: boolean;
}

export function ChannelSelector({
  accounts,
  selectedAccountIds,
  onSelectionChange,
  disabled = false,
}: ChannelSelectorProps) {
  const instagramAccounts = accounts.filter((a) => a.platform === SOCIAL_PLATFORM.INSTAGRAM);
  const linkedInAccounts = accounts.filter((a) => a.platform === SOCIAL_PLATFORM.LINKEDIN);

  const handleToggle = (accountId: string) => {
    if (selectedAccountIds.includes(accountId)) {
      onSelectionChange(selectedAccountIds.filter((id) => id !== accountId));
    } else {
      onSelectionChange([...selectedAccountIds, accountId]);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No social accounts connected.
        <br />
        <Link to="/accounts" className="text-blue-600 hover:underline">
          Connect an account
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {instagramAccounts.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">
            Instagram
          </p>
          <div className="space-y-2">
            {instagramAccounts.map((account) => (
              <AccountItem
                key={account.id}
                account={account}
                isSelected={selectedAccountIds.includes(account.id)}
                onToggle={() => handleToggle(account.id)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}

      {linkedInAccounts.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">
            LinkedIn
          </p>
          <div className="space-y-2">
            {linkedInAccounts.map((account) => (
              <AccountItem
                key={account.id}
                account={account}
                isSelected={selectedAccountIds.includes(account.id)}
                onToggle={() => handleToggle(account.id)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AccountItemProps {
  account: SocialAccountSummary;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function AccountItem({ account, isSelected, onToggle, disabled }: AccountItemProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={clsx(
        'flex items-center gap-3 py-3 cursor-pointer transition-colors',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={!disabled ? onToggle : undefined}
    >
      {/* Avatar with connection status */}
      <div className="relative flex-shrink-0">
        {account.profileImageUrl && !imageError ? (
          <img
            src={account.profileImageUrl}
            alt={account.accountName}
            className="w-9 h-9 rounded-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: getPlatformColor(account.platform) }}
          >
            <PlatformIcon platform={account.platform} className="w-5 h-5 text-white" />
          </div>
        )}
        {/* Connection status dot - green for connected */}
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
      </div>

      {/* Account info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate max-w-[140px]">{account.accountName}</p>
        {account.accountType && (
          <p className="text-xs text-gray-400 capitalize">{account.accountType.toLowerCase()}</p>
        )}
      </div>

      {/* Toggle switch */}
      <ToggleSwitch checked={isSelected} disabled={disabled} />
    </div>
  );
}

// Apple-style toggle switch
interface ToggleSwitchProps {
  checked: boolean;
  disabled?: boolean | undefined;
}

function ToggleSwitch({ checked, disabled }: ToggleSwitchProps) {
  return (
    <div
      className={clsx(
        'relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
        checked ? 'bg-blue-500' : 'bg-gray-200',
        disabled && 'opacity-50'
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </div>
  );
}
