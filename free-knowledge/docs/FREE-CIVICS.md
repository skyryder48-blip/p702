# free-civics: Know Your Government

A comprehensive civic transparency platform built on the free-knowledge engine. Look up any US government official and get their complete public record — voting history, campaign finances, committee assignments, and an AI-generated scorecard — all in one place.

## Features

### 🔍 Official Profiles
Search by name or position to get a complete dossier:
- Biographical background and path to office
- AI-synthesized summary of their public service record
- Professional history and education
- Official photos and contact information

### 📊 Scorecard / Report Card
Every official gets graded on six dimensions:
- **Attendance & Participation** — Vote attendance rate
- **Legislative Effectiveness** — Bills introduced, advanced, and enacted
- **Bipartisanship** — Cross-party voting frequency
- **Transparency & Accountability** — Financial disclosure and small donor funding
- **Constituency Focus** — Emphasis on local/state issues
- **Leadership & Influence** — Committee roles and positions

### 📜 Legislation Tracker
- All sponsored and co-sponsored bills with **AI plain-language summaries**
- Bill status tracking (introduced → committee → passed → signed)
- Complete voting record with party breakdown
- Vote categorization by issue area

### 💰 Money Trail
- Campaign finance totals (raised, spent, cash on hand)
- Top donors and industry contributions
- PAC funding breakdown
- Small donor vs. large donor percentages
- Links to FEC filings

### 🏛️ Committee Assignments
- Current committee and subcommittee memberships
- Leadership roles (chair, ranking member, etc.)
- AI-generated context on what each committee controls and why it matters

### 📰 Recent News
- Latest news mentions with source attribution
- Basic sentiment analysis (positive/negative/neutral)
- Filtered to government and political coverage

### 📍 Zip Code Lookup
Enter your zip code to instantly see:
- Your US Representative
- Your two US Senators
- The President and relevant cabinet officials
- Links to each official's full profile

### 🗳️ What Affects Me
Select issues you care about and see how your representatives stack up:
- 15 issue categories (Healthcare, Economy, Education, Environment, etc.)
- Per-issue voting record and alignment score
- Related sponsored bills
- AI-generated analysis of their position
- Industry donor connections to voting patterns

### ⚖️ Compare Officials
Side-by-side comparison of any two officials:
- Voting agreement percentage
- Scorecard comparison across all categories
- Finance differences
- Shared committees and donors
- Key disagreements
- AI-generated non-partisan comparison summary

### 🗓️ Elections & Confirmations
- Upcoming elections for each official
- Candidate information and filing deadlines
- Senate confirmation tracking

## Data Sources

| Source | Data | Cost |
|--------|------|------|
| [Congress.gov API](https://api.congress.gov/) | Members, bills, votes, committees | Free |
| [FEC API](https://api.open.fec.gov/developers/) | Campaign finance, contributions, PACs, expenditures | Free |
| [FEC API](https://api.open.fec.gov/) | Raw campaign contribution data | Free |
| [Google Civic Info API](https://developers.google.com/civic-information) | Zip → representative lookup | Free tier |
| [Wikipedia API](https://www.mediawiki.org/wiki/API) | Biographical data | Free |
| [Wikidata API](https://www.wikidata.org/) | Structured facts | Free |
| [GNews API](https://gnews.io/) | Recent news articles | Free: 100/day |
| [Anthropic Claude API](https://console.anthropic.com/) | AI synthesis & summaries | Pay per use |

## Architecture

```
[User Query: "Nancy Pelosi" or "60188"]
     │
     ▼
[CivicsOrchestrator]
     │
     ├── [CongressAdapter]        → member data, bills, votes, committees
     ├── [CampaignFinanceAdapter] → donors, industries, FEC data
     ├── [CivicInfoAdapter]       → zip lookup, contact info, social media
     ├── [WikipediaAdapter]       → biographical background
     ├── [WikidataAdapter]        → structured facts
     └── [NewsAdapter]            → recent coverage
     │
     ▼
[Specialized Engines]
     ├── [LegislationEngine]  → AI bill summaries, vote categorization
     ├── [ScorecardEngine]    → multi-dimensional grading
     ├── [CompareEngine]      → side-by-side analysis
     └── [IssuesEngine]       → "What Affects Me" filtering
     │
     ▼
[OfficialProfile] → Complete civic dossier
```

## API Endpoints

| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/api/civics/profile` | GET | `name` | Full official profile |
| `/api/civics/zip` | GET | `code` | Zip code → representatives |
| `/api/civics/compare` | GET | `official1`, `official2` | Side-by-side comparison |
| `/api/civics/issues` | GET | `official`, `issues` | Issue-specific reports |
| `/api/civics/categories` | GET | — | List all issue categories |

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd free-knowledge
npm install

# 2. Set up API keys
cp .env.civics.example .env.local
# Edit .env.local with your API keys

# 3. Run development server
npm run dev

# 4. Test the engine
npx tsx src/test/civics-test.ts "Nancy Pelosi"
```

## API Key Setup

**Minimum viable (free):**
1. Congress.gov API — instant signup
2. Anthropic API — for AI synthesis (pay per use, low cost)

**Recommended (all free):**
3. FEC API — campaign finance (direct from source)
5. FEC API — raw financial data
6. Google Civic API — zip code lookup
7. GNews API — news articles

## Revenue Model

| Tier | Features | Price |
|------|----------|-------|
| **Free** | Official profiles, zip lookup, basic scorecard, recent votes | $0 |
| **Premium** | Full scorecard, issue reports, comparisons, PDF export, alerts | $9.99/mo |
| **Institutional** | API access, bulk data, custom branding, self-hosted option | Custom |

## Roadmap

- [ ] Frontend UI (Next.js)
- [ ] State legislature support (expand beyond federal)
- [ ] Executive branch profiles (Cabinet, agency heads)
- [ ] Senate confirmation tracker
- [ ] Bill impact calculator ("How does this bill affect me?")
- [ ] Email/SMS alerts for new votes and bills
- [ ] Historical data (how positions changed over time)
- [ ] Embed widgets for news organizations
- [ ] Mobile app
