/**
 * MCP Pending Actions Indicator
 *
 * Shows a badge in the header when there are pending MCP actions.
 * Clicking opens a dropdown to view and approve/reject actions.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/Button';
import {
  useMCPPendingActionsCount,
  useMCPPendingActions,
  useApproveMCPAction,
  useRejectMCPAction,
} from '@/hooks/useMCP';

export function PendingActionsIndicator() {
  const { data: count = 0 } = useMCPPendingActionsCount();
  const { data: actionsData } = useMCPPendingActions();
  const approveMutation = useApproveMCPAction();
  const rejectMutation = useRejectMCPAction();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleApprove = useCallback(
    async (actionId: string) => {
      await approveMutation.mutateAsync(actionId);
    },
    [approveMutation]
  );

  const handleReject = useCallback(
    async (actionId: string) => {
      await rejectMutation.mutateAsync(actionId);
    },
    [rejectMutation]
  );

  // Don't render if no pending actions
  if (count === 0) {
    return null;
  }

  const actions = actionsData?.actions ?? [];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Badge Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-neutral-100 active:bg-neutral-200 transition-colors"
        aria-label={`${count} pending AI requests`}
        aria-expanded={isOpen}
      >
        <RobotIcon className="w-5 h-5 text-neutral-600" />
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold text-white bg-amber-500 rounded-full"
        >
          {count > 9 ? '9+' : count}
        </motion.span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
              <h3 className="font-medium text-neutral-900">Pending AI Requests</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {count} action{count !== 1 ? 's' : ''} require{count === 1 ? 's' : ''} your approval
              </p>
            </div>

            {/* Actions List */}
            <div className="max-h-80 overflow-y-auto">
              {actions.length === 0 ? (
                <div className="p-4 text-center text-neutral-500 text-sm">No pending actions</div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {actions.map((action) => (
                    <div key={action.id} className="p-4 hover:bg-neutral-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-amber-100 rounded-lg">
                          <ActionTypeIcon
                            type={action.actionType}
                            className="w-4 h-4 text-amber-600"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              {formatActionType(action.actionType)}
                            </span>
                            <span className="text-xs text-neutral-400">
                              {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-neutral-700 line-clamp-2">
                            {action.description}
                          </p>
                          <p className="mt-1 text-xs text-neutral-400">
                            Expires{' '}
                            {formatDistanceToNow(new Date(action.expiresAt), { addSuffix: true })}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleReject(action.id)}
                              disabled={rejectMutation.isPending || approveMutation.isPending}
                              className="flex-1"
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(action.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              className="flex-1"
                            >
                              Approve
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200">
              <a
                href="/settings?tab=mcp"
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Manage AI Assistants →
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatActionType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ActionTypeIcon({ type, className }: { type: string; className?: string }) {
  const iconClass = className ?? '';
  switch (type) {
    case 'schedule_post':
      return <CalendarIcon className={iconClass} />;
    case 'create_post':
    case 'update_post':
      return <PostIcon className={iconClass} />;
    default:
      return <RobotIcon className={iconClass} />;
  }
}

// Icons
function RobotIcon({ className }: { className?: string }) {
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
        d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M14.25 3.104c.251.023.501.05.75.082M19.8 14.5a2.25 2.25 0 0 0-1.549-1.414l-.013-.003a24.292 24.292 0 0 0-8.476 0l-.013.003A2.25 2.25 0 0 0 8.2 14.5m11.6 0 .013.005a2.25 2.25 0 0 1 1.44 1.592l.094.543a5.25 5.25 0 0 1-2.023 5.063l-2.907 2.178a2.25 2.25 0 0 1-2.634 0l-2.907-2.178a5.25 5.25 0 0 1-2.023-5.063l.094-.543a2.25 2.25 0 0 1 1.44-1.592l.013-.005M8.2 14.5 6 17.25m6-3.75v3.75m6-3.75 2.2 2.75M12 21v-3"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
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
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}

function PostIcon({ className }: { className?: string }) {
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
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}
