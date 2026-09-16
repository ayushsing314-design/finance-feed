# Finance Feed

A comprehensive, filtered finance and markets feed. Pulls from 18 topic-based Google News
searches spanning Indian economy and policy, Indian markets, global markets and central banks,
commodities and currency, company news, and geopolitics. Each article is tagged into one of
eight categories and shown with the publisher's own summary plus a short category context line.

Total cost to run this: **Rs. 0, indefinitely.** There is no AI API in this pipeline at all, no
model names to keep up with, no daily request limits, nothing that can be deprecated or rate-
limited. The only two services involved (Supabase and Vercel) have free tiers that comfortably
cover this project's scale forever.

You do not need Claude Code, npm, or any coding tool to deploy this. Everything below is done
through free website dashboards.

## What you need before starting

Three free accounts:

1. **GitHub** — github.com/signup
2. **Supabase** — supabase.com (sign up with your GitHub account, it's one click)
3. **Vercel** — vercel.com (also sign up with GitHub)

## Step 1: Set up Supabase (your database)

1. Go to supabase.com, click "New project"
2. Name it anything, set a database password (save it somewhere), pick a region close to India
   (Singapore is usually closest)
3. Once the project loads, click "SQL Editor" in the left sidebar, then "New query"
4. Open the file `supabase-schema.sql` from this project, copy its entire content, paste it into
   the SQL editor, and click "Run"
5. Go to "Settings" (gear icon) -> "API" in the left sidebar. You'll need these values in step 3:
   - Project URL (this is both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`)
   - The publishable/anon key (this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - The secret/service_role key (this is `SUPABASE_SERVICE_ROLE_KEY`, keep this one private)

## Step 2: Push this code to GitHub

1. Go to github.com, click "+" top right -> "New repository"
2. Name it `finance-feed`, click "Create repository"
3. Click "uploading an existing file"
4. Drag in every file and folder from this project (app, lib, components, .github, and all the
   loose files) — drag actual folder icons from your file explorer, not just their contents, so
   GitHub preserves the folder structure
5. Click "Commit changes"

## Step 3: Deploy to Vercel

1. Go to vercel.com, click "Add New" -> "Project", import your `finance-feed` repository
2. Before deploying, expand "Environment Variables" and add the four from `.env.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`
3. Click "Deploy". Wait about a minute
4. Open your live site, you should see the Finance Feed page with an empty feed and a "Refresh
   now" button

Click "Refresh now". This should take well under a minute, there's no external API call slowing
it down, and articles should appear immediately.

## Step 4: Turn on auto-refresh

1. In your GitHub repository, go to Settings -> Secrets and variables -> Actions
2. Click "New repository secret", name it `SITE_URL`, paste in your Vercel URL (no trailing
   slash)
3. Done. `.github/workflows/refresh.yml` is already in your repo, and GitHub runs it
   automatically every 30 minutes, free, forever

## If a news source stops working

This project uses Google News search feeds rather than pinning to individual sites, so it's
fairly resistant to any one publisher changing their site. If Google's RSS format itself ever
changes:

1. Check Vercel's Logs for a message like "Feed failed: [topic name]"
2. Open `lib/sources.ts`, each line is a `topicUrl("search terms")` call with a `category`
   attached, edit the search terms or category as needed
3. Re-upload the changed file to GitHub (edit files directly in GitHub's web interface with the
   pencil icon). Vercel redeploys automatically on every push

## Adding or removing news topics

Open `lib/sources.ts` and add or remove a line, each one is a topic search paired with a
category. To change the categories themselves, edit `lib/categories.ts`, both the backend and
frontend read from that one file, so they can't drift out of sync.

## What each file does

- `lib/categories.ts` — the eight categories, their display labels, and a short generic context
  line for each, shared by both the backend and frontend
- `lib/sources.ts` — the 18 topic searches, each tagged with its category directly
- `lib/fetchFeeds.ts` — fetches and parses those feeds, pulling the real publisher name and
  category through for each entry
- `lib/process.ts` — turns a raw feed entry into a displayable article: the publisher's own
  description becomes the summary, no AI call involved
- `app/api/refresh/route.ts` — the full pipeline: fetch, dedupe against what's already stored,
  process, save. Triggered by the button or the scheduled job
- `components/Feed.tsx` — the page you see, with category tabs and the article list
- `supabase-schema.sql` — the database structure, run once during setup
- `.github/workflows/refresh.yml` — the free scheduler that keeps the feed updating on its own
