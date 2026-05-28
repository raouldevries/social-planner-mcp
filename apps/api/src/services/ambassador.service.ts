/**
 * Social Planner - Ambassador Service
 *
 * Handles ambassador groups, memberships, content queue, and share tracking.
 * Enables employee advocacy by allowing team members to share company content.
 */

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';
import { AmbassadorStatus, SocialPlatform, AMBASSADOR_STATUS } from '@social-planner/shared';
import { resolveMediaUrl } from '../lib/media-utils';
import { sendEmail } from './email.service';

// ============================================
// DEFAULT EMAIL TEMPLATE
// ============================================

export const DEFAULT_AMBASSADOR_EMAIL_SUBJECT =
  'Sharing is caring en online groeien doe je samen. 🎉';

export const DEFAULT_AMBASSADOR_EMAIL_TEMPLATE = `Hallo Team {{groupName}}!

We hebben zojuist weer een nieuwe post gepubliceerd.

Voor het grootst mogelijk bereik, willen we jullie vragen om dit bericht delen vanuit jullie eigen account. Voeg daaraan een korte eigen tekst toe, dat is het beste voor het algoritme van LinkedIn.

{{publishedLinks}}

Mochten jullie hierover nog vragen hebben, dan horen we het graag.

Groet,

{{groupName}}`;

// Available template variables:
// {{ambassadorName}} - The ambassador's name
// {{postContent}} - Preview of the post content (first 200 chars)
// {{platforms}} - List of platforms (e.g., "LinkedIn, Instagram")
// {{publishedLinks}} - Direct links to the published posts
// {{groupName}} - Name of the ambassador group

// ============================================
// TYPES
// ============================================

export interface AmbassadorGroupSummary {
  id: string;
  name: string;
  description: string | null;
  emailTemplate: string | null;
  memberCount: number;
  createdAt: string;
}

export interface AmbassadorMemberSummary {
  id: string;
  email: string | null;
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  } | null;
  status: AmbassadorStatus;
  invitedAt: string;
  respondedAt: string | null;
}

export interface AmbassadorGroupDetail extends AmbassadorGroupSummary {
  members: AmbassadorMemberSummary[];
}

export interface AmbassadorQueuePost {
  id: string;
  baseContent: string | null;
  media: Array<{
    id: string;
    url: string;
    type: string;
  }>;
  author: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  channels: Array<{
    platform: SocialPlatform;
    accountName: string;
  }>;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  hasShared: boolean;
}

export interface AmbassadorShareSummary {
  id: string;
  postId: string;
  platform: SocialPlatform;
  sharedAt: string;
  shareUrl: string | null;
}

export interface AmbassadorStats {
  totalShares: number;
  thisMonthShares: number;
  postsShared: number;
}

// ============================================
// HELPERS
// ============================================

function formatGroup(group: {
  id: string;
  name: string;
  description: string | null;
  emailTemplate: string | null;
  createdAt: Date;
  _count: { members: number };
}): AmbassadorGroupSummary {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    emailTemplate: group.emailTemplate,
    memberCount: group._count.members,
    createdAt: group.createdAt.toISOString(),
  };
}

function formatMember(member: {
  id: string;
  email: string | null;
  status: AmbassadorStatus;
  invitedAt: Date;
  respondedAt: Date | null;
  user: { id: string; fullName: string; avatarUrl: string | null } | null;
}): AmbassadorMemberSummary {
  return {
    id: member.id,
    email: member.email,
    user: member.user,
    status: member.status,
    invitedAt: member.invitedAt.toISOString(),
    respondedAt: member.respondedAt?.toISOString() ?? null,
  };
}

/**
 * Render an email template with dynamic variables
 */
export function renderEmailTemplate(
  template: string,
  variables: {
    ambassadorName: string;
    postContent: string;
    platforms: string;
    publishedLinks: string;
    groupName: string;
  }
): string {
  let rendered = template;

  // Replace simple variables
  rendered = rendered.replace(/\{\{ambassadorName\}\}/g, variables.ambassadorName);
  rendered = rendered.replace(/\{\{postContent\}\}/g, variables.postContent);
  rendered = rendered.replace(/\{\{platforms\}\}/g, variables.platforms);
  rendered = rendered.replace(/\{\{publishedLinks\}\}/g, variables.publishedLinks);
  rendered = rendered.replace(/\{\{groupName\}\}/g, variables.groupName);

  // Clean up any leftover legacy conditional blocks
  rendered = rendered.replace(/\{\{#if \w+\}\}[\s\S]*?\{\{\/if\}\}/g, '');

  return rendered.trim();
}

// ============================================
// AMBASSADOR EMAIL NOTIFICATIONS
// ============================================

/**
 * Send ambassador notification emails after a post is fully published.
 * Called when all channels on a post have been published.
 */
export async function sendAmbassadorPublishedEmails(postId: string): Promise<void> {
  // Fetch post with published channels
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      baseContent: true,
      isAmbassadorAvailable: true,
      channels: {
        where: { status: 'PUBLISHED' },
        select: {
          publishedUrl: true,
          socialAccount: {
            select: {
              platform: true,
              accountName: true,
            },
          },
        },
      },
    },
  });

  if (!post || !post.isAmbassadorAvailable || post.channels.length === 0) {
    return;
  }

  // Build platform list and published links
  const platforms = [...new Set(post.channels.map((c) => c.socialAccount.platform))].join(', ');
  const publishedLinks = post.channels
    .filter((c) => c.publishedUrl)
    .map((c) => `- ${c.socialAccount.platform} (${c.socialAccount.accountName}): ${c.publishedUrl}`)
    .join('\n');

  if (!publishedLinks) {
    logger.warn({ postId }, 'No published URLs available for ambassador emails');
    return;
  }

  const postContent = post.baseContent
    ? post.baseContent.length > 200
      ? post.baseContent.substring(0, 200) + '...'
      : post.baseContent
    : '(No content)';

  // Get all active ambassadors across all groups, deduplicated by email
  const memberships = await prisma.ambassadorMembership.findMany({
    where: { status: 'ACTIVE' },
    select: {
      email: true,
      user: {
        select: { fullName: true, email: true },
      },
      group: {
        select: {
          name: true,
          emailTemplate: true,
        },
      },
    },
  });

  // Deduplicate by email address
  const seen = new Set<string>();
  const uniqueMembers = memberships.filter((m) => {
    const email = m.email || m.user?.email;
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });

  logger.info(
    { postId, ambassadorCount: uniqueMembers.length },
    'Sending ambassador published emails'
  );

  for (const member of uniqueMembers) {
    const email = member.email || member.user?.email;
    if (!email) continue;

    const ambassadorName = member.user?.fullName || email.split('@')[0];
    const template = member.group.emailTemplate || DEFAULT_AMBASSADOR_EMAIL_TEMPLATE;

    const rendered = renderEmailTemplate(template, {
      ambassadorName,
      postContent,
      platforms,
      publishedLinks,
      groupName: member.group.name,
    });

    // Convert markdown-style bold to HTML for email
    const htmlBody = rendered
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');

    try {
      await sendEmail({
        to: email,
        subject: DEFAULT_AMBASSADOR_EMAIL_SUBJECT,
        html: htmlBody,
        text: rendered,
      });
    } catch (error) {
      logger.error({ email, postId, error }, 'Failed to send ambassador email');
    }
  }
}

/**
 * Send a test email using the group's template to the requesting user.
 * Uses sample data so the user can verify the template and email delivery.
 */
export async function sendTestEmail(
  groupId: string,
  recipientEmail: string,
  recipientName: string
): Promise<void> {
  const group = await prisma.ambassadorGroup.findUnique({
    where: { id: groupId },
    select: { name: true, emailTemplate: true },
  });

  if (!group) {
    throw new AppError('GROUP_NOT_FOUND', 'Ambassador group not found', 404);
  }

  const template = group.emailTemplate || DEFAULT_AMBASSADOR_EMAIL_TEMPLATE;

  const rendered = renderEmailTemplate(template, {
    ambassadorName: recipientName,
    postContent:
      "Excited to announce our latest product update! Check out the new features we've been working on...",
    platforms: 'LINKEDIN, INSTAGRAM',
    publishedLinks:
      '- LINKEDIN (Acme): https://www.linkedin.com/feed/update/urn:li:share:123456\n- INSTAGRAM (planner_official): https://www.instagram.com/p/ABC123/',
    groupName: group.name,
  });

  const htmlBody = rendered
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');

  const sent = await sendEmail({
    to: recipientEmail,
    subject: `[TEST] ${DEFAULT_AMBASSADOR_EMAIL_SUBJECT}`,
    html: htmlBody,
    text: rendered,
  });

  if (!sent) {
    throw new AppError('EMAIL_FAILED', 'Failed to send test email', 500);
  }

  logger.info({ groupId, to: recipientEmail }, 'Test ambassador email sent');
}

// ============================================
// GROUP OPERATIONS
// ============================================

/**
 * Get all ambassador groups
 */
export async function getGroups(): Promise<AmbassadorGroupSummary[]> {
  const groups = await prisma.ambassadorGroup.findMany({
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return groups.map(formatGroup);
}

/**
 * Get a single group with members
 */
export async function getGroupById(groupId: string): Promise<AmbassadorGroupDetail> {
  const group = await prisma.ambassadorGroup.findUnique({
    where: { id: groupId },
    include: {
      _count: { select: { members: true } },
      members: {
        include: {
          user: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
        },
        orderBy: { invitedAt: 'desc' },
      },
    },
  });

  if (!group) {
    throw new AppError('GROUP_NOT_FOUND', 'Ambassador group not found', 404);
  }

  return {
    ...formatGroup(group),
    members: group.members.map(formatMember),
  };
}

/**
 * Create a new ambassador group
 */
export async function createGroup(data: {
  name: string;
  description?: string;
  emailTemplate?: string;
}): Promise<AmbassadorGroupSummary> {
  const group = await prisma.ambassadorGroup.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      emailTemplate: data.emailTemplate ?? null,
    },
    include: {
      _count: { select: { members: true } },
    },
  });

  return formatGroup(group);
}

/**
 * Update an ambassador group
 */
export async function updateGroup(
  groupId: string,
  data: { name?: string; description?: string | null; emailTemplate?: string | null }
): Promise<AmbassadorGroupSummary> {
  const existing = await prisma.ambassadorGroup.findUnique({
    where: { id: groupId },
  });

  if (!existing) {
    throw new AppError('GROUP_NOT_FOUND', 'Ambassador group not found', 404);
  }

  const group = await prisma.ambassadorGroup.update({
    where: { id: groupId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.emailTemplate !== undefined && { emailTemplate: data.emailTemplate }),
    },
    include: {
      _count: { select: { members: true } },
    },
  });

  return formatGroup(group);
}

/**
 * Delete an ambassador group
 */
export async function deleteGroup(groupId: string): Promise<void> {
  const existing = await prisma.ambassadorGroup.findUnique({
    where: { id: groupId },
  });

  if (!existing) {
    throw new AppError('GROUP_NOT_FOUND', 'Ambassador group not found', 404);
  }

  await prisma.ambassadorGroup.delete({ where: { id: groupId } });
}

// ============================================
// MEMBERSHIP OPERATIONS
// ============================================

/**
 * Invite a member to an ambassador group
 * Can be existing user (by email) or external person
 */
export async function inviteMember(
  groupId: string,
  email: string
): Promise<AmbassadorMemberSummary> {
  // Verify group exists
  const group = await prisma.ambassadorGroup.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    throw new AppError('GROUP_NOT_FOUND', 'Ambassador group not found', 404);
  }

  // Check if already a member (by email)
  const existingByEmail = await prisma.ambassadorMembership.findFirst({
    where: { groupId, email },
  });

  if (existingByEmail) {
    throw new AppError('ALREADY_MEMBER', 'This email is already a member of the group', 400);
  }

  // Check if user exists with this email
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, fullName: true, avatarUrl: true },
  });

  // Check if user is already a member
  if (user) {
    const existingByUser = await prisma.ambassadorMembership.findFirst({
      where: { groupId, userId: user.id },
    });

    if (existingByUser) {
      throw new AppError('ALREADY_MEMBER', 'This user is already a member of the group', 400);
    }
  }

  // Create membership (directly active — no invite/accept flow)
  const member = await prisma.ambassadorMembership.create({
    data: {
      groupId,
      email,
      userId: user?.id ?? null,
      status: AMBASSADOR_STATUS.ACTIVE,
      respondedAt: new Date(),
    },
    include: {
      user: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
    },
  });

  // TODO: Send invitation email

  return formatMember(member);
}

/**
 * Bulk invite members to a group
 */
export async function inviteMembers(
  groupId: string,
  emails: string[]
): Promise<{
  success: AmbassadorMemberSummary[];
  failed: Array<{ email: string; reason: string }>;
}> {
  const success: AmbassadorMemberSummary[] = [];
  const failed: Array<{ email: string; reason: string }> = [];

  for (const email of emails) {
    try {
      const member = await inviteMember(groupId, email);
      success.push(member);
    } catch (error) {
      if (error instanceof AppError) {
        failed.push({ email, reason: error.message });
      } else {
        failed.push({ email, reason: 'Unknown error' });
      }
    }
  }

  return { success, failed };
}

/**
 * Accept/decline invitation (by user)
 */
export async function respondToInvitation(
  userId: string,
  membershipId: string,
  accept: boolean
): Promise<AmbassadorMemberSummary> {
  const membership = await prisma.ambassadorMembership.findUnique({
    where: { id: membershipId },
    include: { user: true },
  });

  if (!membership) {
    throw new AppError('MEMBERSHIP_NOT_FOUND', 'Membership not found', 404);
  }

  // Check user matches
  if (membership.userId !== userId) {
    // Check if user's email matches the invite email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (user?.email !== membership.email) {
      throw new AppError('FORBIDDEN', 'You are not authorized to respond to this invitation', 403);
    }

    // Link user to membership
    await prisma.ambassadorMembership.update({
      where: { id: membershipId },
      data: { userId },
    });
  }

  if (membership.status !== AMBASSADOR_STATUS.PENDING) {
    throw new AppError('ALREADY_RESPONDED', 'Invitation has already been responded to', 400);
  }

  const updated = await prisma.ambassadorMembership.update({
    where: { id: membershipId },
    data: {
      status: accept ? AMBASSADOR_STATUS.ACTIVE : AMBASSADOR_STATUS.DECLINED,
      respondedAt: new Date(),
    },
    include: {
      user: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
    },
  });

  return formatMember(updated);
}

/**
 * Remove a member from a group
 */
export async function removeMember(groupId: string, membershipId: string): Promise<void> {
  const membership = await prisma.ambassadorMembership.findFirst({
    where: { id: membershipId, groupId },
  });

  if (!membership) {
    throw new AppError('MEMBERSHIP_NOT_FOUND', 'Membership not found', 404);
  }

  await prisma.ambassadorMembership.delete({ where: { id: membershipId } });
}

/**
 * Get groups where user is an active member
 */
export async function getUserGroups(userId: string): Promise<AmbassadorGroupSummary[]> {
  const memberships = await prisma.ambassadorMembership.findMany({
    where: {
      userId,
      status: AMBASSADOR_STATUS.ACTIVE,
    },
    include: {
      group: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
  });

  return memberships.map((m) => formatGroup(m.group));
}

/**
 * Check if user is an active ambassador
 */
export async function isActiveAmbassador(userId: string): Promise<boolean> {
  const membership = await prisma.ambassadorMembership.findFirst({
    where: {
      userId,
      status: AMBASSADOR_STATUS.ACTIVE,
    },
  });

  return !!membership;
}

/**
 * Get pending invitations for a user
 */
export async function getPendingInvitations(
  userId: string
): Promise<Array<{ membership: AmbassadorMemberSummary; group: AmbassadorGroupSummary }>> {
  // Get user email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    return [];
  }

  const memberships = await prisma.ambassadorMembership.findMany({
    where: {
      OR: [{ userId }, { email: user.email }],
      status: AMBASSADOR_STATUS.PENDING,
    },
    include: {
      user: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
      group: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
  });

  return memberships.map((m) => ({
    membership: formatMember(m),
    group: formatGroup(m.group),
  }));
}

// ============================================
// CONTENT QUEUE OPERATIONS
// ============================================

/**
 * Get posts available for ambassador sharing
 */
export async function getAmbassadorQueue(userId: string): Promise<AmbassadorQueuePost[]> {
  // Verify user is an active ambassador
  const isActive = await isActiveAmbassador(userId);
  if (!isActive) {
    throw new AppError('NOT_AMBASSADOR', 'You are not an active ambassador', 403);
  }

  // Get ambassador membership IDs for this user
  const memberships = await prisma.ambassadorMembership.findMany({
    where: { userId, status: AMBASSADOR_STATUS.ACTIVE },
    select: { id: true },
  });

  const membershipIds = memberships.map((m) => m.id);

  // Get posts that are:
  // 1. Marked as ambassador available
  // 2. Published or scheduled (approved)
  // 3. Not already shared by this ambassador
  const posts = await prisma.post.findMany({
    where: {
      isAmbassadorAvailable: true,
      status: { in: ['PUBLISHED', 'SCHEDULED', 'APPROVED'] },
    },
    include: {
      author: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
      media: {
        include: {
          mediaAsset: {
            select: { id: true, storagePath: true, fileType: true },
          },
        },
      },
      channels: {
        include: {
          socialAccount: {
            select: { platform: true, accountName: true },
          },
        },
      },
      ambassadorShares: {
        where: { ambassadorId: { in: membershipIds } },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return posts.map((post: any) => ({
    id: post.id,
    baseContent: post.baseContent,
    media: post.media.map((m: any) => ({
      id: m.mediaAsset.id,
      url: resolveMediaUrl(m.mediaAsset.storagePath),
      type: m.mediaAsset.fileType,
    })),
    author: post.author,
    channels: post.channels.map((c: any) => ({
      platform: c.socialAccount.platform as SocialPlatform,
      accountName: c.socialAccount.accountName,
    })),
    scheduledAt: post.scheduledAt?.toISOString() ?? null,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    hasShared: post.ambassadorShares.length > 0,
  }));
}

// ============================================
// SHARE TRACKING OPERATIONS
// ============================================

/**
 * Record an ambassador share
 */
export async function recordShare(
  userId: string,
  postId: string,
  platform: SocialPlatform,
  shareUrl?: string
): Promise<AmbassadorShareSummary> {
  // Get active membership
  const membership = await prisma.ambassadorMembership.findFirst({
    where: { userId, status: AMBASSADOR_STATUS.ACTIVE },
  });

  if (!membership) {
    throw new AppError('NOT_AMBASSADOR', 'You are not an active ambassador', 403);
  }

  // Verify post exists and is available for sharing
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { isAmbassadorAvailable: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  if (!post.isAmbassadorAvailable) {
    throw new AppError('NOT_AVAILABLE', 'This post is not available for ambassador sharing', 400);
  }

  // Check if already shared by this ambassador on this platform
  const existingShare = await prisma.ambassadorShare.findFirst({
    where: {
      postId,
      ambassadorId: membership.id,
      platform,
    },
  });

  if (existingShare) {
    throw new AppError('ALREADY_SHARED', 'You have already shared this post on this platform', 400);
  }

  // Record the share
  const share = await prisma.ambassadorShare.create({
    data: {
      postId,
      ambassadorId: membership.id,
      platform,
      shareUrl: shareUrl ?? null,
    },
  });

  return {
    id: share.id,
    postId: share.postId,
    platform: share.platform as SocialPlatform,
    sharedAt: share.sharedAt.toISOString(),
    shareUrl: share.shareUrl,
  };
}

/**
 * Get shares by an ambassador
 */
export async function getAmbassadorShares(userId: string): Promise<AmbassadorShareSummary[]> {
  const memberships = await prisma.ambassadorMembership.findMany({
    where: { userId, status: AMBASSADOR_STATUS.ACTIVE },
    select: { id: true },
  });

  if (memberships.length === 0) {
    return [];
  }

  const shares = await prisma.ambassadorShare.findMany({
    where: {
      ambassadorId: { in: memberships.map((m) => m.id) },
    },
    orderBy: { sharedAt: 'desc' },
  });

  return shares.map((s) => ({
    id: s.id,
    postId: s.postId,
    platform: s.platform as SocialPlatform,
    sharedAt: s.sharedAt.toISOString(),
    shareUrl: s.shareUrl,
  }));
}

/**
 * Get share stats for an ambassador
 */
export async function getAmbassadorStats(userId: string): Promise<AmbassadorStats> {
  const memberships = await prisma.ambassadorMembership.findMany({
    where: { userId, status: AMBASSADOR_STATUS.ACTIVE },
    select: { id: true },
  });

  if (memberships.length === 0) {
    return { totalShares: 0, thisMonthShares: 0, postsShared: 0 };
  }

  const membershipIds = memberships.map((m) => m.id);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalShares, thisMonthShares, uniquePosts] = await Promise.all([
    prisma.ambassadorShare.count({
      where: { ambassadorId: { in: membershipIds } },
    }),
    prisma.ambassadorShare.count({
      where: {
        ambassadorId: { in: membershipIds },
        sharedAt: { gte: startOfMonth },
      },
    }),
    prisma.ambassadorShare.groupBy({
      by: ['postId'],
      where: { ambassadorId: { in: membershipIds } },
    }),
  ]);

  return {
    totalShares,
    thisMonthShares,
    postsShared: uniquePosts.length,
  };
}

/**
 * Get aggregate share stats for a post
 */
export async function getPostShareStats(postId: string): Promise<{
  totalShares: number;
  uniqueAmbassadors: number;
  byPlatform: Record<string, number>;
}> {
  const shares = await prisma.ambassadorShare.findMany({
    where: { postId },
    select: { ambassadorId: true, platform: true },
  });

  const byPlatform: Record<string, number> = {};
  const uniqueAmbassadors = new Set<string>();

  for (const share of shares) {
    uniqueAmbassadors.add(share.ambassadorId);
    byPlatform[share.platform] = (byPlatform[share.platform] ?? 0) + 1;
  }

  return {
    totalShares: shares.length,
    uniqueAmbassadors: uniqueAmbassadors.size,
    byPlatform,
  };
}
