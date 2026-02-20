// ============================================================
// free-civics — Database Seed
// Run: npm run db:seed
// Creates test users and sample data for development.
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding free-civics database...\n');

  // --- Test Users ---

  const passwordHash = await bcrypt.hash('testpass123', 12);

  const freeUser = await prisma.user.upsert({
    where: { email: 'free@test.com' },
    update: {},
    create: {
      email: 'free@test.com',
      name: 'Free User',
      hashedPassword: passwordHash,
      tier: 'free',
      zipCode: '60188',
      defaultState: 'IL',
      emailVerified: new Date(),
    },
  });
  console.log(`  ✓ Free user:          free@test.com / testpass123`);

  const premiumUser = await prisma.user.upsert({
    where: { email: 'premium@test.com' },
    update: {},
    create: {
      email: 'premium@test.com',
      name: 'Premium User',
      hashedPassword: passwordHash,
      tier: 'premium',
      zipCode: '10001',
      defaultState: 'NY',
      emailVerified: new Date(),
    },
  });
  console.log(`  ✓ Premium user:       premium@test.com / testpass123`);

  const institutionalUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      name: 'Institutional Admin',
      hashedPassword: passwordHash,
      tier: 'institutional',
      zipCode: '20001',
      defaultState: 'DC',
      emailVerified: new Date(),
    },
  });
  console.log(`  ✓ Institutional user: admin@test.com / testpass123`);

  // --- Saved Officials (for premium user) ---

  const savedOfficials = [
    {
      userId: premiumUser.id,
      bioguideId: 'P000197',
      name: 'Nancy Pelosi',
      title: 'Representative',
      party: 'Democratic',
      state: 'CA',
      chamber: 'house',
      alertsOn: true,
    },
    {
      userId: premiumUser.id,
      bioguideId: 'S000148',
      name: 'Chuck Schumer',
      title: 'Senator',
      party: 'Democratic',
      state: 'NY',
      chamber: 'senate',
      alertsOn: true,
    },
    {
      userId: premiumUser.id,
      bioguideId: 'J000289',
      name: 'Mike Johnson',
      title: 'Representative',
      party: 'Republican',
      state: 'LA',
      chamber: 'house',
      alertsOn: false,
    },
  ];

  for (const official of savedOfficials) {
    await prisma.savedOfficial.upsert({
      where: {
        userId_bioguideId: {
          userId: official.userId,
          bioguideId: official.bioguideId,
        },
      },
      update: {},
      create: official,
    });
  }
  console.log(`  ✓ ${savedOfficials.length} saved officials for premium user`);

  // --- Issue Preferences (for premium user) ---

  const issuePrefs = [
    { userId: premiumUser.id, issueId: 'healthcare', priority: 1 },
    { userId: premiumUser.id, issueId: 'economy', priority: 2 },
    { userId: premiumUser.id, issueId: 'education', priority: 3 },
    { userId: premiumUser.id, issueId: 'criminal_justice', priority: 4 },
    { userId: premiumUser.id, issueId: 'civil_rights', priority: 5 },
  ];

  for (const pref of issuePrefs) {
    await prisma.userIssuePreference.upsert({
      where: {
        userId_issueId: {
          userId: pref.userId,
          issueId: pref.issueId,
        },
      },
      update: {},
      create: pref,
    });
  }
  console.log(`  ✓ ${issuePrefs.length} issue preferences for premium user`);

  // --- Sample Alerts ---

  await prisma.alert.createMany({
    data: [
      {
        userId: premiumUser.id,
        savedOfficialId: (await prisma.savedOfficial.findFirst({
          where: { bioguideId: 'P000197', userId: premiumUser.id },
        }))?.id,
        type: 'new_vote',
        title: 'Pelosi voted YEA on CHIPS Act Extension',
        body: 'Representative Pelosi voted in favor of extending CHIPS and Science Act funding. The measure passed 267-158.',
        referenceId: 'roll-2024-450',
        read: false,
        emailSent: true,
      },
      {
        userId: premiumUser.id,
        savedOfficialId: (await prisma.savedOfficial.findFirst({
          where: { bioguideId: 'S000148', userId: premiumUser.id },
        }))?.id,
        type: 'new_bill',
        title: 'Schumer introduced S.4521 — Federal Housing Access Act',
        body: 'Senator Schumer introduced legislation aimed at expanding federal housing voucher programs and increasing affordable housing construction.',
        referenceId: 'S-4521',
        read: false,
        emailSent: false,
      },
    ],
    skipDuplicates: true,
  });
  console.log(`  ✓ Sample alerts created`);

  // --- Cached Profiles (sample) ---

  const cacheExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now

  await prisma.cachedProfile.upsert({
    where: { bioguideId: 'P000197' },
    update: { expiresAt: cacheExpiry },
    create: {
      bioguideId: 'P000197',
      name: 'Nancy Pelosi',
      data: {
        name: 'Nancy Pelosi',
        title: 'Representative',
        party: 'Democratic',
        state: 'California',
        district: '11',
        _cached: true,
        _note: 'This is sample cached data for development',
      },
      expiresAt: cacheExpiry,
    },
  });
  console.log(`  ✓ Sample cache entries created`);

  // --- Cached Zip Lookup ---

  const zipExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.cachedZipLookup.upsert({
    where: { zipCode: '60188' },
    update: { expiresAt: zipExpiry },
    create: {
      zipCode: '60188',
      state: 'Illinois',
      district: '6th',
      data: {
        zipCode: '60188',
        state: 'Illinois',
        district: '6th',
        officials: [
          { name: 'Sean Casten', title: 'U.S. Representative', party: 'Democratic' },
          { name: 'Dick Durbin', title: 'U.S. Senator', party: 'Democratic' },
          { name: 'Tammy Duckworth', title: 'U.S. Senator', party: 'Democratic' },
        ],
        _cached: true,
      },
      expiresAt: zipExpiry,
    },
  });
  console.log(`  ✓ Sample zip lookup cache created`);

  // --- Summary ---

  const counts = {
    users: await prisma.user.count(),
    savedOfficials: await prisma.savedOfficial.count(),
    issuePrefs: await prisma.userIssuePreference.count(),
    alerts: await prisma.alert.count(),
    cachedProfiles: await prisma.cachedProfile.count(),
    cachedZips: await prisma.cachedZipLookup.count(),
  };

  console.log('\n📊 Database summary:');
  console.log(`   Users:              ${counts.users}`);
  console.log(`   Saved Officials:    ${counts.savedOfficials}`);
  console.log(`   Issue Preferences:  ${counts.issuePrefs}`);
  console.log(`   Alerts:             ${counts.alerts}`);
  console.log(`   Cached Profiles:    ${counts.cachedProfiles}`);
  console.log(`   Cached Zip Lookups: ${counts.cachedZips}`);
  console.log('\n✅ Seed complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
