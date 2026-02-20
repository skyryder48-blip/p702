# free-civics — Launch Guide (First-Time Setup)

This is a step-by-step guide for running the free-civics app for the first time. No prior experience is assumed — every command is explained.

---

## What You'll Need

- **A computer** running macOS, Windows, or Linux
- **A terminal** (command line):
  - macOS: Open **Terminal** (press Cmd+Space, type "Terminal", press Enter)
  - Windows: Open **PowerShell** (press Win+X, select "Terminal" or "PowerShell")
  - Linux: Open your terminal emulator (usually Ctrl+Alt+T)
- **About 30 minutes** for the full setup

---

## Step 1: Install Node.js

Node.js is the runtime that executes JavaScript outside a browser. Our app is built on it.

### Check if you already have it

Open your terminal and run:

```bash
node --version
```

If you see `v18.x.x` or higher (like `v20.11.0`), you're good — skip to Step 2.

### Install Node.js

1. Go to https://nodejs.org
2. Download the **LTS** (Long Term Support) version — it will say something like "20.x LTS Recommended for Most Users"
3. Run the installer and follow the prompts (all defaults are fine)
4. Close and reopen your terminal
5. Verify: `node --version` should now show the version number

---

## Step 2: Install PostgreSQL

PostgreSQL is the database where the app stores user accounts, cached data, and analytics.

**You have two options:**

### Option A: Cloud Database (Easiest — No Install)

1. Go to https://neon.tech and create a free account
2. Click "Create a project", name it `freecivics`
3. You'll see a connection string like:
   ```
   postgresql://user:pass@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Copy this string — you'll need it in Step 4
5. **That's it.** Skip to Step 3.

### Option B: Local PostgreSQL

**macOS (using Homebrew):**
```bash
# Install Homebrew first if you don't have it:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL:
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu / Debian Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
1. Download from https://www.postgresql.org/download/windows/
2. Run the installer (keep all defaults, remember the password you set)
3. Default connection: `postgresql://postgres:YOUR_PASSWORD@localhost:5432/freecivics`

After installing, create the database:

```bash
createdb freecivics
```

---

## Step 3: Download the Project and Install Dependencies

If you haven't already cloned or downloaded the project, do that first. Then navigate into the project folder:

```bash
cd free-knowledge
```

Install all the libraries the app depends on:

```bash
npm install
```

This reads `package.json` and downloads everything into a `node_modules/` folder. It takes a minute or two the first time.

---

## Step 4: Configure Environment Variables

Environment variables are settings that tell the app how to connect to the database, which API keys to use, etc. They're stored in a file called `.env.local` that is **never committed to git** (it's in `.gitignore`).

### Create the file

```bash
cp .env.example .env.local
```

This copies the template. Now open `.env.local` in a text editor and fill in these values:

### Required Variables

**`DATABASE_URL`** — Your PostgreSQL connection string.

If you used Neon (Option A in Step 2):
```
DATABASE_URL=postgresql://user:pass@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
```

If you installed PostgreSQL locally (Option B):
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/freecivics
```

**`NEXTAUTH_SECRET`** — A random string used to sign authentication tokens. Generate one:

```bash
openssl rand -base64 32
```

Copy the output and paste it:
```
NEXTAUTH_SECRET=aB3dEf...your-random-string-here
```

If `openssl` isn't available, use any long random string (40+ characters).

**`NEXTAUTH_URL`** — Leave as-is for local development:
```
NEXTAUTH_URL=http://localhost:3000
```

### Auth Mode

For your first run, keep the defaults:
```
NEXT_PUBLIC_AUTH_PROVIDER=stub
NEXT_PUBLIC_FORCE_TIER=free
```

This runs the app in **stub mode** — no login required, no database needed for auth. You can change this later after you've verified everything works.

### Government API Keys (Optional)

These enable live data from government APIs. The app works without them (you'll see error messages for API calls), but with them you get real representative data:

- **Congress API**: Free — register at https://api.congress.gov/sign-up/
- **Google Civic API**: Free tier — enable "Google Civic Information API" at https://console.cloud.google.com/
- **FEC API**: Free — register at https://api.open.fec.gov/developers/

Add any keys you have:
```
CONGRESS_API_KEY=your-key-here
GOOGLE_CIVIC_API_KEY=your-key-here
FEC_API_KEY=your-key-here
```

---

## Step 5: Set Up the Database

Push the schema (table definitions) to your database:

```bash
npx prisma migrate deploy
```

This creates all 11 tables the app needs (users, accounts, cached data, etc.).

> **If that fails**, try: `npx prisma db push` — this does the same thing without migration tracking.

Generate the Prisma client (TypeScript types for database queries):

```bash
npx prisma generate
```

### Seed Test Data (Optional but Recommended)

This creates three test user accounts and sample data:

```bash
npm run db:seed
```

You'll see output confirming users, saved officials, and cache entries were created.

---

## Step 6: Start the Development Server

```bash
npm run dev
```

You should see:

```
  ▲ Next.js 14.x
  - Local:    http://localhost:3000
  - Ready in 2.5s
```

**Open your browser to http://localhost:3000**

You should see the free-civics homepage with a search bar. Congratulations — the app is running!

---

## Step 7: Try It Out

### Search by Zip Code

1. Type a zip code (e.g., `60188`) in the search bar on the homepage
2. If you have a `GOOGLE_CIVIC_API_KEY` configured, you'll see representatives for that area
3. Click on a representative name to view their full profile

### Browse Pages

- **Issues**: Click "Issues" in the nav bar to see policy categories
- **Compare**: Click "Compare" to see the comparison tool (requires premium tier)
- **Dashboard**: If running with real auth, log in to see your dashboard

### Test Different Tiers

Edit `.env.local` to change what tier you see:

```
NEXT_PUBLIC_FORCE_TIER=premium
```

Save the file, stop the server (`Ctrl+C`), and restart (`npm run dev`). Now premium features like the Compare page and full financial data will be accessible.

---

## Step 8: Enable Real Authentication (Optional)

Once you've confirmed the app works in stub mode, you can switch to real authentication:

1. Edit `.env.local`:
   ```
   NEXT_PUBLIC_AUTH_PROVIDER=nextauth
   ```
   (Remove or comment out `NEXT_PUBLIC_FORCE_TIER`)

2. Make sure your database is running and seeded (Step 5)

3. Restart the dev server

4. Now go to `/login` and sign in with a test account:
   - Email: `premium@test.com`
   - Password: `testpass123`

5. You'll be redirected to `/dashboard` and see the premium user's saved officials

---

## Everyday Commands Reference

Once setup is complete, these are the commands you'll use day to day:

| What You Want To Do | Command | Notes |
|---------------------|---------|-------|
| Start the app | `npm run dev` | Opens at http://localhost:3000 |
| Stop the app | `Ctrl+C` in terminal | Stops the dev server |
| Browse the database | `npx prisma studio` | Opens at http://localhost:5555 |
| Reset the database | `npm run db:reset` | Wipes all data, re-seeds |
| Check database health | `curl http://localhost:3000/api/health` | Returns status + latency |
| Build for production | `npm run build` | Creates optimized build |
| Run production build | `npm start` | Serves the built app |
| Update dependencies | `npm install` | Re-reads package.json |

---

## Deploying to the Internet

When you're ready to make the app publicly accessible:

### Option 1: Vercel (Recommended — Free Tier)

1. Push your code to GitHub
2. Go to https://vercel.com and sign in with GitHub
3. Click "Import Project" and select your repo
4. Set environment variables in the Vercel dashboard:
   - `DATABASE_URL` (your Neon connection string)
   - `NEXTAUTH_SECRET` (generate a new one for production)
   - `NEXTAUTH_URL` (your production URL, e.g., `https://freecivics.vercel.app`)
   - `NEXT_PUBLIC_AUTH_PROVIDER=nextauth`
   - Any API keys (`CONGRESS_API_KEY`, etc.)
5. Click "Deploy"
6. Vercel automatically runs `npm run build` and publishes your app

### Option 2: Self-Hosted

```bash
# On your server:
npm ci                        # Install dependencies (clean)
npx prisma migrate deploy     # Apply database migrations
npm run build                 # Build for production
npm start                     # Start the server (port 3000)
```

Use a process manager like `pm2` to keep it running:
```bash
npm install -g pm2
pm2 start npm --name "freecivics" -- start
pm2 save
```

---

## Troubleshooting

### "command not found: npm" or "command not found: node"

Node.js isn't installed or isn't in your PATH. Go back to Step 1.

### "ECONNREFUSED" or "Connection refused"

Your database isn't running.
- **Neon**: Check your connection string is correct and includes `?sslmode=require`
- **Local PostgreSQL**: Make sure it's started:
  - macOS: `brew services start postgresql@16`
  - Linux: `sudo systemctl start postgresql`

### "Database does not exist"

Create it:
```bash
createdb freecivics
```

### "Module not found" errors

Dependencies aren't installed. Run:
```bash
npm install
npx prisma generate
```

### "Port 3000 is already in use"

Another process is using port 3000. Either stop it or use a different port:
```bash
PORT=3001 npm run dev
```

### Page loads but shows no data

- If using stub mode: data depends on API keys. Set `CONGRESS_API_KEY` in `.env.local`.
- If using real auth: make sure you ran `npm run db:seed`.

### "Invalid environment variables"

Check `.env.local` for typos. Common issues:
- Extra spaces around `=` signs (wrong: `DATABASE_URL = postgres://...`)
- Missing quotes aren't needed — don't add quotes around values
- Make sure the file is named `.env.local` (starts with a dot)

### Build fails with TypeScript errors

```bash
npx tsc --noEmit
```

This shows all type errors. If you haven't modified any source code, the build should pass cleanly.

---

## What's Next?

Now that your app is running:

1. **Read the [Testing Guide](TESTING.md)** to verify everything works correctly
2. **Read the [Architecture docs](ARCHITECTURE.md)** to understand how the code is organized
3. **Read the [Feature Spec](FEATURE-SPEC.md)** to see what's built and what's planned
4. **Get API keys** for Congress, Google Civic, and FEC to enable live data
5. **Switch to real auth** (Step 8 above) when you're ready to test login flows
