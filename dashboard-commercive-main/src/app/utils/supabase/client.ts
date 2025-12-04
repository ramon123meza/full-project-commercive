import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./database.types";

let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

export function createClient() {
  // Return existing client if it exists
  if (supabaseClient) {
    return supabaseClient;
  }

  // Create new client only if none exists
  supabaseClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return supabaseClient;
}
