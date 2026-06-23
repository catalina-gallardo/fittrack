// lib/supabase.js
// Connects your app to Supabase. The values come from .env.local (local)
// or Render's environment variables (live). Never hard-code your keys here.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey);
