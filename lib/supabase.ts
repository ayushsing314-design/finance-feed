import { createClient } from "@supabase/supabase-js";

// Two clients: one for the browser (read-only, safe key), one for
// the server pipeline (write access, uses the service role key).
export function getServerSupabase() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey);
}

export type Article = {
  id: string;
  title: string;
  link: string;
  source: string;
  category: string;
  summary: string;
  why_it_matters: string;
  published_at: string;
  fetched_at: string;
};
