"use client";

import { useEffect, useState } from "react";
import { getPublicSupabase, Article } from "@/lib/supabase";
import { CATEGORY_LABELS } from "@/lib/categories";

const CATEGORIES = [
  { key: "all", label: "All" },
  ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label })),
];

const COOLDOWN_SECONDS = 60;

export default function Feed() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  async function loadArticles() {
    setLoading(true);
    const supabase = getPublicSupabase();
    let query = supabase.from("articles").select("*").order("published_at", { ascending: false }).limit(100);
    if (activeCategory !== "all") query = query.eq("category", activeCategory);
    const { data } = await query;
    setArticles(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json();
      if (res.status === 429 && data.cooldownRemaining) {
        setCooldown(data.cooldownRemaining);
      } else if (res.ok) {
        setCooldown(COOLDOWN_SECONDS);
        await loadArticles();
      }
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Finance Feed</h1>
        <button
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing || cooldown > 0}
        >
          {refreshing ? "Refreshing..." : cooldown > 0 ? `Wait ${cooldown}s` : "Refresh now"}
        </button>
      </div>

      <div className="tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`tab ${activeCategory === c.key ? "active" : ""}`}
            onClick={() => setActiveCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : articles.length === 0 ? (
        <div className="empty">
          No articles yet. Click "Refresh now" to pull the latest news.
        </div>
      ) : (
        articles.map((a) => (
          <div className="card" key={a.id}>
            <h2 className="card-title">
              <a href={a.link} target="_blank" rel="noopener noreferrer">
                {a.title}
              </a>
            </h2>
            {a.summary && <p className="card-summary">{a.summary}</p>}
            {a.why_it_matters && <p className="card-why">{a.why_it_matters}</p>}
            <div className="card-meta">
              <span>{a.source}</span>
              <span>{new Date(a.published_at).toLocaleString("en-IN")}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
