import { NextRequest, NextResponse } from "next/server";
import { fetchAllFeeds } from "@/lib/fetchFeeds";
import { classifyArticles, ClassifiedArticle } from "@/lib/classify";
import { getServerSupabase } from "@/lib/supabase";

// Allow up to 5 minutes. Vercel's Hobby plan supports this via Fluid
// Compute; if your project has it disabled, enable it in Project
// Settings -> Functions, it costs nothing extra on Hobby.
export const maxDuration = 300;

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes, for the manual button

export async function POST(req: NextRequest) {
  // Both the manual refresh button and the scheduled GitHub Action call
  // this route. No secret is required to trigger it, the cooldown check
  // below is what actually protects your Gemini quota: nobody, including
  // you, can trigger more than one run per 5 minutes, so there is no
  // meaningful abuse to prevent by adding a login on top of that.
  const supabase = getServerSupabase();

  // Cooldown check: read the timestamp of the most recent run.
  const { data: lastRun } = await supabase
    .from("pipeline_runs")
    .select("started_at")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRun) {
    const elapsed = Date.now() - new Date(lastRun.started_at).getTime();
    if (elapsed < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        { error: `Cooldown active, try again in ${waitSec}s`, cooldownRemaining: waitSec },
        { status: 429 }
      );
    }
  }

  await supabase.from("pipeline_runs").insert({ started_at: new Date().toISOString() });

  // 1. Pull everything currently in the RSS feeds.
  const rawArticles = await fetchAllFeeds();

  // 2. Drop anything already stored, so we only spend Gemini calls on
  //    genuinely new articles. This is what keeps each run small and fast.
  const { data: existing } = await supabase.from("articles").select("link");
  const existingLinks = new Set((existing || []).map((a) => a.link));
  const newArticles = rawArticles.filter((a) => !existingLinks.has(a.link));

  if (newArticles.length === 0) {
    return NextResponse.json({ message: "No new articles found", fetched: rawArticles.length, new: 0, stored: 0 });
  }

  // 3. Classify, saving each article to Supabase the moment it's ready
  //    rather than waiting for the whole batch. If Vercel cuts the
  //    function off mid-run, everything classified before that point is
  //    already safely stored, only the remainder is lost, and the next
  //    scheduled run picks up where this one left off (since already-
  //    stored links are excluded from "new" articles in step 2 above).
  let storedCount = 0;
  const saveOne = async (article: ClassifiedArticle) => {
    const { error } = await supabase.from("articles").upsert(
      [
        {
          title: article.title,
          link: article.link,
          source: article.source,
          category: article.category,
          summary: article.summary,
          why_it_matters: article.whyItMatters,
          published_at: article.publishedAt,
          fetched_at: new Date().toISOString(),
        },
      ],
      { onConflict: "link" }
    );
    if (error) {
      console.error(`Insert error for "${article.title}"`, error);
    } else {
      storedCount++;
    }
  };

  const classified = await classifyArticles(newArticles, saveOne);

  return NextResponse.json({
    message: "Refresh complete",
    fetched: rawArticles.length,
    new: newArticles.length,
    classified: classified.length,
    stored: storedCount,
  });
}
