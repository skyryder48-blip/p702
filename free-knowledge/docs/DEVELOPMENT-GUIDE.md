# free-civics — Development Guide

## Project State as of Phase 1

### What Exists

The project has 46 source files across three layers: a backend data layer (adapters, engines, types), an authentication and gating system, and a Phase 1 frontend vertical slice.

#### Data Layer (built, not yet tested against live APIs)

```
src/core/adapters/government/
  congress.ts            Congress.gov API — members, bills, votes, committees
  campaign-finance.ts    FEC API — contributions, PACs, expenditures, filings
  civic-info.ts          Google Civic Info — zip → representatives
  index.ts               Shared types and base class

src/core/adapters/
  wikipedia.ts           Wikipedia biographical data
  wikidata.ts            Wikidata structured facts
  news.ts                News article aggregation

src/core/
  orchestrator.ts        Coordinates adapters into unified profiles
  cache/index.ts         In-memory LRU cache with TTL
  synthesis/index.ts     AI-powered text synthesis (Anthropic)

src/engines/
  scorecard/index.ts     Metrics dashboard (raw data, no letter grades)
  legislation/index.ts   Bill summarization and vote categorization
  compare/index.ts       Side-by-side official comparison
  issues/index.ts        Issue-specific reports across 12 categories

src/config/
  civics.ts              CivicsOrchestrator — top-level coordinator
  profiles.ts            Vertical configuration definitions
```

#### Auth & Gating (built, not yet active in frontend)

```
src/core/auth/
  tiers.ts               35+ features with tier requirements (free/premium/institutional)
  adapter.ts             Provider-agnostic auth (StubAuthAdapter + NextAuthAdapter)
  components.tsx          <FeatureGate>, <TeaserList>, <AuthProvider>, upgrade prompts
  middleware.ts           Server-side gateProfileResponse(), requireFeature(), getRateLimit()
  use-civics-auth.ts     Client hook: canAccess(), getGate(), applyLimit()
  EXAMPLES.ts            Integration examples
  index.ts               Barrel exports

src/app/api/auth/
  [...nextauth]/options.ts   Google + GitHub + credentials providers, JWT strategy
  [...nextauth]/route.ts     NextAuth route handler
  register/route.ts          Email/password signup with bcrypt

src/middleware.ts            Edge middleware — public vs premium vs admin routes
src/app/providers.tsx        SessionProvider + AuthProvider wrapper
```

#### Database (schema built, not yet deployed)

```
prisma/schema.prisma     10 tables: User, Account, Session, VerificationToken,
                         SavedOfficial, Alert, UserIssuePreference,
                         SearchHistory, CachedProfile, CachedZipLookup, UsageMetric
prisma/seed.ts           3 test users, sample data
src/lib/prisma.ts        Singleton client
src/lib/db.ts            Health checks, cache management, tier management, analytics
```

#### Phase 1 Frontend (built, wired to live APIs)

```
src/app/
  layout.tsx             Root layout, sticky header, providers
  globals.css            Full design system — CSS variables, typography, components
  page.tsx               Landing page with zip code search
  reps/page.tsx          Representatives list (fetches /api/civics/zip)
  official/[id]/page.tsx Profile with Overview, Legislation, Finance tabs

src/app/api/civics/
  zip/route.ts           Google Civic Info → representative list
  member/[id]/route.ts   Congress.gov → member details + bills
  member/[id]/finance/route.ts  FEC → fundraising totals + top contributors
```

### What Does NOT Exist Yet

- No voting record display (Congress.gov vote endpoints need integration)
- No committee assignment display
- No Wikipedia/Wikidata integration in the profile page
- No news feed on profiles
- Auth UI (login, register, dashboard) not built
- FeatureGate not wired into any page
- Compare view not built
- Issue reports not built
- PostgreSQL cache not wired to API routes (only in-memory LRU exists)
- No error boundaries, no SEO metadata per page
- No mobile navigation
- No deployment configuration

---

## Phase 2 — Core Pages

Phase 2 turns the skeleton into a complete product. Each task below is scoped to a single file or a small cluster of files.

### 2.1 Voting Record Tab

**Goal:** Add a "Votes" tab to the official profile showing recent roll call votes with the member's position.

**API work:**
- Create `src/app/api/civics/member/[id]/votes/route.ts`
- This endpoint calls Congress.gov's roll call vote endpoints (added May 2025 for the House)
- For each vote, return: date, question, result, member's position (Yea/Nay/Not Voting), party breakdown
- Congress.gov does not have a "votes by member" endpoint, so the approach is: fetch recent chamber votes, then fetch detail for each to find the member's position. This is expensive. Cache aggressively.

**Frontend work:**
- Add a `VotesTab` component inside `src/app/official/[id]/page.tsx`
- Display as a table: Date, Bill/Question, Member's Vote (color-coded: green for Yea, red for Nay, gray for Not Voting), Result, Party Split
- Add the tab to the tab bar

**Cache consideration:**
- Votes change infrequently. Cache the member's vote list in `CachedProfile.data` JSON field
- TTL: 30 minutes for current session, 6 hours in PostgreSQL cache

**Known risk:** The Congress.gov vote-by-member approach requires multiple sequential API calls. If this is too slow, consider building a nightly batch job that fetches all votes and stores them locally. For now, limit to the 20 most recent votes and accept the latency.

### 2.2 Committee Assignments

**Goal:** Show committee and subcommittee memberships on the profile.

**API work:**
- Congress.gov member detail already returns some committee data, but it may be sparse
- Create `src/app/api/civics/member/[id]/committees/route.ts`
- Fetch from `/v3/committee?congress=119&limit=250`, then filter for the member's bioguide ID
- Alternatively, check if the member detail endpoint's `committees` field is populated

**Frontend work:**
- Add a "Committees" section to the Overview tab (not a separate tab — committees are supplementary)
- Display: Committee name, role (Chair/Ranking Member/Member), jurisdiction description
- Link each committee to its Congress.gov page

### 2.3 Wikipedia/Wikidata Biography

**Goal:** Add biographical context from Wikipedia to the profile overview.

**Integration point:** The `wikipedia.ts` and `wikidata.ts` adapters already exist and extract biographical data. They need to be called from the profile API route.

**API work:**
- In `src/app/api/civics/member/[id]/route.ts`, after fetching from Congress.gov, also fetch from Wikipedia using the member's name
- Return a `biography` field with: summary paragraph, education, career before Congress, personal details
- Wikidata provides structured facts (birth date, alma mater, spouse) that fill gaps in Congress.gov data

**Frontend work:**
- Add a biography section to the Overview tab, between the hero card and the stats grid
- Style as a prose paragraph with the civil rights editorial feel (Playfair Display for pull quotes, Source Serif for body)

**Risk:** Name matching between Congress.gov and Wikipedia is imperfect. "Nancy Pelosi" works fine; "Robert P. Casey Jr." might not. Implement fuzzy matching or allow the API to return a "biography not found" state gracefully.

### 2.4 News Feed

**Goal:** Show recent news articles about the official.

**API work:**
- The `news.ts` adapter exists but needs a concrete API behind it
- Options: NewsAPI.org (free tier: 100 requests/day, 1-month lookback), GNews API, or web scraping
- Create `src/app/api/civics/member/[id]/news/route.ts`
- Search for the member's name, filter for relevance

**Frontend work:**
- Add a "News" section to the Overview tab (below biography, above legislation)
- Show 3-5 articles: headline, source, date, 1-line excerpt
- Link to original article

**Cache:** News changes daily. Cache for 2 hours.

### 2.5 Compare View

**Goal:** Side-by-side comparison of two officials.

**Page:** Create `src/app/compare/page.tsx`
- URL: `/compare?a=P000197&b=S000148`
- Two-column layout with the same data sections aligned horizontally
- Highlight differences: voting alignment percentage, funding source differences, legislative focus areas

**API work:**
- Create `src/app/api/civics/compare/route.ts`
- Accepts two bioguide IDs, fetches both profiles, returns comparison data
- The `CompareEngine` at `src/engines/compare/index.ts` already has comparison logic — wire it up

**Gating:** This is a premium feature. Wrap the page in `<FeatureGate feature="compare.side_by_side">`.

### 2.6 Issue Reports

**Goal:** Show how an official's record relates to specific issues (healthcare, economy, etc.).

**Page:** Create `src/app/issues/page.tsx`
- URL: `/issues?official=P000197&issue=healthcare`
- Pulls relevant votes, bills, and campaign contributions for the issue
- The `IssuesEngine` at `src/engines/issues/index.ts` handles categorization

**Gating:** Premium feature. Free users see the issue list but not the detailed reports.

### 2.7 Metrics Dashboard

**Goal:** Present raw performance data with benchmarks on the profile.

**Current state:** The `ScorecardEngine` at `src/engines/scorecard/index.ts` generates raw metrics across six dimensions. The original grading system was removed per your request — it now returns numeric scores and contextual benchmarks without letter grades.

**Frontend work:**
- Add a "Metrics" tab to the official profile
- Display each dimension as a horizontal bar with the member's value and the chamber average
- Include explanatory text for each metric (what it measures, what the benchmark means)
- No grades, no judgments — just data and context

---

## Phase 3 — User System

Phase 3 activates the auth system that's already built and creates the user-facing UI for it.

### 3.1 Auth Pages

**Create these pages:**

```
src/app/login/page.tsx       Email/password + OAuth buttons (Google, GitHub)
src/app/register/page.tsx    Email/password signup form
src/app/upgrade/page.tsx     Premium upsell page (placeholder for future Stripe)
```

**The backend already exists:**
- `src/app/api/auth/[...nextauth]/options.ts` has Google, GitHub, and credentials providers configured
- `src/app/api/auth/register/route.ts` handles email/password signup with bcrypt
- `src/app/providers.tsx` wraps SessionProvider

**Implementation notes:**
- Use `signIn()` and `signOut()` from `next-auth/react`
- The login page should show OAuth buttons prominently, with email/password as a secondary option
- After login, redirect to the page the user was trying to access (use `callbackUrl` param)
- The register page posts to `/api/auth/register`, then auto-signs in
- Style everything in the civil rights design system — mahogany, gold, parchment

### 3.2 User Dashboard

**Create:** `src/app/dashboard/page.tsx`

This page requires authentication. If not logged in, redirect to `/login`.

**Sections:**
1. **My Representatives** — If the user has a `zipCode` in their profile, auto-fetch and display their reps
2. **Saved Officials** — List of officials the user has saved (from `SavedOfficial` table)
3. **Issue Preferences** — Ranked list of issues the user cares about (from `UserIssuePreference` table)
4. **Alerts** — Recent notifications for saved officials (from `Alert` table)

**API routes needed:**
```
src/app/api/user/profile/route.ts        GET/PATCH user profile (zipCode, name)
src/app/api/user/saved/route.ts          GET/POST/DELETE saved officials
src/app/api/user/issues/route.ts         GET/PUT issue preference rankings
src/app/api/user/alerts/route.ts         GET alerts, PATCH mark as read
```

All of these read/write from the Prisma models that already exist in the schema.

### 3.3 Wire FeatureGate Into Pages

**The gating infrastructure is built.** The `<FeatureGate>` component, `canAccess()` helper, and tier definitions in `tiers.ts` are ready. They need to be integrated into the pages.

**Where to gate:**

| Feature | Behavior for Free Users |
|---------|------------------------|
| Profile Overview tab | Open |
| Profile Legislation tab | Teaser: show 5 bills, blur the rest |
| Profile Finance tab | Hidden for free users |
| Profile Votes tab | Teaser: show 5 votes |
| Profile Metrics tab | Premium only, teaser message |
| Compare view | Premium only, redirect to /upgrade |
| Issue reports | Premium only, show issue list but block reports |
| Export/PDF | Premium only |
| Saved officials | Auth required (any tier) |
| Alerts | Premium only |

**Implementation pattern:**
```tsx
// In any page component:
import { FeatureGate, TeaserList } from '@/core/auth/components';

<FeatureGate feature="legislation.sponsored_bills">
  <BillsTable bills={allBills} />
</FeatureGate>

// Or for data arrays with limits:
<TeaserList
  feature="legislation.recent_votes"
  items={votes}
  renderItem={(vote) => <VoteRow vote={vote} />}
/>
```

### 3.4 Server-Side Gating

**The middleware is built.** `src/core/auth/middleware.ts` exports `gateProfileResponse()` which strips premium fields from API responses before they reach the client.

**Wire it into API routes:**
```typescript
// In any API route:
import { gateProfileResponse } from '@/core/auth/middleware';

// After building the response:
const gatedResponse = gateProfileResponse(fullProfile, userTier);
return NextResponse.json(gatedResponse);
```

This ensures premium data never reaches free-tier clients, even if someone bypasses the frontend gates.

### 3.5 Upgrade Flow

**For now, gating is auth-only — no payment processing.** The `/upgrade` page should:
1. Explain what premium unlocks
2. Show a "Coming soon" or waitlist signup for paid tiers
3. Allow manual tier upgrades via the database for testing and early adopters

**The `upgradeTier()` function in `src/lib/db.ts` already handles tier changes.** When Stripe is added later, the webhook calls this function.

---

## Phase 4 — Production Readiness

### 4.1 PostgreSQL Cache Integration

**Current state:** API routes fetch from government APIs on every request. The in-memory LRU cache in `src/core/cache/index.ts` helps during a single server session but is lost on restart.

**Goal:** Wire the PostgreSQL-backed cache (`CachedProfile`, `CachedZipLookup` tables) into the API routes.

**Implementation:**
```
src/app/api/civics/member/[id]/route.ts
```
Before calling Congress.gov:
1. Check `getCachedProfile(bioguideId)` from `src/lib/db.ts`
2. If cache hit and not expired, return cached data
3. If cache miss, fetch from API, then call `setCachedProfile()` to store
4. Same pattern for zip lookups using `getCachedZipLookup()` / `setCachedZipLookup()`

**TTLs:**
- Member profiles: 30 minutes (data updates daily)
- Zip lookups: 24 hours (district boundaries rarely change)
- Finance data: 6 hours (FEC updates nightly)

**Cache purge:** Add a cron job or API endpoint that calls `purgeExpiredCache()` from `src/lib/db.ts` daily.

### 4.2 Error Boundaries

**Create:** `src/app/error.tsx` (Next.js App Router error boundary)

This catches unhandled errors in any page and shows a styled error screen instead of a white page. Also create `src/app/not-found.tsx` for 404s.

### 4.3 Loading States

**Create:** `src/app/loading.tsx` (global loading state)

Also ensure each page has its own `<Suspense>` fallback with skeleton UI. The Phase 1 pages already have skeletons — extend this pattern to all new pages.

### 4.4 SEO & Metadata

**Per-page metadata using Next.js `generateMetadata()`:**

```typescript
// src/app/official/[id]/page.tsx
export async function generateMetadata({ params }) {
  // Fetch member name for the title
  return {
    title: `${memberName} — free-civics`,
    description: `Voting record, campaign finance, and legislative history for ${memberName}`,
    openGraph: { ... },
  };
}
```

Add this to the official profile page, reps page, compare page, and issues page.

### 4.5 Mobile Navigation

**Current state:** The site header hides nav links at 480px via CSS `display: none`. This needs a mobile menu.

**Create:** A hamburger menu component that slides in from the right. Include: Search, About, Login/Dashboard, and (if logged in) Saved Officials.

### 4.6 Rate Limiting

**The tier system already defines rate limits in `tiers.ts`.** Implement them:
- Free: 20 requests/minute, 500/day
- Premium: 60 requests/minute, 5000/day
- Institutional: 200 requests/minute, unlimited

**Implementation:** Use the `getRateLimit()` function from `src/core/auth/middleware.ts`. Track request counts in the `UsageMetric` table or use a lightweight in-memory counter (Redis if available, otherwise Map with TTL).

### 4.7 Analytics Wiring

**The `trackUsage()` function in `src/lib/db.ts` exists.** Add it to key API routes:

```typescript
// At the end of successful API responses:
trackUsage({ feature: 'profile.view', tier: userTier, action: 'view' });
```

This populates the `UsageMetric` table with anonymous, aggregated data. No PII.

### 4.8 Deploy

**Target stack:**
- **App:** Vercel (free tier supports Next.js natively)
- **Database:** Neon (free tier: 0.5 GB, 191 compute hours/month)
- **Domain:** Point your domain at Vercel

**Steps:**
1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard (all API keys + `DATABASE_URL` + `NEXTAUTH_SECRET` + `NEXTAUTH_URL`)
4. Run `npx prisma db push` against the Neon connection string
5. Deploy

**Vercel environment variables to set:**
```
DATABASE_URL=postgresql://...@neon.tech/freecivics?sslmode=require
NEXTAUTH_SECRET=(generate with openssl rand -base64 32)
NEXTAUTH_URL=https://your-domain.com
CONGRESS_API_KEY=...
FEC_API_KEY=...
GOOGLE_CIVIC_API_KEY=...
GOOGLE_CLIENT_ID=...          (if using Google OAuth)
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...          (if using GitHub OAuth)
GITHUB_CLIENT_SECRET=...
```

---

## Phase 5 — Post-Launch Enhancements

These are not required for launch but represent the natural evolution of the product.

### 5.1 Stripe Integration

Add payment processing for premium tier.

**Files to create:**
```
src/app/api/stripe/checkout/route.ts     Create checkout session
src/app/api/stripe/webhook/route.ts      Handle payment events
src/app/api/stripe/portal/route.ts       Customer billing portal
```

**The database is ready:** `User.stripeCustomerId` and `User.tierExpiresAt` fields exist. The `upgradeTier()` and `checkExpiredSubscriptions()` functions in `src/lib/db.ts` handle the tier lifecycle.

**Webhook flow:** Stripe webhook → verify signature → call `upgradeTier(userId, 'premium', 30)` → user gets premium access for 30 days.

### 5.2 Email Alerts

Send notifications when saved officials take new actions.

**Infrastructure needed:**
- Email service (Resend, SendGrid, or Postmark — all have free tiers)
- A scheduled job (Vercel Cron or external) that checks for new votes/bills daily
- The `Alert` model and `SavedOfficial.alertsOn` field are already in the schema

### 5.3 PDF Export

Generate downloadable PDF profiles.

**Approach:** Use the existing profile data and render it server-side with a PDF library (like `@react-pdf/renderer` or `puppeteer` for full HTML-to-PDF).

This is a premium feature. The gate is already defined in `tiers.ts`.

### 5.4 Bulk Data Pipeline

For production scale, stop hitting government APIs on every request:
- Build a nightly batch job that fetches all current member data and stores it in PostgreSQL
- Build a weekly job for vote data
- The API routes then read from the local database instead of calling external APIs
- This eliminates rate limit concerns and dramatically improves response times

### 5.5 State and Local Officials

Extend beyond Congress to state legislators, governors, and local officials.

**Data sources:**
- Google Civic Info already returns state and local officials for zip lookups
- Open States API (https://v3.openstates.org/) for state legislature data
- Individual state legislature APIs where available

This requires new adapter implementations and new page templates, but the architecture supports it — the vertical/adapter pattern was designed for exactly this kind of extension.

---

## File Creation Checklist

A concrete list of every file that needs to be created or modified in each phase.

### Phase 2 — Core Pages

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/app/api/civics/member/[id]/votes/route.ts` | Voting record API |
| Create | `src/app/api/civics/member/[id]/committees/route.ts` | Committee assignments API |
| Create | `src/app/api/civics/member/[id]/news/route.ts` | News feed API |
| Create | `src/app/api/civics/compare/route.ts` | Comparison API |
| Create | `src/app/compare/page.tsx` | Compare view page |
| Create | `src/app/issues/page.tsx` | Issue reports page |
| Modify | `src/app/official/[id]/page.tsx` | Add Votes tab, Committees section, Metrics tab, News section, Wikipedia bio |
| Modify | `src/app/api/civics/member/[id]/route.ts` | Add Wikipedia/Wikidata calls |

### Phase 3 — User System

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/app/login/page.tsx` | Login page |
| Create | `src/app/register/page.tsx` | Registration page |
| Create | `src/app/upgrade/page.tsx` | Premium upsell |
| Create | `src/app/dashboard/page.tsx` | User dashboard |
| Create | `src/app/api/user/profile/route.ts` | User profile CRUD |
| Create | `src/app/api/user/saved/route.ts` | Saved officials CRUD |
| Create | `src/app/api/user/issues/route.ts` | Issue preferences CRUD |
| Create | `src/app/api/user/alerts/route.ts` | Alerts list + mark read |
| Modify | `src/app/official/[id]/page.tsx` | Add FeatureGate wrappers |
| Modify | `src/app/compare/page.tsx` | Add FeatureGate wrapper |
| Modify | `src/app/issues/page.tsx` | Add FeatureGate wrapper |
| Modify | `src/app/layout.tsx` | Add login/dashboard link to header |
| Modify | All API routes | Add gateProfileResponse() calls |

### Phase 4 — Production Readiness

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/app/error.tsx` | Error boundary |
| Create | `src/app/not-found.tsx` | 404 page |
| Create | `src/app/loading.tsx` | Global loading state |
| Create | `src/components/MobileNav.tsx` | Hamburger menu |
| Create | `vercel.json` | Deployment configuration |
| Create | `.github/workflows/deploy.yml` | CI/CD (optional) |
| Modify | `src/app/api/civics/member/[id]/route.ts` | Add PostgreSQL caching |
| Modify | `src/app/api/civics/zip/route.ts` | Add PostgreSQL caching |
| Modify | `src/app/api/civics/member/[id]/finance/route.ts` | Add PostgreSQL caching |
| Modify | `src/app/official/[id]/page.tsx` | Add generateMetadata() |
| Modify | `src/app/reps/page.tsx` | Add generateMetadata() |
| Modify | `src/app/layout.tsx` | Add mobile nav component |

---

## Testing Strategy

### Manual Testing (Phase 1)

Before building further, verify the vertical slice works against live APIs:

1. Start the dev server: `npm run dev`
2. Enter zip code `60188` (Carol Stream, IL) — verify representatives load
3. Click a representative with a bioguide ID — verify profile loads
4. Check the Legislation tab — verify bills appear with real data
5. Check the Campaign Finance tab — verify FEC data appears
6. Try zip codes in different states to test edge cases
7. Try a zip code with no federal representatives (e.g., a territory)

**What to watch for:**
- Bioguide ID extraction from Google Civic photo URLs may not work for all members
- Some members may not have FEC records (newly elected, or non-federal)
- Congress.gov may return data in slightly different shapes for Senators vs Representatives
- Rate limiting on FEC API (1,000/hour) — don't hammer it during testing

### Automated Testing (Phase 4)

Add when preparing for production:

```
src/test/
  api/zip.test.ts              Test zip lookup API with mocked Google Civic response
  api/member.test.ts           Test member API with mocked Congress.gov response
  api/finance.test.ts          Test finance API with mocked FEC response
  components/FeatureGate.test.tsx  Test gating behavior across tiers
  lib/db.test.ts               Test cache and tier management
```

Use `vitest` (already compatible with Next.js) or `jest`. Mock external API calls with `msw` (Mock Service Worker).

---

## API Response Shape Reference

These are the actual shapes returned by the Phase 1 API routes. Use these as the contract when building frontend components.

### GET /api/civics/zip?code=60188

```json
{
  "zipCode": "60188",
  "state": "IL",
  "city": "Carol Stream",
  "officials": [
    {
      "name": "Sean Casten",
      "title": "U.S. Representative IL-6",
      "party": "Democratic Party",
      "chamber": "house",
      "photoUrl": "https://...",
      "bioguideId": "C001117",
      "phones": ["(202) 225-4561"],
      "urls": ["https://casten.house.gov"],
      "channels": [{ "type": "Twitter", "id": "RepCasten" }]
    }
  ]
}
```

### GET /api/civics/member/C001117

```json
{
  "member": {
    "bioguideId": "C001117",
    "name": "Sean Casten",
    "firstName": "Sean",
    "lastName": "Casten",
    "party": "Democratic",
    "state": "Illinois",
    "district": "6",
    "chamber": "house",
    "birthYear": "1971",
    "depiction": "https://...",
    "officialUrl": "https://casten.house.gov",
    "currentMember": true,
    "terms": [{ "chamber": "House", "congress": 119, "startYear": 2025 }],
    "sponsoredCount": 42,
    "cosponsoredCount": 187
  },
  "bills": [
    {
      "congress": 119,
      "type": "HR",
      "number": 1234,
      "title": "Clean Energy Innovation Act",
      "introducedDate": "2025-03-15",
      "latestAction": "Referred to Committee on Energy and Commerce",
      "policyArea": "Energy",
      "url": "https://congress.gov/bill/..."
    }
  ]
}
```

### GET /api/civics/member/C001117/finance?name=Sean+Casten

```json
{
  "bioguideId": "C001117",
  "found": true,
  "candidate": {
    "candidateId": "H8IL06138",
    "name": "CASTEN, SEAN",
    "party": "Democratic Party",
    "office": "House",
    "fecUrl": "https://www.fec.gov/data/candidate/H8IL06138/"
  },
  "totals": {
    "cycle": 2026,
    "totalReceipts": 3400000,
    "totalDisbursements": 2800000,
    "cashOnHand": 600000,
    "individualContributions": 2900000,
    "pacContributions": 350000,
    "lastReportDate": "2025-06-30"
  },
  "topContributors": [
    {
      "name": "SMITH, JOHN",
      "employer": "ACME Corp",
      "amount": 3300,
      "date": "2025-04-15"
    }
  ]
}
```

---

## Environment Variables Reference

```bash
# Auth
NEXT_PUBLIC_AUTH_PROVIDER=stub    # stub (dev) or nextauth (production)
NEXT_PUBLIC_FORCE_TIER=free      # free | premium | institutional (stub mode only)
NEXTAUTH_SECRET=                 # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# OAuth (production only)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/freecivics

# Government APIs (required)
CONGRESS_API_KEY=                # https://api.congress.gov/sign-up/
FEC_API_KEY=                     # https://api.open.fec.gov/developers/
GOOGLE_CIVIC_API_KEY=            # https://console.cloud.google.com/apis/library/civicinfo.googleapis.com

# Optional
ANTHROPIC_API_KEY=               # For AI synthesis features
NEWS_API_KEY=                    # For news feed
```

---

## Architecture Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| PostgreSQL over MariaDB | Seamless local-to-Neon transition, superior JSON/text search, Prisma optimized | Feb 2025 |
| NextAuth over Clerk | $0 cost at any scale vs Clerk's $0.02/MAU ($1,825/mo at 100K users) | Feb 2025 |
| Congress.gov over ProPublica | ProPublica shut down, Congress.gov is the primary source | Feb 2025 |
| FEC API over OpenSecrets | OpenSecrets discontinued April 2025, FEC is the primary source | Feb 2025 |
| Mixed gating (teaser + hidden) | Some features are teased to drive upgrades, others hidden to reduce UI clutter | Feb 2025 |
| No letter grades on scorecard | Present raw data with benchmarks; let users draw their own conclusions | Feb 2025 |
| CSS variables over Tailwind | Civil rights design system is custom enough that utility classes add friction | Feb 2025 |
| App Router over Pages Router | Server components, streaming, parallel routes — better for data-heavy pages | Feb 2025 |
