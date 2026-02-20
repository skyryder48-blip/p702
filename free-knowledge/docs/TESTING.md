# free-civics — Testing Guide

This guide covers how to test every part of the application: pages, API routes, authentication, tier gating, rate limiting, and database health.

---

## Prerequisites

Before running any tests, make sure your development environment is set up:

```bash
npm install
cp .env.example .env.local   # if you haven't already
```

Confirm the dev server starts:

```bash
npm run dev
```

You should see output ending with `Ready in Xs` and the app available at http://localhost:3000.

---

## 1. Smoke Test — Does the App Load?

Open your browser to http://localhost:3000. You should see the **free-civics** homepage with a zip code search bar.

**Checklist:**
- [ ] Homepage loads without errors
- [ ] Header shows "free-civics" logo, Search / Compare / Issues nav links
- [ ] Search bar accepts zip code input
- [ ] No console errors in browser DevTools (press F12 to open)

---

## 2. Page-by-Page Walkthrough

Visit each page and verify it renders:

| URL | What You Should See | Auth Required? |
|-----|---------------------|----------------|
| `/` | Homepage with zip code search | No |
| `/reps` | "Find your representatives" page | No |
| `/issues` | Issue categories list | No |
| `/login` | Login form (email + password) | No |
| `/register` | Registration form | No |
| `/upgrade` | Tier upgrade / pricing page | No |
| `/compare` | Side-by-side comparison tool | Yes (premium) |
| `/dashboard` | User dashboard with saved officials | Yes |
| `/official/P000197` | Official profile page (Pelosi) | No |

**Tip:** If you're in **stub mode** (`NEXT_PUBLIC_AUTH_PROVIDER=stub` in `.env.local`), all pages load without authentication. This is the default for development.

---

## 3. Testing Authentication

### 3a. Stub Mode (Default — No Database Required)

With `NEXT_PUBLIC_AUTH_PROVIDER=stub` in `.env.local`:
- All pages are accessible without logging in
- Tier is controlled by `NEXT_PUBLIC_FORCE_TIER` (default: `free`)
- No database connection needed for auth

**Test tier switching:**
1. Edit `.env.local` and set `NEXT_PUBLIC_FORCE_TIER=premium`
2. Restart the dev server (`Ctrl+C`, then `npm run dev`)
3. Visit `/compare` — it should load (premium feature)
4. Change back to `NEXT_PUBLIC_FORCE_TIER=free`
5. Restart — `/compare` should redirect to `/upgrade`

### 3b. Real Auth (Requires Database)

To test actual login/registration:

1. Set `NEXT_PUBLIC_AUTH_PROVIDER=nextauth` in `.env.local`
2. Make sure `NEXTAUTH_SECRET` is set (the setup script generates one)
3. Make sure `DATABASE_URL` points to a running PostgreSQL instance
4. Run migrations: `npx prisma migrate deploy`
5. Seed test users: `npm run db:seed`
6. Restart the dev server

**Test accounts (after seeding):**

| Email | Password | Tier |
|-------|----------|------|
| `free@test.com` | `testpass123` | free |
| `premium@test.com` | `testpass123` | premium |
| `admin@test.com` | `testpass123` | institutional |

**Test login flow:**
1. Go to `/login`
2. Enter `free@test.com` / `testpass123`
3. You should be redirected to `/dashboard`
4. The nav should show your name and a logout option

**Test registration flow:**
1. Go to `/register`
2. Enter a new email, name, and password (12+ characters)
3. You should see a success message
4. Try logging in with the new account

**Test protected routes:**
1. Log out (or open an incognito window)
2. Go to `/dashboard` — you should be redirected to `/login`
3. Log in as `free@test.com`
4. Go to `/compare` — you should be redirected to `/upgrade`
5. Log in as `premium@test.com`
6. Go to `/compare` — it should load

---

## 4. Testing API Routes

You can test API routes using `curl` in your terminal or the browser address bar for GET requests.

### Health Check

```bash
curl http://localhost:3000/api/health
```

**Expected response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-20T...",
  "checks": {
    "database": { "ok": true, "latencyMs": 3 }
  }
}
```

If the database is down, you'll get a `503` with `"status": "degraded"`.

### Zip Code Lookup

```bash
curl "http://localhost:3000/api/civics/zip?code=60188"
```

**Expected:** JSON with representatives for that zip code. If `GOOGLE_CIVIC_API_KEY` is not set, this will return an error from the upstream API — that's expected. With a valid key, you'll get representative names, parties, and offices.

### Member Profile

```bash
curl http://localhost:3000/api/civics/member/P000197
```

**Expected:** Profile data for Nancy Pelosi (or cached sample data if seeded).

### Member Sub-Routes

```bash
# Votes
curl http://localhost:3000/api/civics/member/P000197/votes

# Committees
curl http://localhost:3000/api/civics/member/P000197/committees

# Finance (premium — gated in response)
curl http://localhost:3000/api/civics/member/P000197/finance

# News
curl http://localhost:3000/api/civics/member/P000197/news

# Metrics
curl http://localhost:3000/api/civics/member/P000197/metrics
```

### Issues

```bash
curl http://localhost:3000/api/civics/issues
```

### Compare

```bash
curl "http://localhost:3000/api/civics/compare?ids=P000197,S000148"
```

### Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"mysecurepassword","name":"Test User"}'
```

**Expected (201):**
```json
{
  "success": true,
  "user": { "id": "...", "email": "test@example.com", "name": "Test User", "tier": "free" }
}
```

**Validation tests:**
```bash
# Missing password (expect 400)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Short password (expect 400)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","password":"short"}'

# Duplicate email (expect 409)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"free@test.com","password":"mysecurepassword"}'
```

---

## 5. Testing Tier Gating

The app restricts data based on user tier. In stub mode, switch tiers via `.env.local`:

```bash
# .env.local
NEXT_PUBLIC_FORCE_TIER=free       # Limited data
NEXT_PUBLIC_FORCE_TIER=premium    # Full data
NEXT_PUBLIC_FORCE_TIER=institutional  # Full data + export
```

Restart the dev server after changing the tier.

**What to check per tier:**

| Feature | Free | Premium | Institutional |
|---------|------|---------|---------------|
| Profile overview | Full | Full | Full |
| Sponsored bills | 5 max | Unlimited | Unlimited |
| Recent votes | 5 max | Unlimited | Unlimited |
| News | 3 max | Unlimited | Unlimited |
| Finance data | Hidden | Full | Full |
| Scorecard/metrics | Hidden | Full | Full |
| Compare page | Blocked | Full | Full |
| Expenditures | Hidden | Hidden | Full |

**API test:** Compare the JSON response at different tiers:

```bash
# Set NEXT_PUBLIC_FORCE_TIER=free, restart, then:
curl http://localhost:3000/api/civics/member/P000197 | python3 -m json.tool | head -50

# Set NEXT_PUBLIC_FORCE_TIER=premium, restart, then:
curl http://localhost:3000/api/civics/member/P000197 | python3 -m json.tool | head -50
```

At `free` tier, you should see `finance` field missing and `votesLimited: true` / `billsLimited: true` in the response.

---

## 6. Testing Rate Limiting

The rate limiter enforces per-tier limits:

| Tier | Per Minute | Per Day |
|------|-----------|---------|
| Free | 20 | 500 |
| Premium | 60 | 5,000 |
| Institutional | 200 | Unlimited |

**Quick test:** Hit an endpoint rapidly:

```bash
for i in $(seq 1 25); do
  echo -n "Request $i: "
  curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/civics/zip?code=60188"
  echo
done
```

At `free` tier, requests 21+ should return `429` (Too Many Requests) with a `Retry-After` header.

---

## 7. Testing the Database

### Check Health

```bash
npm run db:health
# or
curl http://localhost:3000/api/health
```

### Browse Data

```bash
npx prisma studio
```

Opens a visual browser at http://localhost:5555 where you can view and edit all tables.

### Verify Seed Data

After running `npm run db:seed`, check:
- 3 users (free, premium, institutional)
- 3 saved officials (linked to premium user)
- 5 issue preferences
- 2 sample alerts
- 1 cached profile
- 1 cached zip lookup

### Reset Everything

```bash
npm run db:reset
```

This wipes all data and re-seeds. **Never run this in production.**

---

## 8. Build Verification

Before deploying, always verify the production build:

```bash
# TypeScript type checking
npx tsc --noEmit

# Production build
npm run build
```

Both commands should complete with zero errors. The build output shows all routes and their sizes.

**Test the production build locally:**

```bash
npm run build && npm start
```

Then visit http://localhost:3000 and repeat the smoke tests from Section 1.

---

## 9. Security Checks

### Headers

After starting the dev server, check that security headers are present:

```bash
curl -I http://localhost:3000
```

You should see:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### API Cache Headers

```bash
curl -I http://localhost:3000/api/health
```

Should include:
```
Cache-Control: no-store
```

### No Secrets in Source

Verify no API keys are hardcoded:

```bash
# From the free-knowledge directory
grep -r "sk-\|AKIA\|ghp_\|gho_" src/ --include="*.ts" --include="*.tsx"
```

Should return nothing.

---

## 10. Testing Checklist (Copy & Use)

```
SMOKE TESTS
  [ ] Homepage loads at http://localhost:3000
  [ ] No console errors in browser DevTools
  [ ] All nav links work (Search, Compare, Issues)

PAGES
  [ ] / — search bar visible
  [ ] /reps — find representatives page
  [ ] /issues — issue list renders
  [ ] /login — form renders
  [ ] /register — form renders
  [ ] /upgrade — pricing/upgrade page
  [ ] /official/P000197 — profile loads (with DB + seed)
  [ ] /dashboard — redirects to /login when not authenticated
  [ ] /compare — redirects to /upgrade for free tier

AUTH (requires NEXT_PUBLIC_AUTH_PROVIDER=nextauth + database)
  [ ] Register a new user
  [ ] Login with test credentials
  [ ] Logout works
  [ ] Protected routes redirect to /login
  [ ] Premium routes redirect to /upgrade for free users

API
  [ ] GET /api/health — returns 200
  [ ] GET /api/civics/zip?code=60188
  [ ] GET /api/civics/member/P000197
  [ ] GET /api/civics/issues
  [ ] POST /api/auth/register — validates input

TIER GATING
  [ ] Free tier: finance hidden, bills/votes capped
  [ ] Premium tier: full data visible
  [ ] Tier switch via NEXT_PUBLIC_FORCE_TIER works

RATE LIMITING
  [ ] 21st request in a minute returns 429

BUILD
  [ ] npx tsc --noEmit — zero errors
  [ ] npm run build — succeeds
  [ ] npm start — production server works

SECURITY
  [ ] Security headers present on responses
  [ ] API routes return Cache-Control: no-store
  [ ] No hardcoded secrets in source
```
