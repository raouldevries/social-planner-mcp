/**
 * Version History Modal Component
 *
 * Displays post version history with preview and restore functionality.
 * Two-column layout: content preview on left, version list on right.
 *
 * Design: Apple-inspired using the standard Modal component with
 * Motion animations for smooth interactions.
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { usePostVersions, useRestoreVersion, type PostVersionSummary } from '@/hooks/useVersions';

// Clock icon component
function ClockIcon({ className }: { className?: string }) {
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
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

interface VersionHistoryModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore?: () => void;
}

export function VersionHistoryModal({
  postId,
  isOpen,
  onClose,
  onRestore,
}: VersionHistoryModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<PostVersionSummary | null>(null);

  const { data: versions, isLoading, isError } = usePostVersions(isOpen ? postId : undefined);
  const restoreVersion = useRestoreVersion(postId);

  // Select latest version by default when versions load
  useEffect(() => {
    if (versions && versions.length > 0 && !selectedVersion) {
      setSelectedVersion(versions[0] ?? null);
    }
  }, [versions, selectedVersion]);

  // Reset selected version when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedVersion(null);
    }
  }, [isOpen]);

  const handleRestore = async () => {
    if (!selectedVersion || selectedVersion.isCurrent) return;

    try {
      await restoreVersion.mutateAsync(selectedVersion.id);
      onRestore?.();
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  const hasVersions = versions && versions.length > 0;
  const canRestore = selectedVersion && !selectedVersion.isCurrent;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      title="Version history"
      {...(hasVersions && { description: 'Select a version to preview or restore' })}
      footer={
        hasVersions ? (
          <Button
            variant="primary"
            onClick={handleRestore}
            disabled={!canRestore || restoreVersion.isPending}
            isLoading={restoreVersion.isPending}
          >
            Restore version
          </Button>
        ) : undefined
      }
    >
      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <EmptyState
            icon={<ClockIcon className="w-10 h-10 text-neutral-300" />}
            title="Failed to load versions"
            description="There was a problem loading the version history. Please try again."
          />
        ) : !hasVersions ? (
          <EmptyState
            icon={<ClockIcon className="w-10 h-10 text-neutral-300" />}
            title="No version history"
            description="Versions are saved automatically when you save changes to this post."
          />
        ) : (
          <div className="flex gap-6 h-[400px]">
            {/* Content Preview - Left Column */}
            <div className="flex-[3] overflow-y-auto">
              {selectedVersion ? (
                <motion.div
                  key={selectedVersion.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Version content preview */}
                  <div className="bg-neutral-50 rounded-xl p-5 min-h-[280px] border border-neutral-100">
                    {selectedVersion.content ? (
                      <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                        {selectedVersion.content}
                      </p>
                    ) : (
                      <p className="text-sm text-neutral-400 italic">No content in this version</p>
                    )}
                  </div>

                  {/* Note about media */}
                  <p className="text-xs text-neutral-400 text-center">
                    Media attachments are not included in version history
                  </p>
                </motion.div>
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-400">
                  Select a version to preview
                </div>
              )}
            </div>

            {/* Version List - Right Column */}
            <div className="flex-[2] overflow-y-auto border-l border-neutral-100 pl-6">
              <div className="space-y-2">
                {versions.map((version, index) => (
                  <VersionListItem
                    key={version.id}
                    version={version}
                    isSelected={selectedVersion?.id === version.id}
                    onClick={() => setSelectedVersion(version)}
                    index={index}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ============================================
// EMPTY STATE
// ============================================

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center h-[400px] text-center px-8"
    >
      <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-medium text-neutral-900 mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-xs leading-relaxed">{description}</p>
    </motion.div>
  );
}

// ============================================
// VERSION LIST ITEM
// ============================================

interface VersionListItemProps {
  version: PostVersionSummary;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

function VersionListItem({ version, isSelected, onClick, index }: VersionListItemProps) {
  const formattedDate = new Date(version.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.button
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      onClick={onClick}
      className={clsx(
        'w-full text-left p-3 rounded-xl transition-all duration-150',
        isSelected
          ? 'bg-primary-50 ring-2 ring-primary-500 ring-inset'
          : 'bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={version.createdBy.fullName} src={version.createdBy.avatarUrl} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-900">{formattedDate}</span>
            {version.isCurrent && (
              <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                Current
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">{version.createdBy.fullName}</p>
        </div>
      </div>
    </motion.button>
  );
}
