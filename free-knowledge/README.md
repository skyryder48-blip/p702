# free-civics

Transparent civic intelligence. Look up your elected officials by zip code and explore their voting records, campaign finance, committee assignments, and legislative history.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env.local

# 3. Set up PostgreSQL and run migrations
#    (update DATABASE_URL in .env.local first)
npx prisma migrate deploy

# 4. Seed test data
npm run db:seed

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values. See the file for detailed comments on each variable.

### Required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | JWT signing key — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Canonical app URL (e.g. `https://freecivics.org`) |
| `CONGRESS_API_KEY` | Congress.gov API — [register here](https://api.congress.gov/sign-up/) |

### Recommended

| Variable | Purpose |
|----------|---------|
| `FEC_API_KEY` | Campaign finance data — [register here](https://api.open.fec.gov/developers/) |
| `GOOGLE_CIVIC_API_KEY` | Zip-to-representative lookup — [Google Cloud Console](https://console.cloud.google.com/) |

### Optional

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth login |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth login |
| `ANTHROPIC_API_KEY` | AI synthesis features |
| `NEWS_API_KEY` | News aggregation |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm start` | Start production server |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:push` | Push schema to DB (quick sync, no migration history) |
| `npm run db:seed` | Seed database with test data |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:health` | Check database health via API |

## Project Structure

```
src/
  app/              # Next.js App Router pages and API routes
    api/
      auth/         # NextAuth.js endpoints + registration
      civics/       # Public data APIs (members, zip, issues, compare)
      health/       # Health check endpoint
      user/         # Authenticated user endpoints
  components/       # React components
  core/
    auth/           # Tier definitions, rate limiting, server-side gating
    engines/        # Data fetching adapters (Congress, FEC, Civic, News)
  lib/              # Prisma client, DB helpers, caching, analytics
prisma/
  schema.prisma     # Database schema
  migrations/       # Versioned migration files
  seed.ts           # Test data seeder
docs/               # Architecture, database, feature spec docs
```

## Deployment

### Vercel + Neon (recommended)

1. Push to GitHub
2. Import into [Vercel](https://vercel.com)
3. Create a [Neon](https://neon.tech) PostgreSQL database
4. Set environment variables in Vercel dashboard (see table above)
5. Vercel runs `npm run build` automatically (includes `prisma generate`)
6. Run `npx prisma migrate deploy` against your production database

### Self-hosted

```bash
npm ci
npx prisma migrate deploy
npm run build
npm start
```

### Health Monitoring

The `/api/health` endpoint returns database connectivity and latency:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-20T00:00:00.000Z",
  "checks": {
    "database": { "ok": true, "latencyMs": 3 }
  }
}
```

Returns `200` when healthy, `503` when degraded.

## Tier System

| Tier | Access |
|------|--------|
| **Free** | Profile overview, 5 recent bills, 5 recent votes, 3 news items, zip lookup |
| **Premium** | Full vote history, campaign finance, comparisons, metrics, alerts |
| **Institutional** | Expenditure data, CSV/API export, 200 req/min rate limit |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, data pipeline, adapter pattern
- [Database](docs/DATABASE.md) — schema, setup, migrations
- [Development Guide](docs/DEVELOPMENT-GUIDE.md) — project structure, phase status
- [Feature Spec](docs/FEATURE-SPEC.md) — feature requirements and tiers
- [Auth Evaluation](docs/AUTH-EVALUATION.md) — NextAuth vs Clerk decision

## License

Private — all rights reserved.
