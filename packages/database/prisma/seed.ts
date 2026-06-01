/**
 * Social Planner - Database Seed Script
 *
 * Creates demo data for development and testing.
 * Single workspace architecture - all users belong to "Acme" workspace.
 */

import { PrismaClient, UserRole, PostStatus, ArticleStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Seed script refuses to run with NODE_ENV=production. ' +
        'This seed creates a default admin (admin@admin.com / admin) intended for local development only.'
    );
  }

  console.warn(
    '\n⚠️  Seeding database with DEMO data including a default admin account ' +
      '(admin@admin.com / admin). For local development only — never deploy with these credentials.\n' +
      '\n   A read-only demo account (demo@planner.com / demo, role VIEWER, isDemo=true) is also ' +
      'created. It is safe to expose publicly — the API rejects all write requests from it.\n'
  );

  console.log('Seeding database...');

  // Clean existing data
  console.log('Cleaning existing data...');
  await prisma.ambassadorShare.deleteMany();
  await prisma.ambassadorMembership.deleteMany();
  await prisma.ambassadorGroup.deleteMany();
  await prisma.shareLink.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.commentMention.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.collaboratorAssignment.deleteMany();
  await prisma.postMedia.deleteMany();
  await prisma.postAnalytics.deleteMany();
  await prisma.postChannel.deleteMany();
  await prisma.post.deleteMany();
  await prisma.article.deleteMany();
  await prisma.mediaTag.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.mediaFolder.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('admin', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@admin.com',
      passwordHash,
      fullName: 'Admin User',
      role: UserRole.ADMIN,
      timezone: 'Europe/Amsterdam',
      emailVerifiedAt: new Date(),
    },
  });

  const editorUser = await prisma.user.create({
    data: {
      email: 'editor@planner.com',
      passwordHash,
      fullName: 'Editor User',
      role: UserRole.EDITOR,
      timezone: 'Europe/Amsterdam',
      emailVerifiedAt: new Date(),
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      email: 'viewer@planner.com',
      passwordHash,
      fullName: 'Viewer User',
      role: UserRole.VIEWER,
      timezone: 'Europe/Amsterdam',
      emailVerifiedAt: new Date(),
    },
  });

  // Public read-only demo account. Backed by the VIEWER role AND the isDemo
  // flag, which the API uses to reject every write request (see blockDemoWrites
  // in apps/api/src/middleware/auth.ts). Safe to expose publicly: it cannot
  // change any data.
  const demoPasswordHash = await bcrypt.hash('demo', 10);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@planner.com',
      passwordHash: demoPasswordHash,
      fullName: 'Demo User',
      role: UserRole.VIEWER,
      isDemo: true,
      timezone: 'Europe/Amsterdam',
      emailVerifiedAt: new Date(),
    },
  });

  console.log(
    `Created users: ${adminUser.email}, ${editorUser.email}, ${viewerUser.email}, ${demoUser.email} (read-only demo)`
  );

  // NOTE: Social accounts are NOT seeded - they must be connected via OAuth in the app
  console.log('Skipping social accounts (connect via OAuth in app)...');

  // Create media folders
  console.log('Creating media folders...');
  const imagesFolder = await prisma.mediaFolder.create({
    data: {
      name: 'Woningen',
      createdById: adminUser.id,
    },
  });

  await prisma.mediaFolder.create({
    data: {
      name: 'Videos',
      createdById: adminUser.id,
    },
  });

  const brandFolder = await prisma.mediaFolder.create({
    data: {
      name: 'Huisstijl',
      parentId: imagesFolder.id,
      createdById: adminUser.id,
    },
  });

  // Create media tags
  console.log('Creating media tags...');
  const productTag = await prisma.mediaTag.create({
    data: { name: 'houtskeletbouw' },
  });

  const brandingTag = await prisma.mediaTag.create({
    data: { name: 'huisstijl' },
  });

  const socialTag = await prisma.mediaTag.create({
    data: { name: 'duurzaam' },
  });

  // Create sample media assets
  console.log('Creating media assets...');
  await prisma.mediaAsset.create({
    data: {
      uploadedById: adminUser.id,
      fileName: 'planner-logo.png',
      fileType: 'image/png',
      fileSize: 25600,
      storagePath: 'media/brand/planner-logo.png',
      thumbnailPath: 'media/brand/planner-logo-thumb.png',
      width: 800,
      height: 400,
      altText: 'Logo',
      folderId: brandFolder.id,
      tags: {
        connect: [{ id: brandingTag.id }],
      },
    },
  });

  const productImage = await prisma.mediaAsset.create({
    data: {
      uploadedById: editorUser.id,
      fileName: 'woning-hilversum.jpg',
      fileType: 'image/jpeg',
      fileSize: 512000,
      storagePath: 'media/woningen/woning-hilversum.jpg',
      thumbnailPath: 'media/woningen/woning-hilversum-thumb.jpg',
      width: 1920,
      height: 1080,
      altText: 'Example seed image',
      folderId: imagesFolder.id,
      tags: {
        connect: [{ id: productTag.id }, { id: socialTag.id }],
      },
    },
  });

  // Create articles
  console.log('Creating articles...');
  const article1 = await prisma.article.create({
    data: {
      authorId: editorUser.id,
      title: 'De voordelen van houtskeletbouw',
      content:
        '# De voordelen van houtskeletbouw\n\nEen example home is meer dan een plek om te wonen. Ontdek waarom steeds meer mensen kiezen voor duurzaam bouwen met hout...',
      status: ArticleStatus.PUBLISHED,
      featuredImageId: productImage.id,
      publishedAt: new Date(),
    },
  });

  await prisma.article.create({
    data: {
      authorId: editorUser.id,
      title: 'Van ontwerp tot sleuteloverdracht in 365 dagen',
      content:
        '# Van ontwerp tot sleuteloverdracht\n\nHoe realiseren wij uw droomwoning binnen een jaar? Een kijkje achter de schermen bij Acme...',
      status: ArticleStatus.DRAFT,
    },
  });

  // Create posts
  console.log('Creating posts...');
  const post1 = await prisma.post.create({
    data: {
      authorId: editorUser.id,
      status: PostStatus.DRAFT,
      baseContent:
        'Waarom kiezen steeds meer mensen voor houtskeletbouw? Lees ons nieuwste artikel over de voordelen van duurzaam bouwen. Link in bio!',
      articleId: article1.id,
      linkUrl: 'https://planner.nl/voordelen-houtskeletbouw',
      media: {
        create: {
          mediaAssetId: productImage.id,
          position: 0,
        },
      },
    },
  });

  const post2 = await prisma.post.create({
    data: {
      authorId: editorUser.id,
      status: PostStatus.PENDING_APPROVAL,
      baseContent:
        'Spannend nieuws! We werken aan een prachtig nieuw woningproject in het Gooi. Binnenkort meer informatie over dit unieke project.',
      isAmbassadorAvailable: true,
    },
  });

  await prisma.post.create({
    data: {
      authorId: adminUser.id,
      status: PostStatus.SCHEDULED,
      baseContent: 'Het Acme team wenst iedereen fijne feestdagen en een duurzaam 2026! 🏡✨',
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    },
  });

  // Create sample published posts (without channels - social accounts must be connected via OAuth)
  console.log('Creating sample published posts...');

  // Published post 1 - 2 weeks ago
  const publishedDate1 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  await prisma.post.create({
    data: {
      authorId: editorUser.id,
      status: PostStatus.PUBLISHED,
      baseContent:
        '🏡 Vandaag oplevering van weer een prachtige Example seed image! Van ontwerp tot sleuteloverdracht in precies 365 dagen. #Houtskeletbouw #DuurzaamWonen',
      publishedAt: publishedDate1,
      scheduledAt: publishedDate1,
    },
  });

  // Published post 2 - 10 days ago
  const publishedDate2 = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  await prisma.post.create({
    data: {
      authorId: adminUser.id,
      status: PostStatus.PUBLISHED,
      baseContent:
        'Een kijkje in onze productiefaciliteit in Letland waar vakmanschap en precisie samenkomen. Elk onderdeel wordt met zorg gemaakt voor uw toekomstige woning. 🪵✨ #Houtbouw #Kwaliteit',
      publishedAt: publishedDate2,
      scheduledAt: publishedDate2,
    },
  });

  // Published post 3 - 5 days ago
  const publishedDate3 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  await prisma.post.create({
    data: {
      authorId: editorUser.id,
      status: PostStatus.PUBLISHED,
      baseContent:
        'Wist u dat een houten woning CO2 opslaat in plaats van uitstoot? In ons nieuwste artikel leggen we uit hoe houtskeletbouw bijdraagt aan een duurzamere toekomst.',
      publishedAt: publishedDate3,
      scheduledAt: publishedDate3,
    },
  });

  // Published post 4 - 3 days ago
  const publishedDate4 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  await prisma.post.create({
    data: {
      authorId: adminUser.id,
      status: PostStatus.PUBLISHED,
      baseContent:
        '✨ Familie van den Berg woont nu 2 jaar in hun Acme huis. "Het wooncomfort is fantastisch en onze energierekening is nagenoeg nul." Lees hun verhaal! #Bewonersportret',
      publishedAt: publishedDate4,
      scheduledAt: publishedDate4,
    },
  });

  // NOTE: Channels and analytics are NOT seeded - they require connected social accounts via OAuth

  // Create collaborator assignment
  console.log('Creating collaborator assignments...');
  await prisma.collaboratorAssignment.create({
    data: {
      postId: post2.id,
      userId: adminUser.id,
      assignedById: editorUser.id,
    },
  });

  // Create comments
  console.log('Creating comments...');
  const comment1 = await prisma.comment.create({
    data: {
      postId: post1.id,
      authorId: adminUser.id,
      content: 'Mooie post! Zullen we ook een foto van het interieur toevoegen?',
    },
  });

  await prisma.comment.create({
    data: {
      postId: post1.id,
      authorId: editorUser.id,
      parentId: comment1.id,
      content: 'Goed idee, ik voeg er een toe!',
    },
  });

  // Create activity logs
  console.log('Creating activity logs...');
  await prisma.activityLog.create({
    data: {
      postId: post1.id,
      actorId: editorUser.id,
      action: 'post.created',
      details: { status: 'DRAFT' },
    },
  });

  await prisma.activityLog.create({
    data: {
      postId: post2.id,
      actorId: editorUser.id,
      action: 'post.submitted',
      details: { previousStatus: 'DRAFT', newStatus: 'PENDING_APPROVAL' },
    },
  });

  // Create notifications
  console.log('Creating notifications...');
  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      type: 'POST_SUBMITTED',
      title: 'Nieuwe post ter beoordeling',
      body: 'Editor User heeft een post ingediend voor goedkeuring.',
      data: { postId: post2.id },
    },
  });

  // Create ambassador group
  console.log('Creating ambassador group...');
  await prisma.ambassadorGroup.create({
    data: {
      name: 'Residents',
      description: 'Ons netwerk van tevreden bewoners die hun ervaringen delen.',
      members: {
        create: [
          {
            email: 'bewoner@example.com',
            status: 'PENDING',
          },
          {
            userId: viewerUser.id,
            status: 'ACTIVE',
            respondedAt: new Date(),
          },
        ],
      },
    },
  });

  // Create share link
  console.log('Creating share links...');
  await prisma.shareLink.create({
    data: {
      postId: post1.id,
      token: 'demo-share-token-12345',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      permissions: 'VIEW_COMMENT',
      createdById: editorUser.id,
    },
  });

  console.log('Database seeded successfully!');
  console.log({
    users: 4,
    socialAccounts: 2,
    folders: 3,
    tags: 3,
    mediaAssets: 2,
    articles: 2,
    posts: 7,
    publishedPosts: 4,
    channels: 6,
    analyticsRecords: 6,
    ambassadorGroups: 1,
  });
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
