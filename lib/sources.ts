// Google News RSS search feeds, scoped to India edition. This is more
// reliable than pinning to five individual sites: Google aggregates from
// hundreds of publishers per topic, and the URL format doesn't break when
// any single news site redesigns. Each entry's real publisher name is
// pulled from the feed item itself, not from this list.
//
// This list is what makes the feed "comprehensive." Add or remove a line
// to add or remove a topic, no other code changes needed.

const BASE = "https://news.google.com/rss/search?q=";
const LOCALE = "&hl=en-IN&gl=IN&ceid=IN:en";

function topicUrl(query: string) {
  return `${BASE}${encodeURIComponent(query)}${LOCALE}`;
}

export const RSS_SOURCES = [
  // Indian economy and policy
  { name: "RBI & monetary policy", url: topicUrl("RBI repo rate monetary policy") },
  { name: "Indian economy", url: topicUrl("India GDP inflation economy") },
  { name: "Union budget & fiscal policy", url: topicUrl("India union budget fiscal deficit") },
  { name: "SEBI & regulation", url: topicUrl("SEBI regulation India markets") },

  // Indian markets
  { name: "Sensex & Nifty", url: topicUrl("Sensex Nifty stock market India") },
  { name: "India IPOs", url: topicUrl("India IPO listing") },
  { name: "Bank NPAs & credit", url: topicUrl("bank NPA credit rating India") },
  { name: "M&A India", url: topicUrl("merger acquisition India company") },
  { name: "Corporate earnings India", url: topicUrl("India company quarterly results earnings") },

  // Global markets and macro
  { name: "US Federal Reserve", url: topicUrl("US Federal Reserve interest rate") },
  { name: "Global markets", url: topicUrl("Wall Street global markets") },
  { name: "China economy", url: topicUrl("China economy slowdown markets") },
  { name: "European Central Bank", url: topicUrl("European Central Bank ECB policy") },

  // Commodities, currency, geopolitics
  { name: "Crude oil", url: topicUrl("crude oil price market") },
  { name: "Rupee & currency", url: topicUrl("rupee dollar currency India") },
  { name: "Gold prices", url: topicUrl("gold price India market") },
  { name: "Geopolitics & markets", url: topicUrl("geopolitical tension markets economy") },
  { name: "Crypto regulation", url: topicUrl("cryptocurrency regulation India") },
];
