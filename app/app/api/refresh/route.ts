import { NextRequest, NextResponse } from "next/server";
import { fetchAllFeeds } from "@/lib/fetchFeeds";
import { processArticle } from "@/lib/process";
import { getServerSupabase } from "@/lib/supabase";

// No external AI calls means this whole pipeline runs in a few seconds,
// not minutes, so the generous 300s Fluid Compute limit is just a safety
// margin here, not something we're pushing against.
export const maxDuration = 60;

const COOLDOWN_MS = 60 * 1000; // 1 minute, just to prevent accidental double-clicks

export async function POST(req: NextRequest) {
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

  // 2. Drop anything already stored.
  const { data: existing } = await supabase.from("articles").select("link");
  const existingLinks = new Set((existing || []).map((a) => a.link));
  const newArticles = rawArticles.filter((a) => !existingLinks.has(a.link));

  if (newArticles.length === 0) {
    return NextResponse.json({ message: "No new articles found", fetched: rawArticles.length, new: 0, stored: 0 });
  }

  // 3. Process (no AI call, just formatting) and store all of them at
  //    once. This is safe to batch now, unlike the old Gemini version,
  //    because this whole step takes well under a second.
  const rows = newArticles.map((article) => {
    const processed = processArticle(article, article.category);
    return {
      title: processed.title,
      link: processed.link,
      source: processed.source,
      category: processed.category,
      summary: processed.summary,
      why_it_matters: processed.whyItMatters,
      published_at: processed.publishedAt,
      fetched_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase.from("articles").upsert(rows, { onConflict: "link" });
  if (error) {
    console.error("Insert error", error);
    return NextResponse.json({ error: "Failed to store articles" }, { status: 500 });
  }

  return NextResponse.json({
    message: "Refresh complete",
    fetched: rawArticles.length,
    new: newArticles.length,
    stored: rows.length,
  });
}
