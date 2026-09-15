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

async function callGemini(article: RawArticle): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `${SYSTEM_INSTRUCTION}\n\nHeadline: ${article.title}\nSource: ${article.source}\nExcerpt: ${article.description.slice(0, 500)}`;

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // thinkingConfig with a low level stops gemini-3.6-flash from
      // spending tokens on internal reasoning before answering, which
      // was eating into our output budget and causing cut-off JSON.
      // maxOutputTokens raised as a safety margin on top of that.
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500,
        thinkingConfig: { thinkingLevel: "minimal" },
      },
    }),
  });
}

async function classifyOne(article: RawArticle): Promise<ClassifiedArticle | null> {
  let res = await callGemini(article);

  // 503 means Gemini is temporarily overloaded, not a real problem with
  // our request, so it's worth exactly one retry after a short pause
  // rather than giving up on an otherwise-good article.
  if (res.status === 503) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    res = await callGemini(article);
  }

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

  // Extract only the {...} block, ignoring any commentary or reasoning
  // text the model might place before or after it, rather than assuming
  // the entire response is pure JSON.
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  const cleaned = jsonStart !== -1 && jsonEnd !== -1 ? text.slice(jsonStart, jsonEnd + 1) : text.trim();

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

// Gemini's free tier allows roughly 15 requests per minute. We space
// requests about 4.3 seconds apart to stay under that, and process
// sequentially rather than in batches with long pauses.
//
// onClassified, if provided, is called immediately after each article is
// successfully classified, before moving to the next one. This is what
// lets the caller save each result to the database as it happens, so a
// Vercel timeout partway through a run doesn't lose everything already
// done, only the articles not yet reached. Storing everything in one
// batch at the very end was the original design, and it meant a single
// timeout wiped out an entire run's worth of successful work.
export async function classifyArticles(
  articles: RawArticle[],
  onClassified?: (article: ClassifiedArticle) => Promise<void>,
  maxToProcess = 45
): Promise<ClassifiedArticle[]> {
  const SPACING_MS = 4300;
  const results: ClassifiedArticle[] = [];
  const toProcess = articles.slice(0, maxToProcess);

  for (const article of toProcess) {
    try {
      const classified = await classifyOne(article);
      if (classified) {
        results.push(classified);
        if (onClassified) {
          try {
            await onClassified(classified);
          } catch (err) {
            console.error(`Failed to save "${classified.title}"`, err);
          }
        }
      }
    } catch (err) {
      console.error(`Classification failed for "${article.title}"`, err);
    }
    await new Promise((resolve) => setTimeout(resolve, SPACING_MS));
  }

  return results;
}
