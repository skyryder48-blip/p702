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

### 3a. Get the Source Code

If you haven't already downloaded the project, you need to clone it from GitHub. Open your terminal and run:

```bash
git clone https://github.com/YOUR-ORG/free-knowledge.git
```

> Replace `YOUR-ORG/free-knowledge` with the actual repository URL. If you received a `.zip` file instead, unzip it — the result is the same.

**What just happened:** `git clone` downloads the entire project (source code, configuration files, documentation) into a new folder called `free-knowledge/`.

### 3b. Navigate into the Project Folder

```bash
cd free-knowledge
```

Verify you're in the right place:

```bash
ls package.json
```

You should see `package.json` printed. If you see "No such file or directory", you're in the wrong folder — make sure you `cd` into the folder that was created by `git clone`.

### 3c. Install Dependencies

```bash
npm install
```

**What this does:** Reads `package.json` (the project's dependency manifest) and downloads every library the app needs — React, Next.js, Prisma, authentication, etc. — into a `node_modules/` folder. It also auto-generates the Prisma database client (via the `postinstall` hook).

**What to expect:**
- First run takes 1–3 minutes depending on your internet speed
- You'll see a progress bar and a tree of package names scrolling by
- When it finishes, the last line should say something like:
  ```
  added 487 packages, and audited 488 packages in 45s
  ```
- There may be `npm warn` lines — these are normal and can be ignored
- If you see `npm ERR!` lines, something went wrong (see below)

**About vulnerability warnings:**

After installation, npm may print something like:

```
4 vulnerabilities (3 low, 1 high)
```

This is npm's built-in security audit. Here's what to do:

1. **Run `npm audit fix`** (no `--force`) — this fixes the 3 low-severity issues (a `cookie` parsing bug in the `next-auth` dependency chain) without breaking anything:

   ```bash
   npm audit fix
   ```

2. **Do NOT run `npm audit fix --force`** — the 1 high-severity issue is in Next.js itself (an Image Optimizer DoS vulnerability affecting self-hosted production deployments). The "fix" would upgrade Next.js from v14 to v16, which is a **major version jump that will break the app**. This vulnerability:
   - Does **not** affect local development
   - Does **not** affect Vercel-hosted deployments (Vercel patches this on their platform)
   - Only affects self-hosted production servers exposed to the internet
   - Will be addressed when the project upgrades to Next.js 15+ (a planned future task)

3. **To confirm the remaining issue**, run:

   ```bash
   npm audit
   ```

   You should see the `next` entry remaining. This is expected and safe to proceed with.

> **Bottom line:** Run `npm audit fix`, ignore the remaining Next.js advisory, and continue to Step 4. The app is safe to run locally.

**How to verify it worked:**

```bash
ls node_modules/.package-lock.json
```

If this file exists, installation succeeded. You can also check:

```bash
npx next --version
```

This should print the Next.js version (e.g., `14.2.x`).

**Common problems:**

| Symptom | Fix |
|---------|-----|
| `npm ERR! code EACCES` (permission denied) | Don't use `sudo`. Fix npm permissions: `npm config set prefix ~/.npm-global` and add `~/.npm-global/bin` to your PATH |
| `npm ERR! code ENETUNREACH` (network error) | Check internet connection. If behind a corporate proxy, configure it: `npm config set proxy http://proxy:port` |
| `npm ERR! node-pre-gyp` or native module errors | Install build tools: macOS `xcode-select --install`, Ubuntu `sudo apt install build-essential`, Windows install Visual Studio Build Tools |
| `npm warn deprecated` messages | Safe to ignore — these are upstream warnings, not errors |
| Process hangs with no output | Press Ctrl+C, delete the lock file (`rm package-lock.json`), and run `npm install` again |

---

## Step 4: Configure Environment Variables

Environment variables are settings that tell the app how to connect to the database, which API keys to use, and how authentication should behave. They are stored in a file called `.env.local` in the project root.

**Why `.env.local`?** This file is listed in `.gitignore`, which means it is **never committed to git**. This is a security measure — it keeps database passwords and API keys out of source control. Every developer has their own `.env.local` with their own credentials.

### 4a. Create the File from the Template

```bash
cp .env.example .env.local
```

**What this does:** Copies the template file (`.env.example`) to a new file (`.env.local`). The template has every variable the app recognizes, with empty values and comments explaining each one.

Verify the file was created:

```bash
ls -la .env.local
```

### 4b. Open the File in a Text Editor

Use whichever editor you're comfortable with:

```bash
# VS Code (if installed):
code .env.local

# Nano (available on most systems):
nano .env.local

# Vim:
vim .env.local

# Or open in any GUI text editor — the file is at:
#   <your-project-folder>/free-knowledge/.env.local
```

> **Windows note:** If you're using Notepad, make sure "Save as type" is set to "All Files" so it doesn't add `.txt` to the filename.

### 4c. Fill in the Required Variables

There are only **three variables** you must set. Everything else has sensible defaults or is optional.

---

#### `DATABASE_URL` — Where your database lives

This is a connection string in the format `postgresql://USER:PASSWORD@HOST:PORT/DBNAME`.

**If you used Neon (Cloud — Option A in Step 2):**

Paste the connection string Neon gave you. It looks like this:

```
DATABASE_URL=postgresql://neondb_owner:abc123xyz@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Important: the `?sslmode=require` at the end is required for Neon. Don't remove it.

**If you installed PostgreSQL locally (Option B in Step 2):**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/freecivics
```

The format is: `postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME`

- `postgres:postgres` — the default username and password on most local installs. If you set a custom password during installation, use that instead.
- `localhost:5432` — the default host and port for a local PostgreSQL server.
- `freecivics` — the database name you created with `createdb freecivics` in Step 2.

**How to verify your connection string works** (optional, but recommended):

```bash
npx prisma db execute --stdin <<< "SELECT 1"
```

If this prints a result without errors, your database connection is valid. If you see `ECONNREFUSED`, your database isn't running or the connection string is wrong.

---

#### `NEXTAUTH_SECRET` — Signs authentication tokens

This is a random string that the app uses to cryptographically sign session cookies. It must be at least 32 characters and should be different for every environment (dev, staging, production).

**Generate one:**

```bash
openssl rand -base64 32
```

This prints a random string like `K7v2bX9qN...`. Copy the entire output and paste it into `.env.local`:

```
NEXTAUTH_SECRET=K7v2bX9qN1pMzYwR8dFhT3jL6uAeC0sG5xI4kW7vQ2o=
```

**If `openssl` is not available** (common on Windows without Git Bash):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Or just type any random string of 40+ characters — letters, numbers, and symbols. It doesn't need to be memorized.

---

#### `NEXTAUTH_URL` — The app's base URL

For local development, leave the default value:

```
NEXTAUTH_URL=http://localhost:3000
```

Only change this when deploying to production (e.g., `https://freecivics.vercel.app`).

---

### 4d. Choose Your Auth Mode

The app supports two authentication modes. **For your first run, use stub mode** — it lets you explore the app without needing a working database for auth.

```
NEXT_PUBLIC_AUTH_PROVIDER=stub
NEXT_PUBLIC_FORCE_TIER=free
```

| Variable | Value | What It Does |
|----------|-------|--------------|
| `NEXT_PUBLIC_AUTH_PROVIDER` | `stub` | Bypasses real login — you're automatically "logged in" as a test user |
| `NEXT_PUBLIC_AUTH_PROVIDER` | `nextauth` | Uses real email/password login against the database |
| `NEXT_PUBLIC_FORCE_TIER` | `free` | Shows the app as a free-tier user (limited features) |
| `NEXT_PUBLIC_FORCE_TIER` | `premium` | Shows the app as a premium user (compare tool, full finance data) |
| `NEXT_PUBLIC_FORCE_TIER` | `institutional` | Shows the app as an institutional user (all features) |

You can change these at any time. After editing `.env.local`, stop the dev server (`Ctrl+C`) and restart it (`npm run dev`) for the changes to take effect.

### 4e. Add Government API Keys (Optional)

These keys enable live data from government APIs. **The app will start without them**, but API-powered pages (zip code search, representative profiles, campaign finance) will show errors or empty states.

All three are free to obtain:

| Key | Where to Get It | What It Enables |
|-----|-----------------|-----------------|
| `CONGRESS_API_KEY` | https://api.congress.gov/sign-up/ | Bill data, voting records, member info from Congress.gov |
| `GOOGLE_CIVIC_API_KEY` | https://console.cloud.google.com/ (enable "Google Civic Information API") | Zip-code-to-representative lookup |
| `FEC_API_KEY` | https://api.open.fec.gov/developers/ | Campaign finance and donation data |

**Congress API sign-up** takes about 1 minute — enter your email, click the confirmation link, and copy the key from the confirmation page.

**Google Civic API** requires a Google Cloud account (free). Create a project, go to "APIs & Services" > "Enable APIs", search for "Google Civic Information API", enable it, then create an API key under "Credentials".

**FEC API** — enter your email on the registration page and the key is emailed to you immediately.

Once you have your keys, add them to `.env.local`:

```
CONGRESS_API_KEY=your-key-here
GOOGLE_CIVIC_API_KEY=your-key-here
FEC_API_KEY=your-key-here
```

> **Security reminder:** Never share these keys publicly or commit them to git. The `.env.local` file is already in `.gitignore`, so as long as you keep keys in that file, they're safe.

### 4f. Verify Your Configuration

After saving `.env.local`, do a quick sanity check:

```bash
# Make sure the file exists and isn't empty:
wc -l .env.local

# Make sure DATABASE_URL is set (this prints just the line count — not the actual secret):
grep -c "DATABASE_URL=" .env.local
```

You should see a line count greater than 0 and `1` for the grep. If `DATABASE_URL=` isn't found, reopen the file and check for typos.

**Common `.env.local` mistakes:**

| Mistake | Example | Fix |
|---------|---------|-----|
| Spaces around `=` | `DATABASE_URL = postgresql://...` | Remove spaces: `DATABASE_URL=postgresql://...` |
| Quotes around values | `DATABASE_URL="postgresql://..."` | Remove quotes: `DATABASE_URL=postgresql://...` |
| Trailing whitespace | `NEXTAUTH_SECRET=abc123   ` | Delete trailing spaces |
| Wrong filename | `.env.local.txt` or `env.local` | Must be exactly `.env.local` (starts with a dot, no extension) |
| Windows line endings after manual editing | Invisible `\r` characters | Open in VS Code, click "CRLF" in the bottom bar, switch to "LF" |

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
