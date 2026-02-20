# free-civics — Architecture

## Overview

free-civics is a civic transparency platform built on the free-knowledge engine pattern. It aggregates data from government APIs (Congress.gov, FEC, Google Civic Info), biographical sources (Wikipedia, Wikidata), and news feeds to present comprehensive profiles of U.S. government officials.

## Core Design Principles

1. **Adapter Pattern** — Each data source is an isolated adapter implementing a common interface (`BaseAdapter`). Adding a new source means adding one file under `src/core/adapters/`.
2. **Pipeline Architecture** — Raw data flows through: Collection → Validation (Zod) → Synthesis (Claude AI) → Presentation
3. **Configuration-Driven Verticals** — The free-knowledge engine supports multiple verticals via configuration profiles. free-civics is the first vertical, defining which adapters to use, how to weight data, what prompts to use for synthesis, and which UI template to render.
4. **Caching Layer** — Two-tier caching: in-memory LRU for hot-path speed, PostgreSQL-backed cache for persistence across serverless cold starts.
5. **Resilience** — Retry with exponential backoff, circuit breakers on external APIs, Zod validation on all API responses, graceful degradation when adapters fail.

## Data Pipeline

```
[User Query: "Nancy Pelosi" or "60188"]
     │
     ▼
[Orchestrator] ── coordinates adapters based on query type
     │
     ├── [CongressAdapter]        → member data, bills, votes, committees
     ├── [CampaignFinanceAdapter] → donors, industries, FEC data
     ├── [CivicInfoAdapter]       → zip → representatives, contact info
     ├── [WikipediaAdapter]       → biographical background
     ├── [WikidataAdapter]        → structured facts (birth, education, etc.)
     └── [NewsAdapter]            → recent coverage
     │
     ▼
[Specialized Engines]
     ├── [ScorecardEngine]    → raw metrics with chamber benchmarks (no grades)
     ├── [LegislationEngine]  → AI bill summaries, vote categorization
     ├── [CompareEngine]      → side-by-side analysis
     └── [IssuesEngine]       → "What Affects Me" filtering
     │
     ▼
[OfficialProfile] → Complete civic dossier
```

## Key Types

```typescript
// From src/core/adapters/government/index.ts
interface MemberSummary {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: 'senate' | 'house';
  // ... plus district, terms, depiction, etc.
}

interface BillSummary {
  congress: number;
  type: string;
  number: number;
  title: string;
  policyArea?: string;
  latestAction?: string;
}

interface ZipLookupResult {
  zipCode: string;
  state: string;
  city: string;
  officials: RepresentativeInfo[];
}
```

## Business Tiers

| Tier | Description | Revenue Model |
|------|-------------|---------------|
| Free | Official profiles, zip lookup, basic scorecard, recent votes | $0 |
| Premium | Full scorecard, issue reports, comparisons, PDF export, alerts | $9.99/mo |
| Institutional | API access, bulk data, custom branding, self-hosted option | Custom |

Feature gating is defined in `src/core/auth/tiers.ts` (35+ features) and enforced both client-side (`<FeatureGate>`) and server-side (`gateProfileResponse()`).

## Tech Stack

- **Framework**: Next.js 14 (App Router, Server Components)
- **Language**: TypeScript
- **Auth**: NextAuth.js v4 (JWT strategy, Google + GitHub + Credentials)
- **Data Sources**: Congress.gov API, FEC API, Google Civic Info API, Wikipedia API, Wikidata API, GNews API
- **AI Synthesis**: Anthropic Claude API
- **Validation**: Zod (all external API responses)
- **Caching**: In-memory LRU + PostgreSQL (two-tier)
- **Database**: PostgreSQL via Prisma ORM (Neon for production)
- **Hosting**: Vercel (free tier to start)
