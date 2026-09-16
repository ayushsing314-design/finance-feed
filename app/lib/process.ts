import { RawArticle } from "./fetchFeeds";
import { Category, CATEGORY_CONTEXT } from "./categories";

export type ProcessedArticle = {
  title: string;
  link: string;
  source: string;
  category: Category;
  summary: string;
  whyItMatters: string;
  publishedAt: string;
};

// Google's own description/snippet for the article becomes the summary.
// It's genuinely written by the original publisher, so it's accurate,
// and it costs nothing to use, no AI call, no rate limit, no daily cap.
// Category comes straight from which topic search found the article
// (assigned once in sources.ts), so there's nothing to classify at
// request time either.
export function processArticle(article: RawArticle, category: Category): ProcessedArticle {
  const rawSummary = article.description.replace(/\s+/g, " ").trim();
  const summary = rawSummary.length > 280 ? rawSummary.slice(0, 277) + "..." : rawSummary;

  return {
    title: article.title,
    link: article.link,
    source: article.source,
    category,
    summary,
    whyItMatters: CATEGORY_CONTEXT[category],
    publishedAt: article.publishedAt,
  };
}
