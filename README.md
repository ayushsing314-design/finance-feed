# Finance Feed

A comprehensive, filtered finance and markets feed built for you. Pulls from 18 topic-based
Google News searches spanning Indian economy and policy, Indian markets, global markets and
central banks, commodities and currency, company news, and geopolitics. Filters out anything
that isn't finance-relevant, tags each article into one of eight categories, and generates a
short summary plus a "why this matters" line using Google's free Gemini API.

Total cost to run this: **Rs. 0**. Every service used here has a free tier that covers this
project's scale indefinitely.

You do not need Claude Code, npm, or any coding tool to deploy this. Everything below is done
through free website dashboards.

## What you need before starting

Three free accounts. Create these now if you don't have them:

1. **GitHub** — github.com/signup
2. **Supabase** — supabase.com (sign up with your GitHub account, it's one click)
3. **Vercel** — vercel.com (also sign up with GitHub)
4. **Google AI Studio** for your free Gemini API key — aistudio.google.com

## Step 1: Get your Gemini API key

1. Go to aistudio.google.com/apikey
2. Sign in with any Google account
3. Click "Create API key"
4. Copy it somewhere safe, you'll paste it into Vercel in step 4

This key is free, no card required, and stays free as long as you stay under 1,500 requests a
day. This project uses maybe 20-60 a day, so you have huge headroom.

## Step 2: Set up Supabase (your database)

1. Go to supabase.com, click "New project"
2. Name it anything, set a database password (save it somewhere), pick a region close to India
   (Singapore is usually closest)
3. Once the project loads, click "SQL Editor" in the left sidebar, then "New query"
4. Open the file `supabase-schema.sql` from this project, copy its entire content, paste it into
   the SQL editor, and click "Run"
5. Go to "Settings" (gear icon) -> "API" in the left sidebar. You'll need four values from this
   page in step 4:
   - Project URL (this is both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`)
   - `anon` `public` key (this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role` key (this is `SUPABASE_SERVICE_ROLE_KEY`, keep this one private, never put
     it in code that runs in the browser)

## Step 3: Push this code to GitHub

If you've never used GitHub before, the easiest path is the web upload, no terminal needed:

1. Go to github.com, click the "+" icon top right, "New repository"
2. Name it `finance-feed`, keep it Public or Private (either works), click "Create repository"
3. On the next page, click "uploading an existing file"
4. Drag the entire contents of this project folder into the browser window (everything except
   the `node_modules` folder, which you should not have anyway since you haven't run npm
   install)
5. Click "Commit changes"

## Step 4: Deploy to Vercel

1. Go to vercel.com, click "Add New" -> "Project"
2. Find your `finance-feed` repository and click "Import"
3. Before clicking Deploy, expand "Environment Variables" and add all five from `.env.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` — paste in the values from steps 1 and 2
4. Click "Deploy". Wait about a minute
5. Once done, Vercel gives you a live URL like `finance-feed-yourname.vercel.app`. Open it, you
   should see the site with an empty feed and a "Refresh now" button

6. One more setting: go to your Vercel project -> Settings -> Functions, and confirm Fluid
   Compute is enabled (it's on by default for new projects). This lets the refresh pipeline run
   up to 5 minutes instead of timing out at 10 seconds.

Click "Refresh now" on your live site. Wait 30-90 seconds. Articles should appear.

## Step 5: Turn on auto-refresh

Right now the site only updates when you click the button. To make it automatic every 30
minutes:

1. In your GitHub repository, go to Settings -> Secrets and variables -> Actions
2. Click "New repository secret", name it `SITE_URL`, paste in your Vercel URL from step 4
   (no trailing slash, e.g. `https://finance-feed-yourname.vercel.app`)
3. That's it. The workflow file at `.github/workflows/refresh.yml` is already in your repo, and
   GitHub will start running it automatically every 30 minutes, free, forever, on GitHub's free
   Actions tier

You can check it ran by going to the "Actions" tab in your GitHub repo.

## If a news source stops working

This project uses Google News search feeds rather than pinning to individual sites, so it's
fairly resistant to any one publisher changing their site. But Google's RSS format is unofficial
and undocumented, if it ever changes broadly, here's how to check and fix it:

1. Click "Refresh now" on your live site and check the Vercel function logs (Vercel dashboard ->
   your project -> Logs) for errors mentioning a specific feed
2. Open `lib/sources.ts` in this project. Each line is a `topicUrl("search terms")` call, you
   can edit the search terms directly, or replace a broken feed with a direct RSS URL from any
   news site's own feed
3. Re-upload the changed file to GitHub (edit files directly in GitHub's web interface with the
   pencil icon). Vercel redeploys automatically on every push

## First-day ramp-up

With 18 topic feeds, the very first refresh may find several hundred new articles at once. To
stay within Gemini's free rate limit, each run processes up to 60 new articles and leaves the
rest for the next run. This means the feed builds up over the first few hours rather than
filling instantly, that's expected, not a bug. After the first day, each 30-minute run only sees
genuinely new articles, typically far fewer than 60, and this catch-up period won't happen
again.

## This is the only maintenance this project should ever need.

## Adding or removing news categories

Open `lib/classify.ts` and edit the `SYSTEM_INSTRUCTION` text and the `CATEGORIES` list, then do
the same in `components/Feed.tsx` under `CATEGORIES` so the filter tabs match. Push to GitHub,
Vercel redeploys automatically.

## What each file does

- `lib/sources.ts` — the 18 topic searches this pulls from, covering Indian economy, policy,
  markets, global markets, commodities, currency, company news, and geopolitics
- `lib/fetchFeeds.ts` — fetches and parses those feeds, pulling the real publisher name out of
  each Google News entry
- `lib/classify.ts` — sends each new article to Gemini for relevance filtering, categorizing
  into one of eight categories, and summarizing
- `app/api/refresh/route.ts` — the full pipeline, triggered by the button or the scheduled job
- `components/Feed.tsx` — the page you see, with category tabs and the article list
- `supabase-schema.sql` — the database structure, run once during setup
- `.github/workflows/refresh.yml` — the free scheduler that keeps the feed updating on its own
