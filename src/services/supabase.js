import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  "https://jeevuhvcteyedqazolqw.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZXZ1aHZjdGV5ZWRxYXpvbHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODQ4NjgsImV4cCI6MjA5NzE2MDg2OH0.S_2-34rymNmF58cgzLhy3HfeaMxGHdfMp7gXWEm4BsQ";

export const supabase =
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
