#!/usr/bin/env node

// ============================================================
// free-civics — Project Setup Script
// Run: node scripts/setup.mjs
//
// Walks you through first-time setup:
//   1. Checks for PostgreSQL
//   2. Creates .env.local from template
//   3. Initializes the database
//   4. Seeds test data
//   5. Verifies everything works
// ============================================================

import { execSync, exec } from 'child_process';
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(icon, msg) { console.log(`  ${icon} ${msg}`); }
function success(msg) { log(`${GREEN}✓${RESET}`, msg); }
function warn(msg) { log(`${YELLOW}!${RESET}`, msg); }
function fail(msg) { log(`${RED}✗${RESET}`, msg); }
function info(msg) { log(`${CYAN}→${RESET}`, msg); }
function header(msg) { console.log(`\n${BOLD}${msg}${RESET}`); }

function run(cmd, silent = false) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
    });
  } catch {
    return null;
  }
}

function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`
${BOLD}╔══════════════════════════════════════╗
║   ${GREEN}free-civics${RESET}${BOLD} — Project Setup        ║
║   Know Your Government               ║
╚══════════════════════════════════════╝${RESET}
`);

  // === Step 1: Check Node.js ===
  header('Step 1: Checking prerequisites');

  const nodeVersion = process.version;
  if (parseInt(nodeVersion.slice(1)) >= 18) {
    success(`Node.js ${nodeVersion} detected`);
  } else {
    fail(`Node.js 18+ required (found ${nodeVersion})`);
    process.exit(1);
  }

  // === Step 2: Check PostgreSQL ===
  header('Step 2: PostgreSQL');

  const pgInstalled = commandExists('psql');
  if (pgInstalled) {
    const pgVersion = run('psql --version', true)?.trim();
    success(`PostgreSQL found: ${pgVersion}`);
  } else {
    warn('PostgreSQL not found on PATH');
    console.log(`
${DIM}  Install PostgreSQL:
    macOS:   brew install postgresql@16 && brew services start postgresql@16
    Ubuntu:  sudo apt install postgresql postgresql-contrib
    Windows: Download from https://www.postgresql.org/download/windows/
    
  Or use a hosted database (no local install needed):
    Neon:     https://neon.tech (free tier, recommended)
    Supabase: https://supabase.com (free tier)${RESET}
`);

    const proceed = await ask(`  Continue without local PostgreSQL? (y/n): `);
    if (proceed.toLowerCase() !== 'y') {
      info('Install PostgreSQL and run this script again.');
      rl.close();
      process.exit(0);
    }
  }

  // === Step 3: npm install ===
  header('Step 3: Installing dependencies');

  if (!existsSync('node_modules')) {
    info('Running npm install...');
    run('npm install');
    success('Dependencies installed');
  } else {
    success('Dependencies already installed');
  }

  // === Step 4: Environment file ===
  header('Step 4: Environment configuration');

  if (existsSync('.env.local')) {
    success('.env.local already exists');
    const overwrite = await ask(`  Overwrite with fresh template? (y/n): `);
    if (overwrite.toLowerCase() !== 'y') {
      info('Keeping existing .env.local');
    } else {
      copyFileSync('.env.example', '.env.local');
      success('.env.local created from template');
    }
  } else {
    copyFileSync('.env.example', '.env.local');
    success('.env.local created from template');
  }

  // Prompt for DATABASE_URL
  console.log(`
${DIM}  Database connection string format:
    Local:  postgresql://user:password@localhost:5432/freecivics
    Neon:   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/freecivics?sslmode=require${RESET}
`);

  const defaultUrl = 'postgresql://postgres:postgres@localhost:5432/freecivics';
  const dbUrl = await ask(`  DATABASE_URL [${DIM}${defaultUrl}${RESET}]: `);
  const finalDbUrl = dbUrl.trim() || defaultUrl;

  // Update .env.local with the database URL
  let envContent = readFileSync('.env.local', 'utf8');
  envContent = envContent.replace(
    /DATABASE_URL=.*/,
    `DATABASE_URL=${finalDbUrl}`
  );

  // Generate NEXTAUTH_SECRET
  const randomSecret = run(
    'openssl rand -base64 32',
    true
  )?.trim() || `secret-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  envContent = envContent.replace(
    /NEXTAUTH_SECRET=.*/,
    `NEXTAUTH_SECRET=${randomSecret}`
  );

  writeFileSync('.env.local', envContent);
  success('DATABASE_URL configured');
  success('NEXTAUTH_SECRET generated');

  // === Step 5: Create database (local only) ===
  if (finalDbUrl.includes('localhost')) {
    header('Step 5: Creating local database');

    const dbName = finalDbUrl.split('/').pop()?.split('?')[0] || 'freecivics';

    if (pgInstalled) {
      const exists = run(`psql -lqt 2>/dev/null | grep -w ${dbName}`, true);
      if (exists) {
        success(`Database "${dbName}" already exists`);
      } else {
        info(`Creating database "${dbName}"...`);
        const created = run(`createdb ${dbName} 2>&1`, true);
        if (created !== null) {
          success(`Database "${dbName}" created`);
        } else {
          warn(`Could not create database automatically. Run manually:`);
          console.log(`${DIM}    createdb ${dbName}${RESET}`);
        }
      }
    } else {
      warn('Cannot create database without psql. Create it manually.');
    }
  } else {
    header('Step 5: Using remote database');
    success(`Connecting to remote PostgreSQL`);
  }

  // === Step 6: Push schema ===
  header('Step 6: Pushing database schema');

  info('Running prisma db push...');
  const pushResult = run('npx prisma db push --accept-data-loss 2>&1', true);
  if (pushResult !== null) {
    success('Schema pushed to database');
  } else {
    fail('Schema push failed. Check your DATABASE_URL and try:');
    console.log(`${DIM}    npx prisma db push${RESET}`);
  }

  // === Step 7: Generate Prisma client ===
  header('Step 7: Generating Prisma client');

  run('npx prisma generate', true);
  success('Prisma client generated');

  // === Step 8: Seed ===
  header('Step 8: Seeding test data');

  const seed = await ask(`  Seed database with test users and sample data? (y/n): `);
  if (seed.toLowerCase() === 'y') {
    info('Seeding...');
    const seedResult = run('npx tsx prisma/seed.ts 2>&1', true);
    if (seedResult) {
      console.log(seedResult);
      success('Database seeded');
    } else {
      warn('Seed failed. Run manually: npm run db:seed');
    }
  } else {
    info('Skipping seed');
  }

  // === Done ===
  console.log(`
${BOLD}${GREEN}╔══════════════════════════════════════╗
║   Setup complete!                    ║
╚══════════════════════════════════════╝${RESET}

  ${BOLD}Start developing:${RESET}
    ${CYAN}npm run dev${RESET}         Start Next.js dev server
    ${CYAN}npx prisma studio${RESET}   Visual database browser

  ${BOLD}Test accounts:${RESET} ${DIM}(if seeded)${RESET}
    ${DIM}free@test.com / testpass123       (free tier)
    premium@test.com / testpass123    (premium tier)
    admin@test.com / testpass123      (institutional)${RESET}

  ${BOLD}Tier testing:${RESET}
    Set ${CYAN}NEXT_PUBLIC_AUTH_PROVIDER=stub${RESET} in .env.local
    Set ${CYAN}NEXT_PUBLIC_FORCE_TIER=premium${RESET} to test premium features

  ${BOLD}Useful commands:${RESET}
    ${CYAN}npm run db:push${RESET}     Push schema changes
    ${CYAN}npm run db:migrate${RESET}  Create migration files
    ${CYAN}npm run db:studio${RESET}   Visual database browser
    ${CYAN}npm run db:seed${RESET}     Re-seed test data
`);

  rl.close();
}

main().catch((e) => {
  console.error('\n❌ Setup failed:', e.message);
  rl.close();
  process.exit(1);
});
