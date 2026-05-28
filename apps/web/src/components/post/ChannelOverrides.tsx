/**
 * Channel Overrides
 *
 * Allows per-channel content customization. Each channel can optionally
 * override the base post content (e.g., remove URLs for Instagram).
 */

import { useCallback, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { SOCIAL_PLATFORM, PLATFORM_LIMITS, type SocialAccountSummary } from '@social-planner/shared';
import { PlatformIcon } from '@/components/social-accounts/PlatformIcon';
import { getPlatformColor } from '@/hooks/useSocialAccounts';

interface ChannelOverridesProps {
  selectedAccounts: SocialAccountSummary[];
  baseContent: string;
  overrides: Record<string, string>;
  onOverrideChange: (accountId: string, content: string | null) => void;
  disabled?: boolean;
}

function getCharLimit(platform: string): number | undefined {
  if (platform === SOCIAL_PLATFORM.INSTAGRAM) return PLATFORM_LIMITS.INSTAGRAM.textMaxLength;
  if (platform === SOCIAL_PLATFORM.LINKEDIN) return PLATFORM_LIMITS.LINKEDIN.textMaxLength;
  return undefined;
}

export function ChannelOverrides({
  selectedAccounts,
  baseContent,
  overrides,
  onOverrideChange,
  disabled = false,
}: ChannelOverridesProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-neutral-900">Channel content</h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Customize the text for individual channels
        </p>
      </div>

      <div className="space-y-2">
        {selectedAccounts.map((account) => (
          <ChannelOverrideRow
            key={account.id}
            account={account}
            baseContent={baseContent}
            customContent={overrides[account.id] ?? null}
            onContentChange={(content) => onOverrideChange(account.id, content)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

interface ChannelOverrideRowProps {
  account: SocialAccountSummary;
  baseContent: string;
  customContent: string | null;
  onContentChange: (content: string | null) => void;
  disabled: boolean;
}

function ChannelOverrideRow({
  account,
  baseContent,
  customContent,
  onContentChange,
  disabled,
}: ChannelOverrideRowProps) {
  const hasOverride = customContent !== null;
  const charLimit = getCharLimit(account.platform);

  const handleCustomize = useCallback(() => {
    onContentChange(baseContent);
  }, [baseContent, onContentChange]);

  const handleReset = useCallback(() => {
    onContentChange(null);
  }, [onContentChange]);

  return (
    <div
      className={clsx(
        'rounded-lg border transition-colors',
        hasOverride ? 'border-neutral-300 bg-white' : 'border-neutral-200 bg-neutral-50'
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: getPlatformColor(account.platform) }}
        >
          <PlatformIcon platform={account.platform} className="w-3.5 h-3.5 text-white" />
        </div>

        <span className="text-sm text-neutral-700 flex-1 truncate">{account.accountName}</span>

        {hasOverride ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Customized
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                title="Reset to default content"
              >
                <ResetIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          !disabled && (
            <button
              type="button"
              onClick={handleCustomize}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Customize
            </button>
          )
        )}
      </div>

      {/* Editor area */}
      {hasOverride && (
        <div className="px-3 pb-3">
          <AutoGrowTextarea
            value={customContent}
            onChange={onContentChange}
            charLimit={charLimit}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

interface AutoGrowTextareaProps {
  value: string;
  onChange: (value: string) => void;
  charLimit: number | undefined;
  disabled: boolean;
}

function AutoGrowTextarea({ value, onChange, charLimit, disabled }: AutoGrowTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const charCount = value.length;
  const isOverLimit = charLimit !== undefined && charCount > charLimit;

  // Auto-grow the textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={3}
        className={clsx(
          'w-full resize-none rounded-md border px-3 py-2 text-sm leading-relaxed',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
          'transition-colors placeholder:text-neutral-400',
          isOverLimit ? 'border-red-300' : 'border-neutral-200',
          disabled && 'opacity-50 cursor-not-allowed bg-neutral-50'
        )}
        placeholder="Enter custom content for this channel..."
      />
      {charLimit !== undefined && (
        <div className="flex justify-end mt-1">
          <span
            className={clsx(
              'text-xs tabular-nums',
              isOverLimit ? 'text-red-500 font-medium' : 'text-neutral-400'
            )}
          >
            {charCount.toLocaleString()} / {charLimit.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
