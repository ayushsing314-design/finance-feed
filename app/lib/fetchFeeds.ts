import Parser from "rss-parser";
import { RSS_SOURCES } from "./sources";
import { Category } from "./categories";

export type RawArticle = {
  title: string;
  link: string;
  source: string;
  description: string;
  publishedAt: string;
  category: Category;
};

const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: ["source"], // Google News RSS embeds the real publisher name here
  },
});

export async function fetchAllFeeds(): Promise<RawArticle[]> {
  const results: RawArticle[] = [];

  // Fetch every feed in parallel, but never let one bad feed kill the rest.
  const settled = await Promise.allSettled(
    RSS_SOURCES.map(async (source) => {
      const feed = await parser.parseURL(source.url);
      return (feed.items || []).map((item: any) => ({
        title: item.title || "",
        link: item.link || "",
        // Prefer the actual publisher (e.g. "Livemint") over the topic
        // label; fall back to the topic label if Google didn't include one.
        source: item.source?._ || item.source || source.name,
        description: item.contentSnippet || item.content || "",
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        category: source.category,
      }));
    })
  );

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status === "fulfilled") {
      results.push(...result.value);
    } else {
      // Logged, not thrown. One dead feed URL should never take the site down.
      console.error(`Feed failed: ${RSS_SOURCES[i].name} (${RSS_SOURCES[i].url})`, result.reason);
    }
  }

  return results.filter((a) => a.title && a.link);
}
