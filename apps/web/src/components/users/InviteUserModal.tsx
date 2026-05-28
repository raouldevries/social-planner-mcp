/**
 * Invite User Modal
 *
 * Modal dialog for admin to invite a new user by email.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreateInvitation } from '@/hooks/useInvitations';

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['EDITOR', 'VIEWER']).default('EDITOR'),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
  const createInvitation = useCreateInvitation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'EDITOR',
    },
  });

  const onSubmit = (data: InviteFormData) => {
    createInvitation.mutate(data, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="sm"
      title="Invite User"
      description="Send an invitation email to add a new user to the workspace."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={createInvitation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="invite-form" isLoading={createInvitation.isPending}>
            Send Invitation
          </Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
            Email address
          </label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            {...register('email')}
            error={!!errors.email}
          />
          {errors.email?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-neutral-700 mb-1">
            Role
          </label>
          <Select id="role" {...register('role')}>
            <option value="EDITOR">Editor - Can create and edit content</option>
            <option value="VIEWER">Viewer - Read-only access</option>
          </Select>
          <p className="mt-1 text-xs text-neutral-500">
            Note: Admin role can only be assigned after the user joins.
          </p>
        </div>
      </form>
    </Modal>
  );
}
