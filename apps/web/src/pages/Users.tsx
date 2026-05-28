/**
 * Social Planner - User Management Page
 *
 * Admin-only page for managing users, roles, and access.
 */

import { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import {
  useUsers,
  useUpdateUserRole,
  useDeleteUser,
  type User,
  type UseUsersOptions,
} from '@/hooks/useUsers';
import { useInvitations, useRevokeInvitation, useResendInvitation } from '@/hooks/useInvitations';
import { useUser } from '@/stores/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { Empty, ErrorState } from '@/components/ui/Empty';
import { ConfirmModal } from '@/components/ui/Modal';
import { InviteUserModal } from '@/components/users/InviteUserModal';
import type { InvitationSummary } from '@social-planner/shared';

type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
};

// Consistent outlined badge styles for all roles
const ROLE_STYLES: Record<UserRole, string> = {
  ADMIN: 'border border-red-300 text-red-700 bg-red-50',
  EDITOR: 'border border-blue-300 text-blue-700 bg-blue-50',
  VIEWER: 'border border-gray-300 text-gray-600 bg-gray-50',
};

// Role-based avatar colors for visual meaning
const ROLE_AVATAR_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-red-500',
  EDITOR: 'bg-blue-500',
  VIEWER: 'bg-gray-500',
};

export function Users() {
  const currentUser = useUser();

  // Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Debounce search
  const debouncedSearch = useDebounce(search, 300);

  // Modal state
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [revokeInvitation, setRevokeInvitation] = useState<InvitationSummary | null>(null);

  // Query options
  const queryOptions: UseUsersOptions = {
    page,
    perPage,
    search: debouncedSearch || undefined,
    role: roleFilter || undefined,
  };

  // Queries and mutations
  const { data, isLoading, isError, refetch } = useUsers(queryOptions);
  const updateRoleMutation = useUpdateUserRole();
  const deleteMutation = useDeleteUser();

  // Invitation queries and mutations
  const { data: invitationsData } = useInvitations({ status: 'PENDING', limit: 50 });
  const revokeMutation = useRevokeInvitation();
  const resendMutation = useResendInvitation();

  // Handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on search
  }, []);

  const handleRoleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value as UserRole | '');
    setPage(1);
  }, []);

  const handleRoleChange = useCallback(
    (userId: string, newRole: UserRole) => {
      updateRoleMutation.mutate({ userId, role: newRole });
    },
    [updateRoleMutation]
  );

  const handleDeleteClick = useCallback((user: User) => {
    setDeleteUser(user);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteUser) {
      deleteMutation.mutate(deleteUser.id, {
        onSettled: () => setDeleteUser(null),
      });
    }
  }, [deleteUser, deleteMutation]);

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setRoleFilter('');
    setPage(1);
  }, []);

  const handleRevokeClick = useCallback((invitation: InvitationSummary) => {
    setRevokeInvitation(invitation);
  }, []);

  const handleConfirmRevoke = useCallback(() => {
    if (revokeInvitation) {
      revokeMutation.mutate(revokeInvitation.id, {
        onSettled: () => setRevokeInvitation(null),
      });
    }
  }, [revokeInvitation, revokeMutation]);

  const handleResend = useCallback(
    (invitationId: string) => {
      resendMutation.mutate(invitationId);
    },
    [resendMutation]
  );

  // Pagination
  const totalPages = data?.pagination?.totalPages ?? 1;
  const hasFilters = search || roleFilter;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div
        className="mb-6 sm:mb-8"
        data-feedback-target="users-header"
        data-feedback-label="User Management Header"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
              Users
            </h1>
            <p className="text-sm text-neutral-500 mt-1">Manage users, roles, and access</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {data?.pagination?.total ?? 0} {data?.pagination?.total === 1 ? 'user' : 'users'}
            </span>
            <Button onClick={() => setShowInviteModal(true)}>
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Invite User
            </Button>
          </div>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitationsData?.invitations && invitationsData.invitations.length > 0 && (
        <div
          className="mb-8"
          data-feedback-target="users-invitations"
          data-feedback-label="Pending Invitations"
        >
          <h2 className="text-sm font-medium text-neutral-700 mb-3">
            Pending Invitations ({invitationsData.invitations.length})
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
            <div className="divide-y divide-amber-200">
              {invitationsData.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-amber-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{invitation.email}</p>
                      <p className="text-xs text-neutral-500">
                        Invited as {ROLE_LABELS[invitation.role as UserRole]} ·{' '}
                        {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
                        {invitation.expiresAt && (
                          <span className="text-amber-600">
                            {' '}
                            · Expires{' '}
                            {formatDistanceToNow(new Date(invitation.expiresAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <button
                      onClick={() => handleResend(invitation.id)}
                      disabled={resendMutation.isPending}
                      className="text-xs text-primary-600 hover:text-primary-700 hover:underline disabled:opacity-50 min-h-[44px] px-2"
                    >
                      Resend
                    </button>
                    <button
                      onClick={() => handleRevokeClick(invitation)}
                      className="text-xs text-red-600 hover:text-red-700 hover:underline min-h-[44px] px-2"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6"
        data-feedback-target="users-filters"
        data-feedback-label="User Filters"
      >
        <div className="flex-1 sm:max-w-sm">
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        <Select value={roleFilter} onChange={handleRoleFilterChange} className="w-full sm:w-40">
          <option value="">All roles</option>
          <option value="ADMIN">Admin</option>
          <option value="EDITOR">Editor</option>
          <option value="VIEWER">Viewer</option>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load users"
          message="An error occurred while loading the user list."
          onRetry={() => refetch()}
        />
      ) : !data?.items?.length ? (
        <Empty
          title="No users found"
          {...(hasFilters && { description: 'Try adjusting your search or filters' })}
          action={
            hasFilters ? (
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Users List */}
          <div
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            data-feedback-target="users-list"
            data-feedback-label="User List"
          >
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {data.items.map((user) => {
                const isCurrentUser = user.id === currentUser?.id;
                const canChangeRole = !isCurrentUser;
                const canDelete = !isCurrentUser;

                return (
                  <div key={user.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={user.avatarUrl}
                          name={user.fullName}
                          size="sm"
                          bgColor={ROLE_AVATAR_COLORS[user.role as UserRole]}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{user.fullName}</span>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      {canChangeRole ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          disabled={updateRoleMutation.isPending}
                          className={clsx(
                            'appearance-none py-1 px-2 rounded-lg text-xs font-medium text-center cursor-pointer',
                            'focus:outline-none focus:ring-1',
                            ROLE_STYLES[user.role as UserRole]
                          )}
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="EDITOR">Editor</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      ) : (
                        <RoleBadge role={user.role} />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        {user.lastLoginAt
                          ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
                          : 'Never logged in'}
                        {' · '}
                        Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                      </span>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteClick(user)}
                          className="text-red-600 hover:text-red-700 min-h-[44px] px-2"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <table className="min-w-full divide-y divide-gray-200 hidden md:table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.items.map((user) => {
                  const isCurrentUser = user.id === currentUser?.id;
                  const canChangeRole = !isCurrentUser;
                  const canDelete = !isCurrentUser;

                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      {/* User */}
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={user.avatarUrl}
                            name={user.fullName}
                            size="sm"
                            bgColor={ROLE_AVATAR_COLORS[user.role as UserRole]}
                          />
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{user.fullName}</span>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 whitespace-nowrap align-middle text-sm text-gray-500">
                        {user.email}
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        {canChangeRole ? (
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                            disabled={updateRoleMutation.isPending}
                            className={clsx(
                              'appearance-none w-28 py-1 px-2 rounded-lg text-xs font-medium text-center cursor-pointer',
                              'focus:outline-none focus:ring-1',
                              ROLE_STYLES[user.role as UserRole]
                            )}
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="EDITOR">Editor</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                        ) : (
                          <RoleBadge role={user.role} />
                        )}
                      </td>

                      {/* Activity */}
                      <td className="px-6 py-4 whitespace-nowrap align-middle text-sm">
                        <div className="flex flex-col">
                          <span className="text-gray-900">
                            {user.lastLoginAt
                              ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
                              : 'Never logged in'}
                          </span>
                          <span className="text-gray-400 text-xs">
                            Joined{' '}
                            {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap align-middle text-right text-sm">
                        {canDelete ? (
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="text-sm text-red-600 hover:text-red-700 hover:underline"
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              data-feedback-target="users-pagination"
              data-feedback-label="User Pagination"
            >
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="min-h-[44px] flex-1 sm:flex-initial"
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="min-h-[44px] flex-1 sm:flex-initial"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleConfirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteUser?.fullName}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Invite User Modal */}
      <InviteUserModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />

      {/* Revoke Invitation Confirmation Modal */}
      <ConfirmModal
        isOpen={!!revokeInvitation}
        onClose={() => setRevokeInvitation(null)}
        onConfirm={handleConfirmRevoke}
        title="Revoke Invitation"
        message={`Are you sure you want to revoke the invitation for ${revokeInvitation?.email}? They will no longer be able to join using this invitation.`}
        confirmLabel="Revoke"
        variant="danger"
        isLoading={revokeMutation.isPending}
      />
    </div>
  );
}

// Role Badge component - styled to match Select dropdowns
function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center w-28 py-1 px-2 rounded-lg text-xs font-medium',
        ROLE_STYLES[role]
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
