/**
 * Security Settings Component
 *
 * Password change and account deletion functionality.
 */

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import {
  useProfile,
  useChangePassword,
  useDeleteAccount,
} from '@/hooks/useSettings';

// ============================================
// PASSWORD CHANGE
// ============================================

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

function PasswordChangeSection() {
  const { data: profile } = useProfile();
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = useCallback(
    async (data: PasswordFormData) => {
      await changePassword.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      reset();
    },
    [changePassword, reset]
  );

  // Only show for local auth users
  if (profile?.authProvider !== 'LOCAL') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Password</h3>
        <Alert variant="info">
          You signed in with {profile?.authProvider === 'GOOGLE' ? 'Google' : 'Microsoft'}.
          Password management is handled by your identity provider.
        </Alert>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Current Password"
          required
          error={errors.currentPassword?.message}
          htmlFor="current-password"
        >
          <Input
            {...register('currentPassword')}
            id="current-password"
            type="password"
            autoComplete="current-password"
            error={!!errors.currentPassword}
          />
        </FormField>

        <FormField
          label="New Password"
          required
          hint="Minimum 8 characters"
          error={errors.newPassword?.message}
          htmlFor="new-password"
        >
          <Input
            {...register('newPassword')}
            id="new-password"
            type="password"
            autoComplete="new-password"
            error={!!errors.newPassword}
          />
        </FormField>

        <FormField
          label="Confirm New Password"
          required
          error={errors.confirmPassword?.message}
          htmlFor="confirm-password"
        >
          <Input
            {...register('confirmPassword')}
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            error={!!errors.confirmPassword}
          />
        </FormField>

        <Button
          type="submit"
          variant="primary"
          isLoading={changePassword.isPending}
        >
          Update Password
        </Button>
      </form>
    </div>
  );
}

// ============================================
// ACCOUNT DELETION
// ============================================

const deleteLocalSchema = z.object({
  password: z.string().min(1, 'Password is required to delete your account'),
});

const deleteOAuthSchema = z.object({
  email: z.string().email('Please enter your email address to confirm'),
});

type DeleteLocalFormData = z.infer<typeof deleteLocalSchema>;
type DeleteOAuthFormData = z.infer<typeof deleteOAuthSchema>;

function AccountDeletionSection() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const deleteAccount = useDeleteAccount();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isLocalAuth = profile?.authProvider === 'LOCAL';

  const localForm = useForm<DeleteLocalFormData>({
    resolver: zodResolver(deleteLocalSchema),
    defaultValues: { password: '' },
  });

  const oauthForm = useForm<DeleteOAuthFormData>({
    resolver: zodResolver(deleteOAuthSchema),
    defaultValues: { email: '' },
  });

  const handleDelete = useCallback(async () => {
    if (isLocalAuth) {
      const isValid = await localForm.trigger();
      if (!isValid) return;

      const data = localForm.getValues();
      await deleteAccount.mutateAsync({ password: data.password });
    } else {
      const isValid = await oauthForm.trigger();
      if (!isValid) return;

      const data = oauthForm.getValues();
      if (data.email !== profile?.email) {
        oauthForm.setError('email', { message: 'Email does not match your account' });
        return;
      }

      await deleteAccount.mutateAsync({ email: data.email });
    }

    setShowDeleteModal(false);
    navigate('/login');
  }, [isLocalAuth, localForm, oauthForm, profile, deleteAccount, navigate]);

  const handleCloseModal = useCallback(() => {
    setShowDeleteModal(false);
    localForm.reset();
    oauthForm.reset();
  }, [localForm, oauthForm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32" role="status" aria-label="Loading account settings">
        <Spinner size="md" />
      </div>
    );
  }

  // Admins cannot delete their own accounts
  if (profile?.role === 'ADMIN') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Account</h3>
        <Alert variant="warning">
          As an administrator, you cannot delete your own account.
          Contact another administrator if you need to leave the organization.
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete your account, there is no going back. All your posts, articles,
          and uploaded media will be permanently removed.
        </p>
        <Button
          variant="danger"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete My Account
        </Button>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={handleCloseModal}
        title="Delete Account"
        size="sm"
      >
        <div className="space-y-4">
          <Alert variant="error">
            This action is permanent and cannot be undone.
          </Alert>

          {isLocalAuth ? (
            <FormField
              label="Enter your password to confirm"
              required
              error={localForm.formState.errors.password?.message}
            >
              <Input
                {...localForm.register('password')}
                type="password"
                placeholder="Your password"
                error={!!localForm.formState.errors.password}
              />
            </FormField>
          ) : (
            <FormField
              label={`Type "${profile?.email}" to confirm`}
              required
              error={oauthForm.formState.errors.email?.message}
            >
              <Input
                {...oauthForm.register('email')}
                type="email"
                placeholder="your@email.com"
                error={!!oauthForm.formState.errors.email}
              />
            </FormField>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={handleCloseModal}
              disabled={deleteAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteAccount.isPending}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SecuritySettings() {
  return (
    <div className="space-y-6">
      <PasswordChangeSection />
      <AccountDeletionSection />
    </div>
  );
}
