/**
 * User Management Component
 *
 * Admin interface for managing users: list, search, role changes, deletion.
 */

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Empty } from '@/components/ui/Empty';
import { Alert } from '@/components/ui/Alert';
import {
  useUsers,
  useUpdateUserRole,
  useDeleteUser,
  type UserListItem,
  type UserListFilters,
} from '@/hooks/useSettings';
import { useDebounce } from '@/hooks/useDebounce';
import { useUser } from '@/stores/authStore';
import { format } from 'date-fns';
import type { UserRole } from '@/stores/authStore';

const ROLES: { value: UserRole | ''; label: string }[] = [
  { value: '', label: 'All Roles' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'VIEWER', label: 'Viewer' },
];

export function UserManagement() {
  const currentUser = useUser();

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const debouncedSearch = useDebounce(searchInput, 300);

  const filters = useMemo((): UserListFilters => {
    const f: UserListFilters = { page, perPage };
    if (debouncedSearch) f.search = debouncedSearch;
    if (roleFilter) f.role = roleFilter;
    return f;
  }, [page, perPage, debouncedSearch, roleFilter]);

  const { data, isLoading, isError, refetch } = useUsers(filters);
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  // Modal state
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [modalType, setModalType] = useState<'role' | 'delete' | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('VIEWER');

  const handleOpenRoleModal = useCallback((user: UserListItem) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setModalType('role');
  }, []);

  const handleOpenDeleteModal = useCallback((user: UserListItem) => {
    setSelectedUser(user);
    setModalType('delete');
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedUser(null);
    setModalType(null);
  }, []);

  const handleUpdateRole = useCallback(async () => {
    if (!selectedUser) return;
    await updateRole.mutateAsync({ userId: selectedUser.id, role: newRole });
    handleCloseModal();
  }, [selectedUser, newRole, updateRole, handleCloseModal]);

  const handleDeleteUser = useCallback(async () => {
    if (!selectedUser) return;
    await deleteUser.mutateAsync(selectedUser.id);
    handleCloseModal();
  }, [selectedUser, deleteUser, handleCloseModal]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setPage(1);
  }, []);

  const handleRoleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value as UserRole | '');
    setPage(1);
  }, []);

  const getRoleBadgeVariant = (role: UserRole): 'danger' | 'warning' | 'info' => {
    switch (role) {
      case 'ADMIN':
        return 'danger';
      case 'EDITOR':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getAuthProviderLabel = (provider: string): string => {
    switch (provider) {
      case 'GOOGLE':
        return 'Google';
      case 'MICROSOFT':
        return 'Microsoft';
      default:
        return 'Local';
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        role="status"
        aria-label="Loading users"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8" role="alert">
        <p className="text-gray-500 mb-4">Failed to load users</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="user-search" className="sr-only">
            Search users
          </label>
          <Input
            id="user-search"
            type="search"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>
        <div className="w-full sm:w-48">
          <label htmlFor="role-filter" className="sr-only">
            Filter by role
          </label>
          <Select id="role-filter" value={roleFilter} onChange={handleRoleFilterChange}>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Users List */}
      {data && data.data.length === 0 ? (
        <Empty
          title="No users found"
          description={
            debouncedSearch || roleFilter
              ? 'Try adjusting your search or filters'
              : 'No users in the system'
          }
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {data?.data.map((user) => (
              <div key={user.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={user.fullName} src={user.avatarUrl} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.fullName}
                        {user.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-gray-400">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {getAuthProviderLabel(user.authProvider)} · Joined{' '}
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenRoleModal(user)}
                    disabled={user.id === currentUser?.id}
                    aria-label={`Change role for ${user.fullName}`}
                  >
                    Change Role
                  </Button>
                  {user.id !== currentUser?.id && user.role !== 'ADMIN' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDeleteModal(user)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      aria-label={`Delete ${user.fullName}`}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <table className="w-full hidden md:table">
            <caption className="sr-only">
              Users list with name, role, authentication method, and join date
            </caption>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  User
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Auth
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Joined
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.data.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.fullName} src={user.avatarUrl} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.fullName}
                          {user.id === currentUser?.id && (
                            <span className="ml-2 text-xs text-gray-400">(you)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getAuthProviderLabel(user.authProvider)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenRoleModal(user)}
                        disabled={user.id === currentUser?.id}
                        aria-label={`Change role for ${user.fullName}`}
                      >
                        Change Role
                      </Button>
                      {user.id !== currentUser?.id && user.role !== 'ADMIN' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeleteModal(user)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label={`Delete ${user.fullName}`}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * perPage + 1} to{' '}
                {Math.min(page * perPage, data.pagination.total)} of {data.pagination.total} users
              </p>
              <nav className="flex items-center gap-2" aria-label="Pagination">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {data.pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!data.pagination.hasMore}
                  aria-label="Next page"
                >
                  Next
                </Button>
              </nav>
            </div>
          )}
        </div>
      )}

      {/* Role Change Modal */}
      <Modal
        isOpen={modalType === 'role' && !!selectedUser}
        onClose={handleCloseModal}
        title="Change User Role"
        size="sm"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Avatar name={selectedUser.fullName} src={selectedUser.avatarUrl} size="md" />
              <div>
                <p className="font-medium text-gray-900">{selectedUser.fullName}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            </div>

            {selectedUser.id === currentUser?.id && (
              <Alert variant="warning">You cannot change your own role.</Alert>
            )}

            <div>
              <label htmlFor="new-role" className="block text-sm font-medium text-gray-700 mb-1">
                New Role
              </label>
              <Select
                id="new-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                disabled={selectedUser.id === currentUser?.id}
              >
                <option value="ADMIN">Admin - Full access to all features</option>
                <option value="EDITOR">Editor - Can create and edit content</option>
                <option value="VIEWER">Viewer - Read-only access</option>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={handleCloseModal} disabled={updateRole.isPending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateRole}
                isLoading={updateRole.isPending}
                disabled={selectedUser.id === currentUser?.id || selectedUser.role === newRole}
              >
                Update Role
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modalType === 'delete' && !!selectedUser}
        onClose={handleCloseModal}
        title="Delete User"
        size="sm"
      >
        {selectedUser && (
          <div className="space-y-4">
            <Alert variant="error">
              This action cannot be undone. All of this user's content will be permanently deleted.
            </Alert>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Avatar name={selectedUser.fullName} src={selectedUser.avatarUrl} size="md" />
              <div>
                <p className="font-medium text-gray-900">{selectedUser.fullName}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={handleCloseModal} disabled={deleteUser.isPending}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteUser} isLoading={deleteUser.isPending}>
                Delete User
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
