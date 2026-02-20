# free-knowledge — Architecture

## Overview

free-knowledge is a modular research/dossier engine that aggregates, synthesizes, and presents biographical and contextual information about any subject (person, company, organization, topic).

## Core Design Principles

1. **Adapter Pattern** — Each data source is an isolated adapter implementing a common interface. Adding a new source means adding one file.
2. **Pipeline Architecture** — Raw data flows through: Collection → Normalization → Synthesis → Presentation
3. **Configuration-Driven Verticals** — Niche versions are configuration profiles, not separate codebases. A profile defines which adapters to use, how to weight data, what prompts to use for synthesis, and which UI template to render.
4. **Caching Layer** — Aggressive caching to minimize API costs and improve response times.

## Data Pipeline

```
[User Query]
     │
     ▼
[Orchestrator] ── decides which adapters to invoke based on subject type + config profile
     │
     ├── [Wikipedia Adapter]     → biographical data, summary, infobox
     ├── [Wikidata Adapter]      → structured facts, relationships, identifiers
     ├── [News Adapter]          → recent articles, headlines, sentiment
     ├── [Web Search Adapter]    → supplementary context, fills gaps
     └── [Custom Adapters...]    → extensible per vertical
     │
     ▼
[Normalizer] ── transforms all adapter outputs into a unified SubjectProfile schema
     │
     ▼
[Synthesis Engine] ── AI-powered layer that:
     │   - Generates readable biographical summary
     │   - Identifies key themes and career milestones
     │   - Flags notable controversies or achievements
     │   - Produces domain-specific analysis (per config)
     │
     ▼
[SubjectProfile] ── final structured output ready for presentation
```

## Subject Profile Schema

```typescript
interface SubjectProfile {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'topic' | 'event';
  summary: string;                    // AI-synthesized overview
  biography: BiographySection[];      // chronological life/history
  keyFacts: KeyFact[];                // structured quick-reference data
  news: NewsArticle[];                // recent coverage
  timeline: TimelineEvent[];          // major events/milestones
  associations: Association[];        // related people/orgs
  sources: Source[];                  // attribution for all data
  metadata: ProfileMetadata;          // generated timestamp, confidence, etc.
  deepDive?: DeepDiveSection[];       // premium: in-depth analysis areas
}
```

## Configuration Profiles

```typescript
interface VerticalConfig {
  id: string;
  name: string;                       // e.g., "Investor Research"
  adapters: AdapterConfig[];          // which sources + priority
  synthesisPrompt: string;            // domain-specific AI instructions
  uiTemplate: string;                 // presentation template ID
  features: FeatureFlags;             // what's enabled (deepDive, alerts, export)
  rateLimits: RateLimitConfig;        // per-tier usage limits
}
```

## Business Tiers

| Tier | Description | Revenue Model |
|------|-------------|---------------|
| Free Public | General biographical lookup, rate-limited | Donations, sponsorships, funnel |
| Niche Paid | Vertical-specific (investors, journalists, HR) | Monthly subscription |
| Institutional | Self-hosted or dedicated, branded, full API | Per-seat licensing |

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Data Sources**: Wikipedia API, Wikidata API, NewsAPI/GNews, Web Search
- **AI Synthesis**: Anthropic Claude API
- **Caching**: Redis (production) / In-memory LRU (development)
- **Database**: PostgreSQL (user accounts, saved profiles, analytics)
- **Hosting**: Vercel (free tier to start)
