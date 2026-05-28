/**
 * Ambassador Settings Component
 *
 * Admin interface for managing ambassador groups and members.
 */

import { useState, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  useAmbassadorGroups,
  useAmbassadorGroup,
  useCreateAmbassadorGroup,
  useUpdateAmbassadorGroup,
  useDeleteAmbassadorGroup,
  useBulkInviteAmbassadors,
  useRemoveAmbassador,
  useSendTestEmail,
} from '@/hooks/useAmbassador';
import type { AmbassadorGroupSummary, AmbassadorMemberSummary } from '@social-planner/shared';

// Default email template for ambassador notifications
const DEFAULT_EMAIL_TEMPLATE = `Hallo Team {{groupName}}!

We hebben zojuist weer een nieuwe post gepubliceerd.

Voor het grootst mogelijk bereik, willen we jullie vragen om dit bericht delen vanuit jullie eigen account. Voeg daaraan een korte eigen tekst toe, dat is het beste voor het algoritme van LinkedIn.

{{publishedLinks}}

Mochten jullie hierover nog vragen hebben, dan horen we het graag.

Groet,

{{groupName}}`;

// Available template variables for reference
const TEMPLATE_VARIABLES = [
  { variable: '{{ambassadorName}}', description: "The ambassador's name" },
  { variable: '{{postContent}}', description: 'Preview of the post content' },
  { variable: '{{platforms}}', description: 'Target platforms (e.g., LinkedIn, Instagram)' },
  { variable: '{{publishedLinks}}', description: 'Direct links to the published posts' },
  { variable: '{{groupName}}', description: 'Name of the ambassador group' },
];

// Sample data for email preview
const PREVIEW_VARIABLES = {
  ambassadorName: 'Jane Doe',
  postContent:
    "Excited to announce our latest product update! Check out the new features we've been working on...",
  platforms: 'LINKEDIN, INSTAGRAM',
  publishedLinks:
    '- LINKEDIN (Acme): https://www.linkedin.com/feed/update/urn:li:share:123456\n- INSTAGRAM (planner_official): https://www.instagram.com/p/ABC123/',
  groupName: 'Team Acme',
};

/**
 * Client-side template rendering (mirrors ambassador.service.ts renderEmailTemplate)
 */
function renderTemplate(template: string, variables: typeof PREVIEW_VARIABLES): string {
  let rendered = template;
  rendered = rendered.replace(/\{\{ambassadorName\}\}/g, variables.ambassadorName);
  rendered = rendered.replace(/\{\{postContent\}\}/g, variables.postContent);
  rendered = rendered.replace(/\{\{platforms\}\}/g, variables.platforms);
  rendered = rendered.replace(/\{\{publishedLinks\}\}/g, variables.publishedLinks);
  rendered = rendered.replace(/\{\{groupName\}\}/g, variables.groupName);
  // Clean up any leftover legacy conditional blocks
  rendered = rendered.replace(/\{\{#if \w+\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  return rendered.trim();
}

/**
 * Convert plain text with markdown-style bold to simple HTML
 */
function textToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');
}

export function AmbassadorSettings() {
  const { data: groups, isLoading } = useAmbassadorGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Ambassador Groups</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage employee advocacy groups for content sharing
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          Create Group
        </Button>
      </div>

      {/* Groups List */}
      {groups && groups.length > 0 ? (
        <div className="grid gap-4">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              isSelected={selectedGroupId === group.id}
              onSelect={() => setSelectedGroupId(group.id)}
            />
          ))}
        </div>
      ) : (
        <Card padding="lg">
          <div className="text-center py-8">
            <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-gray-900">No ambassador groups</h3>
            <p className="text-sm text-gray-500 mt-1">
              Create a group to start managing ambassadors
            </p>
          </div>
        </Card>
      )}

      {/* Group Detail Panel */}
      {selectedGroupId && (
        <GroupDetailPanel groupId={selectedGroupId} onClose={() => setSelectedGroupId(null)} />
      )}

      {/* Create Group Modal */}
      <CreateGroupModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}

// ============================================
// GROUP CARD
// ============================================

interface GroupCardProps {
  group: AmbassadorGroupSummary;
  isSelected: boolean;
  onSelect: () => void;
}

function GroupCard({ group, isSelected, onSelect }: GroupCardProps) {
  return (
    <Card
      padding="md"
      className={clsx('cursor-pointer transition-all', isSelected && 'ring-2 ring-primary-500')}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">{group.name}</h3>
          {group.description && <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
          </span>
          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </Card>
  );
}

// ============================================
// GROUP DETAIL PANEL
// ============================================

interface GroupDetailPanelProps {
  groupId: string;
  onClose: () => void;
}

function GroupDetailPanel({ groupId, onClose }: GroupDetailPanelProps) {
  const { data: group, isLoading } = useAmbassadorGroup(groupId);
  const updateGroup = useUpdateAmbassadorGroup(groupId);
  const deleteGroup = useDeleteAmbassadorGroup();
  const bulkInvite = useBulkInviteAmbassadors(groupId);
  const removeMember = useRemoveAmbassador(groupId);
  const sendTestEmail = useSendTestEmail(groupId);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEmailTemplate, setEditEmailTemplate] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleStartEdit = useCallback(() => {
    if (group) {
      setEditName(group.name);
      setEditDescription(group.description || '');
      setIsEditing(true);
    }
  }, [group]);

  const handleSaveEdit = useCallback(async () => {
    await updateGroup.mutateAsync({
      name: editName,
      description: editDescription || null,
    });
    setIsEditing(false);
  }, [updateGroup, editName, editDescription]);

  const handleStartTemplateEdit = useCallback(() => {
    if (group) {
      setEditEmailTemplate(group.emailTemplate || DEFAULT_EMAIL_TEMPLATE);
      setShowTemplateEditor(true);
    }
  }, [group]);

  const handleSaveTemplate = useCallback(async () => {
    await updateGroup.mutateAsync({
      emailTemplate: editEmailTemplate || null,
    });
    setShowTemplateEditor(false);
  }, [updateGroup, editEmailTemplate]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmails.trim()) return;
    // Parse emails: split by comma, semicolon, newline, or space
    // Validate email format and deduplicate
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = [
      ...new Set(
        inviteEmails
          .split(/[,;\n\s]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => emailRegex.test(e))
      ),
    ];
    if (emails.length === 0) return;
    await bulkInvite.mutateAsync(emails);
    setInviteEmails('');
  }, [bulkInvite, inviteEmails]);

  const handleDelete = useCallback(async () => {
    await deleteGroup.mutateAsync(groupId);
    onClose();
  }, [deleteGroup, groupId, onClose]);

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      setRemovingMemberId(memberId);
      try {
        await removeMember.mutateAsync(memberId);
      } finally {
        setRemovingMemberId(null);
      }
    },
    [removeMember]
  );

  if (isLoading || !group) {
    return (
      <Card padding="lg">
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          {isEditing ? (
            <div className="flex-1 space-y-4">
              <div>
                <Label>Group Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editName.trim()}
                  isLoading={updateGroup.isPending}
                >
                  Save
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleStartEdit}>
                  Edit
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                  Delete
                </Button>
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Add Members */}
        {!isEditing && !showTemplateEditor && (
          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Add Members</h4>
            <Textarea
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              placeholder="Enter email addresses (one per line, or separated by commas)"
              rows={4}
              className="mb-3"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {inviteEmails.trim()
                  ? `${[...new Set(inviteEmails.split(/[,;\n\s]+/).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())))].length} valid email(s) detected`
                  : 'Paste multiple emails to add in bulk'}
              </p>
              <Button
                variant="primary"
                onClick={handleInvite}
                disabled={!inviteEmails.trim() || bulkInvite.isPending}
                isLoading={bulkInvite.isPending}
              >
                Add Members
              </Button>
            </div>
          </div>
        )}

        {/* Email Template */}
        {!isEditing && !showTemplateEditor && (
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Email Template</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Customize the notification email ambassadors receive
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleStartTemplateEdit}>
                <MailIcon className="w-4 h-4 mr-1.5" />
                Edit Template
              </Button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-mono whitespace-pre-wrap line-clamp-4">
                {group.emailTemplate || DEFAULT_EMAIL_TEMPLATE}
              </p>
            </div>
          </div>
        )}

        {/* Email Template Editor */}
        {showTemplateEditor && (
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">Edit Email Template</h4>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowPreview((v) => !v)}>
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditEmailTemplate(DEFAULT_EMAIL_TEMPLATE)}
                >
                  Reset to Default
                </Button>
              </div>
            </div>

            {showPreview ? (
              <EmailPreview template={editEmailTemplate} groupName={group?.name} />
            ) : (
              <>
                <Textarea
                  value={editEmailTemplate}
                  onChange={(e) => setEditEmailTemplate(e.target.value)}
                  placeholder="Enter your custom email template..."
                  rows={12}
                  className="mb-4 font-mono text-sm"
                />
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <h5 className="text-xs font-medium text-blue-900 mb-2">Available Variables</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <div key={v.variable} className="text-xs">
                        <code className="text-blue-700 bg-blue-100 px-1 rounded">{v.variable}</code>
                        <span className="text-blue-600 ml-1">{v.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowTemplateEditor(false);
                  setShowPreview(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => sendTestEmail.mutate()}
                isLoading={sendTestEmail.isPending}
              >
                Send Test Email
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveTemplate}
                isLoading={updateGroup.isPending}
              >
                Save Template
              </Button>
            </div>
          </div>
        )}

        {/* Members List */}
        {!isEditing && !showTemplateEditor && group.members.length > 0 && (
          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Members ({group.members.length})
            </h4>
            <div className="space-y-2">
              {group.members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onRemove={() => handleRemoveMember(member.id)}
                  isRemoving={removingMemberId === member.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Group"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete "{group.name}"? This will remove all members and cannot be
          undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleteGroup.isPending}>
            Delete
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

// ============================================
// MEMBER ROW
// ============================================

interface MemberRowProps {
  member: AmbassadorMemberSummary;
  onRemove: () => void;
  isRemoving: boolean;
}

function MemberRow({ member, onRemove, isRemoving }: MemberRowProps) {
  const displayName = member.user?.fullName || member.email || 'Unknown';
  const avatarUrl = member.user?.avatarUrl || null;

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <Avatar name={displayName} src={avatarUrl} size="sm" />
        <div>
          <p className="text-sm font-medium text-gray-900">{displayName}</p>
          {member.email && member.user && <p className="text-xs text-gray-500">{member.email}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={member.status} />
        <button
          onClick={onRemove}
          disabled={isRemoving}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Remove member"
        >
          {isRemoving ? <Spinner size="sm" /> : <XIcon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'success' | 'warning' | 'danger'> = {
    ACTIVE: 'success',
    PENDING: 'warning',
    DECLINED: 'danger',
  };

  const labels: Record<string, string> = {
    ACTIVE: 'Active',
    PENDING: 'Pending',
    DECLINED: 'Declined',
  };

  return (
    <Badge variant={variants[status] || 'warning'} size="sm">
      {labels[status] || status}
    </Badge>
  );
}

// ============================================
// CREATE GROUP MODAL
// ============================================

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const createGroup = useCreateAmbassadorGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = useCallback(async () => {
    await createGroup.mutateAsync({
      name,
      description: description || undefined,
    });
    setName('');
    setDescription('');
    onClose();
  }, [createGroup, name, description, onClose]);

  const handleClose = useCallback(() => {
    setName('');
    setDescription('');
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Ambassador Group" size="sm">
      <div className="space-y-4">
        <div>
          <Label htmlFor="group-name">Group Name</Label>
          <Input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Marketing Team"
          />
        </div>
        <div>
          <Label htmlFor="group-description">Description (optional)</Label>
          <Textarea
            id="group-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this group"
            rows={2}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!name.trim()}
          isLoading={createGroup.isPending}
        >
          Create Group
        </Button>
      </div>
    </Modal>
  );
}

// ============================================
// EMAIL PREVIEW
// ============================================

function EmailPreview({ template, groupName }: { template: string; groupName?: string }) {
  const renderedBody = useMemo(() => {
    const vars = { ...PREVIEW_VARIABLES, groupName: groupName || PREVIEW_VARIABLES.groupName };
    const rendered = renderTemplate(template, vars);
    return textToHtml(rendered);
  }, [template, groupName]);

  return (
    <div className="mb-4">
      <p className="text-xs text-gray-500 mb-2">
        Preview with sample data — this is how ambassadors will see the email.
      </p>
      <div className="bg-gray-100 rounded-lg p-6">
        <div
          className="mx-auto bg-white rounded-xl shadow-sm overflow-hidden"
          style={{ maxWidth: 600 }}
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-4">
            <span className="text-xl font-semibold text-indigo-500">Social Planner</span>
          </div>
          {/* Body */}
          <div
            className="px-8 pb-8 text-sm text-gray-700 leading-relaxed"
            style={{ wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: renderedBody }}
          />
          {/* Footer */}
          <div className="border-t border-gray-100 px-8 py-4 text-center text-xs text-gray-400">
            Sent via Social Planner
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ICONS
// ============================================

function UsersIcon({ className }: { className?: string }) {
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
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
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

function MailIcon({ className }: { className?: string }) {
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
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}
