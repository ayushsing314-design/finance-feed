// The eight categories your feed is organized into. This is the one
// place both the backend (sources.ts) and frontend (Feed.tsx) import
// from, so they can never drift out of sync with each other.

export type Category =
  | "geopolitics"
  | "indian-economy"
  | "regulatory-policy"
  | "markets"
  | "global-markets"
  | "commodities-currency"
  | "company-news"
  | "general-finance";

export const CATEGORY_LABELS: Record<Category, string> = {
  geopolitics: "Geopolitics",
  "indian-economy": "Indian Economy",
  "regulatory-policy": "Regulatory & Policy",
  markets: "Indian Markets",
  "global-markets": "Global Markets",
  "commodities-currency": "Commodities & Currency",
  "company-news": "Company News",
  "general-finance": "General Finance",
};

// A short, generic "why this matters" line per category. Not
// article-specific analysis, just enough context to orient a reader,
// generated instantly and for free rather than by an AI call.
export const CATEGORY_CONTEXT: Record<Category, string> = {
  geopolitics: "Geopolitical shifts often move currencies, commodities, and risk appetite before the economic data catches up.",
  "indian-economy": "Economic indicators like this shape RBI policy expectations and the broader growth outlook.",
  "regulatory-policy": "Regulatory and policy changes directly affect compliance costs, market access, and sector valuations.",
  markets: "Price action here reflects how investors are currently pricing risk and growth in Indian equities.",
  "global-markets": "Global market moves and central bank decisions ripple into Indian markets through capital flows and rates.",
  "commodities-currency": "Commodity and currency moves affect input costs, inflation, and the rupee's trade balance.",
  "company-news": "Company-level developments like this affect sector sentiment and comparable valuations.",
  "general-finance": "Broader finance context worth tracking alongside the main market-moving stories.",
};
