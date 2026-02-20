# free-civics — Auth Provider Evaluation

## Decision Context

free-civics needs authentication to gate free vs. premium features. Payment processing (Stripe) will be added later. For now, auth establishes user identity and tier assignment. The system must be provider-agnostic so we can swap providers without rewriting application code.

---

## The Three Contenders

### 1. Clerk

**What it is:** Fully managed auth platform built specifically for Next.js. Drop-in components for login, signup, user profiles.

**Free tier:** 10,000 monthly active users (MAUs). All plans get first 10K free.
**Paid:** Pro plan at $25/month base + $0.02 per MAU beyond 10K.

**Strengths:**
- Fastest setup of any option — 30 minutes to working auth
- Pre-built, polished UI components (SignIn, SignUp, UserButton)
- First-class Next.js App Router support with Server Components
- Built-in user management dashboard
- Social logins, passwordless, MFA all included
- Webhooks for syncing user data to your database
- SOC 2 Type II certified
- $25M+ in funding, 100% focused on auth

**Weaknesses:**
- Vendor lock-in: your auth lives on their servers
- Less backend control vs. self-hosted
- Costs scale linearly with users ($0.02/MAU adds up)
- Some features (custom session duration, branding removal) require Pro plan
- Bot signups count toward MAU until you add rate limiting

**Cost at scale:**
- 10K MAUs: $0/month
- 25K MAUs: $25 + (15K × $0.02) = $325/month
- 100K MAUs: $25 + (90K × $0.02) = $1,825/month

**Best for:** Getting to market fast with professional auth. Ideal if you want zero auth maintenance overhead and have budget to absorb per-user costs as you grow.

---

### 2. NextAuth.js (Auth.js v5)

**What it is:** Open-source auth library for Next.js. You own everything — runs on your infrastructure, your database.

**Free tier:** Completely free forever. No MAU limits.
**Paid:** $0 (your only costs are database hosting).

**Strengths:**
- Totally free at any scale — no per-user pricing
- Complete data ownership: users live in your database
- 50+ OAuth providers (Google, GitHub, Apple, etc.)
- Works with any database (Postgres, MongoDB, etc.)
- No vendor lock-in whatsoever
- JWT or database-backed sessions
- Active community and ecosystem

**Weaknesses:**
- No pre-built UI — you build your own login/signup screens
- More setup time (1-3 hours for basic, longer for polished flows)
- MFA is not built-in — requires custom implementation
- v5 still technically in beta (available as `next-auth@beta`)
- Security maintenance falls on you
- Single primary maintainer raises bus-factor concerns
- The March 2025 Next.js middleware vulnerability (CVE-2025-29927) showed that middleware-only auth checks can be bypassed

**Cost at scale:**
- Any MAU count: $0 (plus database costs, ~$5-25/month on Neon/Supabase)

**Best for:** Maximum control and zero marginal cost per user. Ideal if you have the engineering time to build and maintain auth flows, and want to avoid any vendor dependency.

---

### 3. Supabase Auth

**What it is:** Auth system built into the Supabase platform (open-source Firebase alternative). Comes bundled with PostgreSQL database, storage, and real-time features.

**Free tier:** 50,000 MAUs (5x Clerk's free tier). Unlimited auth users.
**Paid:** Pro plan at $25/month with database + auth bundled. $0.00325/MAU beyond 100K.

**Strengths:**
- Most generous free tier: 50K MAUs
- Auth + database + storage in one platform
- Row Level Security (RLS) — database-native authorization
- PostgreSQL included (which free-civics needs anyway for user data)
- Open source — can self-host if needed
- SSR support via @supabase/ssr package
- Cheapest per-user cost at scale ($0.00325 vs Clerk's $0.02)

**Weaknesses:**
- Auth UI components less polished than Clerk
- Documentation gaps for auth edge cases
- Auth is bundled — you're adopting the Supabase ecosystem, not just auth
- Session management has reported inconsistencies
- Less Next.js-specific optimization than Clerk
- Complexity if you only need auth and not the full Supabase stack

**Cost at scale:**
- 50K MAUs: $0/month (free tier)
- 100K MAUs: $25/month (Pro plan, auth included)
- 500K MAUs: $25 + (400K × $0.00325) = $1,325/month

**Best for:** Budget-conscious projects that also need a database. The 50K free MAU ceiling gives enormous runway. Ideal if you're willing to adopt Supabase as your backend platform.

---

## Side-by-Side Comparison

| Factor | Clerk | NextAuth.js | Supabase Auth |
|--------|-------|-------------|---------------|
| **Setup time** | 30 min | 1-3 hours | 1-2 hours |
| **Free MAU limit** | 10,000 | Unlimited | 50,000 |
| **Pre-built UI** | Yes (polished) | No (build your own) | Basic |
| **Next.js App Router** | First-class | Good (v5) | Good (@supabase/ssr) |
| **MFA** | Built-in | Custom build | Built-in |
| **Social logins** | All major | 50+ providers | All major |
| **Database included** | No | No | Yes (PostgreSQL) |
| **Data ownership** | Their servers | Your database | Their servers (or self-host) |
| **Vendor lock-in** | High | None | Medium (can self-host) |
| **Per-user cost** | $0.02/MAU | $0 | $0.00325/MAU |
| **Cost at 50K MAUs** | $825/mo | ~$15/mo (DB only) | $0/mo |
| **Cost at 100K MAUs** | $1,825/mo | ~$25/mo (DB only) | $25/mo |
| **Security maintenance** | Managed | You handle it | Managed |
| **Open source** | No | Yes | Yes |

---

## Recommendation Matrix

**Choose Clerk if:**
- Speed to market is the top priority
- You want zero auth maintenance
- You're comfortable with per-user pricing
- You value polished, drop-in UI components
- Your projected user base stays under 10K for a while

**Choose NextAuth.js if:**
- You want zero ongoing auth costs at any scale
- You need full control over the auth flow
- You have time to build custom login UI
- Data ownership / no vendor lock-in is critical
- You're comfortable maintaining security yourself

**Choose Supabase Auth if:**
- You want the most free runway (50K MAUs)
- You need a database anyway (free-civics does)
- You want auth + database in one platform
- You prefer the cheapest per-user scaling costs
- You're open to adopting the Supabase ecosystem

---

## My Assessment for free-civics

Given that free-civics is a public civic service app that could grow rapidly (civic tools tend to spike around elections), and that we need a PostgreSQL database for user accounts and saved profiles anyway:

**Supabase Auth** offers the strongest value proposition — 50K free MAUs gives massive runway, the bundled PostgreSQL covers our database needs, and per-user costs at scale are 6x cheaper than Clerk. The trade-off is slightly less polished auth UI, but since we're building a custom design system anyway, that's minimal friction.

**Clerk** is the fastest path if you want to ship immediately and worry about costs later. The 10K free ceiling is lower but still substantial for launch.

**NextAuth.js** is the most economical long-term but requires the most upfront engineering investment.

There's no wrong answer here — the gating system we're building is provider-agnostic, so you can start with any of these and switch later without touching application code.

---

## Decision (February 2025)

**NextAuth.js was selected** as the auth provider for free-civics. Rationale:
- Zero ongoing cost at any scale — critical for a public civic service
- Full data ownership — user accounts live in our PostgreSQL database
- Already implemented in the codebase (`src/app/api/auth/[...nextauth]/`)
- The provider-agnostic auth adapter layer (`src/core/auth/adapter.ts`) means we can switch to Supabase or Clerk later without rewriting application code
- CVE-2025-29927 mitigation: server-side gating via `gateProfileResponse()` ensures auth isn't middleware-only
