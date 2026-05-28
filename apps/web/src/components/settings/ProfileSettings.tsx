/**
 * Profile Settings Component
 *
 * Form for editing user profile information.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import {
  useProfile,
  useUpdateProfile,
  useUserStats,
  getTimezones,
  type UpdateProfileData,
} from '@/hooks/useSettings';
import { formatDistanceToNow } from 'date-fns';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  timezone: z.string().min(1, 'Timezone is required'),
  avatarUrl: z.string().url('Invalid URL').nullable().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileSettings() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const updateProfile = useUpdateProfile();

  const [showAvatarInput, setShowAvatarInput] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      timezone: 'UTC',
      avatarUrl: null,
    },
  });

  // Reset form when profile data loads
  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName,
        timezone: profile.timezone,
        avatarUrl: profile.avatarUrl,
      });
    }
  }, [profile, reset]);

  // Memoize timezones to avoid recreation
  const timezones = useMemo(() => getTimezones(), []);

  const handleCancel = useCallback(() => {
    if (profile) {
      reset({
        fullName: profile.fullName,
        timezone: profile.timezone,
        avatarUrl: profile.avatarUrl,
      });
    }
    setShowAvatarInput(false);
  }, [profile, reset]);

  const onSubmit = useCallback(
    async (data: ProfileFormData) => {
      const updateData: UpdateProfileData = {
        fullName: data.fullName,
        timezone: data.timezone,
      };

      // Only include avatarUrl if it was changed
      if (showAvatarInput) {
        updateData.avatarUrl = data.avatarUrl || null;
      }

      await updateProfile.mutateAsync(updateData);
      setShowAvatarInput(false);
    },
    [updateProfile, showAvatarInput]
  );

  const getAuthProviderLabel = (provider: string): string => {
    switch (provider) {
      case 'GOOGLE':
        return 'Google';
      case 'MICROSOFT':
        return 'Microsoft';
      default:
        return 'Email & Password';
    }
  };

  const getAuthProviderVariant = (provider: string): 'info' | 'success' | 'warning' => {
    switch (provider) {
      case 'GOOGLE':
        return 'success';
      case 'MICROSOFT':
        return 'info';
      default:
        return 'warning';
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading profile">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8 text-gray-500" role="alert">
        Failed to load profile
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="flex items-start gap-6">
        <div className="relative">
          <Avatar
            name={profile.fullName}
            src={profile.avatarUrl}
            size="xl"
          />
          <button
            type="button"
            onClick={() => setShowAvatarInput(!showAvatarInput)}
            className="absolute -bottom-1 -right-1 p-1.5 bg-white rounded-full border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
            aria-label="Change avatar"
          >
            <CameraIcon className="w-4 h-4 text-gray-600" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">{profile.fullName}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{profile.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={profile.role === 'ADMIN' ? 'danger' : profile.role === 'EDITOR' ? 'warning' : 'info'}>
              {profile.role}
            </Badge>
            <Badge variant={getAuthProviderVariant(profile.authProvider)}>
              {getAuthProviderLabel(profile.authProvider)}
            </Badge>
          </div>
          {profile.createdAt && (
            <p className="text-xs text-gray-400 mt-2">
              Member since {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Posts Created" value={stats.postsCreated} />
          <StatCard label="Articles Written" value={stats.articlesCreated} />
          <StatCard label="Media Uploaded" value={stats.mediaUploaded} />
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {showAvatarInput && (
          <FormField
            label="Avatar URL"
            hint="Enter a URL to an image for your profile picture"
            error={errors.avatarUrl?.message}
          >
            <Input
              {...register('avatarUrl')}
              type="url"
              placeholder="https://example.com/avatar.jpg"
              error={!!errors.avatarUrl}
            />
          </FormField>
        )}

        <FormField
          label="Full Name"
          required
          error={errors.fullName?.message}
        >
          <Input
            {...register('fullName')}
            placeholder="Your full name"
            error={!!errors.fullName}
          />
        </FormField>

        <FormField
          label="Email Address"
          hint="Contact an administrator to change your email"
        >
          <Input
            value={profile.email}
            disabled
            className="bg-gray-50"
          />
        </FormField>

        <FormField
          label="Timezone"
          required
          error={errors.timezone?.message}
        >
          <Select
            {...register('timezone')}
            error={!!errors.timezone}
          >
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <Button
            type="submit"
            variant="primary"
            isLoading={updateProfile.isPending}
            disabled={!isDirty && !showAvatarInput}
          >
            Save Changes
          </Button>
          {(isDirty || showAvatarInput) && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={updateProfile.isPending}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
      />
    </svg>
  );
}
