import { RawArticle } from "./fetchFeeds";

export type Category =
  | "geopolitics"
  | "indian-economy"
  | "regulatory-policy"
  | "markets"
  | "global-markets"
  | "commodities-currency"
  | "company-news"
  | "general-finance";

export type ClassifiedArticle = {
  title: string;
  link: string;
  source: string;
  category: Category;
  summary: string;
  whyItMatters: string;
  publishedAt: string;
};

export const CATEGORIES: Category[] = [
  "geopolitics",
  "indian-economy",
  "regulatory-policy",
  "markets",
  "global-markets",
  "commodities-currency",
  "company-news",
  "general-finance",
];

const SYSTEM_INSTRUCTION = `You screen news for a CFA candidate and MBA finance student in India who
wants comprehensive, genuinely useful coverage across the full breadth of finance, not just
Indian headlines.

Decide if the article is relevant to any of: geopolitics affecting markets, the Indian economy
(GDP, inflation, employment), Indian regulatory and fiscal policy (RBI, SEBI, union budget), Indian
equity markets, global markets and central banks (Fed, ECB, China), commodities and currency
(oil, gold, rupee, forex), or company-specific news (earnings, NPAs, credit ratings, M&A, IPOs).
Reject anything unrelated to finance and markets: entertainment, sports, general lifestyle,
celebrity news.

If relevant, respond ONLY with valid JSON in this exact shape, no markdown, no extra text:
{"relevant": true, "category": "one of: geopolitics, indian-economy, regulatory-policy, markets, global-markets, commodities-currency, company-news, general-finance", "summary": "two sentence plain-language summary", "whyItMatters": "one sentence on the market or economic implication, written for someone who already understands finance basics"}

If not relevant, respond ONLY with:
{"relevant": false}`;

async function classifyOne(article: RawArticle): Promise<ClassifiedArticle | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `${SYSTEM_INSTRUCTION}\n\nHeadline: ${article.title}\nSource: ${article.source}\nExcerpt: ${article.description.slice(0, 500)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
    }),
  });

  if (!res.ok) {
    // Log the full response body, not just the status code, this is what
    // actually names the problem (wrong model, API not enabled, bad key,
    // quota exceeded, etc.) instead of a bare, unhelpful "404".
    const errorBody = await res.text();
    console.error(`Gemini API error ${res.status} for "${article.title}": ${errorBody}`);
    return null;
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Strip accidental markdown code fences before parsing.
  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.relevant) return null;
    if (!CATEGORIES.includes(parsed.category)) parsed.category = "general-finance";

    return {
      title: article.title,
      link: article.link,
      source: article.source,
      category: parsed.category,
      summary: parsed.summary || "",
      whyItMatters: parsed.whyItMatters || "",
      publishedAt: article.publishedAt,
    };
  } catch {
    console.error(`Could not parse Gemini response for "${article.title}": ${cleaned}`);
    return null;
  }
}

// Gemini's free tier allows 15 requests per minute. We space requests
// about 4.3 seconds apart (roughly 14/min) to stay safely under that,
// and process sequentially rather than in batches with long pauses, so
// this finishes well inside Vercel's 300-second function time limit
// (60 articles x 4.3s is about 4.3 minutes). Because the pipeline only
// classifies articles it hasn't seen before (see the /api/refresh
// route), each run is normally well under that cap even with 18 source
// feeds, most of what comes back on a given run is duplicates already
// stored from a previous run.
export async function classifyArticles(
  articles: RawArticle[],
  maxToProcess = 60
): Promise<ClassifiedArticle[]> {
  const SPACING_MS = 4300;
  const results: ClassifiedArticle[] = [];
  const toProcess = articles.slice(0, maxToProcess);

  for (const article of toProcess) {
    try {
      const classified = await classifyOne(article);
      if (classified) results.push(classified);
    } catch (err) {
      console.error(`Classification failed for "${article.title}"`, err);
    }
    await new Promise((resolve) => setTimeout(resolve, SPACING_MS));
  }

  return results;
}
