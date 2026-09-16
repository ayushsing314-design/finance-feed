// Google News RSS search feeds, scoped to India edition. Google
// aggregates from hundreds of publishers per topic, and this URL format
// doesn't break when any single news site redesigns.
//
// Each source carries its own category directly. Since we already know
// what topic each search targets, there's no need to ask an AI to figure
// out the category, we just assign it once, here. This is what lets the
// whole pipeline run without any external AI API: no model names to keep
// up with, no quotas, no daily limits, nothing that can be deprecated or
// rate-limited. Add or remove a line to add or remove a topic.

import { Category } from "./categories";

const BASE = "https://news.google.com/rss/search?q=";
const LOCALE = "&hl=en-IN&gl=IN&ceid=IN:en";

function topicUrl(query: string) {
  return `${BASE}${encodeURIComponent(query)}${LOCALE}`;
}

export const RSS_SOURCES: { name: string; url: string; category: Category }[] = [
  // Indian economy and policy
  { name: "RBI & monetary policy", url: topicUrl("RBI repo rate monetary policy"), category: "regulatory-policy" },
  { name: "Indian economy", url: topicUrl("India GDP inflation economy"), category: "indian-economy" },
  { name: "Union budget & fiscal policy", url: topicUrl("India union budget fiscal deficit"), category: "regulatory-policy" },
  { name: "SEBI & regulation", url: topicUrl("SEBI regulation India markets"), category: "regulatory-policy" },

  // Indian markets
  { name: "Sensex & Nifty", url: topicUrl("Sensex Nifty stock market India"), category: "markets" },
  { name: "India IPOs", url: topicUrl("India IPO listing"), category: "company-news" },
  { name: "Bank NPAs & credit", url: topicUrl("bank NPA credit rating India"), category: "company-news" },
  { name: "M&A India", url: topicUrl("merger acquisition India company"), category: "company-news" },
  { name: "Corporate earnings India", url: topicUrl("India company quarterly results earnings"), category: "company-news" },

  // Global markets and macro
  { name: "US Federal Reserve", url: topicUrl("US Federal Reserve interest rate"), category: "global-markets" },
  { name: "Global markets", url: topicUrl("Wall Street global markets"), category: "global-markets" },
  { name: "China economy", url: topicUrl("China economy slowdown markets"), category: "global-markets" },
  { name: "European Central Bank", url: topicUrl("European Central Bank ECB policy"), category: "global-markets" },

  // Commodities, currency, geopolitics
  { name: "Crude oil", url: topicUrl("crude oil price market"), category: "commodities-currency" },
  { name: "Rupee & currency", url: topicUrl("rupee dollar currency India"), category: "commodities-currency" },
  { name: "Gold prices", url: topicUrl("gold price India market"), category: "commodities-currency" },
  { name: "Geopolitics & markets", url: topicUrl("geopolitical tension markets economy"), category: "geopolitics" },
  { name: "Crypto regulation", url: topicUrl("cryptocurrency regulation India"), category: "regulatory-policy" },
];
