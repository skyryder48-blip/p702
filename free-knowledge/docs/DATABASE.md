# free-civics — Database Guide

## Overview

free-civics uses **PostgreSQL** as its database, managed through **Prisma ORM**. The same database engine runs in development and production — transitioning to deployment is a connection string swap.

```
Development:  Local PostgreSQL → postgresql://localhost:5432/freecivics
Production:   Neon (free tier) → postgresql://user:pass@neon.tech/freecivics
```

No migration, no schema changes, no compatibility issues.

---

## Quick Start

### Option A: Automated Setup (Recommended)

```bash
node scripts/setup.mjs
```

This walks you through everything interactively.

### Option B: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local
cp .env.example .env.local

# 3. Set your DATABASE_URL in .env.local
#    Local: postgresql://postgres:postgres@localhost:5432/freecivics
#    Neon:  postgresql://user:pass@ep-xxx.neon.tech/freecivics?sslmode=require

# 4. Create the local database (if using local PostgreSQL)
createdb freecivics

# 5. Push the schema to create tables
npx prisma db push

# 6. Generate Prisma client
npx prisma generate

# 7. Seed test data (optional)
npm run db:seed

# 8. Start developing
npm run dev
```

---

## Installing PostgreSQL Locally

### macOS (Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16

# Verify
psql --version
```

### Ubuntu / Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Verify
psql --version
```

### Windows
1. Download installer from https://www.postgresql.org/download/windows/
2. Run the installer (include pgAdmin if you want a GUI)
3. Default port: 5432, default user: postgres
4. Verify: Open Command Prompt → `psql --version`

### Skip Local Install (Use Hosted)
If you don't want to install PostgreSQL locally, sign up for Neon (free):
1. Go to https://neon.tech
2. Create a project
3. Copy the connection string into your .env.local
4. Everything else works the same

---

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `User` | User accounts (NextAuth + tier + preferences) |
| `Account` | OAuth provider connections (Google, GitHub) |
| `Session` | Active user sessions |
| `VerificationToken` | Email verification tokens |
| `SavedOfficial` | Officials a user has saved for tracking |
| `Alert` | Notifications for saved officials (new votes, bills) |
| `UserIssuePreference` | User's issue priority rankings |
| `SearchHistory` | Search queries for analytics |
| `CachedProfile` | PostgreSQL-backed cache for official profiles |
| `CachedZipLookup` | PostgreSQL-backed cache for zip lookups |
| `UsageMetric` | Aggregated feature usage analytics |

### Key Design Decisions

**PostgreSQL-backed caching**: In addition to the in-memory LRU cache, profiles and zip lookups are cached in PostgreSQL. This survives server restarts and serverless cold starts (important on Vercel/Neon where functions spin down).

**Full-text search**: The Prisma schema enables PostgreSQL's built-in full-text search for official name lookups. No external search service needed.

**Anonymous analytics**: UsageMetric stores aggregated counts by feature/tier/day. No PII is stored — it answers questions like "how many free users viewed the finance tab this week" without tracking individuals.

**Tier expiration**: The `tierExpiresAt` field on User enables time-limited premium access (e.g., monthly subscriptions). A scheduled job checks for expired tiers and downgrades users automatically.

---

## Common Commands

```bash
# Start development server
npm run dev

# Open visual database browser
npm run db:studio

# Push schema changes (no migration files)
npm run db:push

# Create a migration file (for production tracking)
npm run db:migrate

# Re-seed test data
npm run db:seed

# Check database health
curl http://localhost:3000/api/health/db
```

---

## Visual Database Tools

### Prisma Studio (Built-in, Recommended)
```bash
npx prisma studio
```
Opens a web-based data browser at http://localhost:5555. View, edit, add, and delete records in any table. No installation required.

### pgAdmin (Free, Full-Featured)
Download from https://www.pgadmin.org. Full PostgreSQL management GUI with query editor, table designer, and monitoring dashboards.

### HeidiSQL (Free, Windows/Wine)
Download from https://www.heidisql.com. Lightweight GUI that connects to PostgreSQL, MySQL, MariaDB, and SQL Server. Good for quick data browsing and simple queries.

### DBeaver (Free, Cross-Platform)
Download from https://dbeaver.io. Professional database tool supporting 80+ databases. Full ER diagram generation, data export, and SQL editor.

---

## Development → Production Transition

### Step 1: Create a Neon Account
1. Go to https://neon.tech and sign up (free)
2. Create a new project (name: "freecivics")
3. Copy the connection string

### Step 2: Update Connection String
In your `.env.local` (or Vercel environment variables):
```
DATABASE_URL=postgresql://user:pass@ep-cool-name-12345.us-east-2.aws.neon.tech/freecivics?sslmode=require
```

### Step 3: Push Schema
```bash
npx prisma db push
```

### Step 4: Deploy
```bash
# If using Vercel
vercel deploy
```

That's it. The schema, queries, and application code are identical between local and production. Only the connection string changes.

---

## Backup & Restore

### Local Backup
```bash
pg_dump freecivics > backup.sql
```

### Restore
```bash
psql freecivics < backup.sql
```

### Neon Backups
Neon automatically retains 30 days of WAL logs. You can restore to any point within that window from their dashboard. Branches also work as instant, zero-cost snapshots.

---

## Test Accounts (After Seeding)

| Email | Password | Tier |
|-------|----------|------|
| free@test.com | testpass123 | free |
| premium@test.com | testpass123 | premium |
| admin@test.com | testpass123 | institutional |

---

## Troubleshooting

**"Connection refused" on localhost**
- Is PostgreSQL running? `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Correct port? Default is 5432

**"Database does not exist"**
- Create it: `createdb freecivics`

**"Role does not exist"**
- Create a user: `createuser --superuser postgres`
- Or use your system username in the connection string

**"Schema push failed"**
- Check DATABASE_URL format in .env.local
- Try: `npx prisma db push --accept-data-loss`

**Prisma client errors after schema change**
- Regenerate: `npx prisma generate`
- Restart dev server

**"Cannot find module '@prisma/client'"**
- Run: `npx prisma generate`
- Then: `npm run dev`
