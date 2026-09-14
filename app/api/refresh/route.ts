import { NextRequest, NextResponse } from "next/server";
import { fetchAllFeeds } from "@/lib/fetchFeeds";
import { classifyArticles } from "@/lib/classify";
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
    return NextResponse.json({ message: "No new articles found", added: 0 });
  }

  // 3. Filter and classify only the new ones.
  const classified = await classifyArticles(newArticles);

  // 4. Store. onConflict guards against a race if two triggers overlap.
  if (classified.length > 0) {
    const rows = classified.map((c) => ({
      title: c.title,
      link: c.link,
      source: c.source,
      category: c.category,
      summary: c.summary,
      why_it_matters: c.whyItMatters,
      published_at: c.publishedAt,
      fetched_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("articles").upsert(rows, { onConflict: "link" });
    if (error) {
      console.error("Insert error", error);
      return NextResponse.json({ error: "Failed to store articles" }, { status: 500 });
    }
  }

  return NextResponse.json({
    message: "Refresh complete",
    fetched: rawArticles.length,
    new: newArticles.length,
    stored: classified.length,
  });
}
