import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Service-role client: full access, bypasses Row Level Security. Only ever
// imported from Route Handlers / server code — the `server-only` import
// above makes it a build error to pull this into a Client Component.
//
// Built lazily (on first use, not at module import) so `next build`'s
// static analysis of route handlers — which evaluates this module without
// calling anything — doesn't fail in environments where the env vars aren't
// set yet (e.g. before secrets are configured).
let client: SupabaseClient | undefined;

function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill them in.',
    );
  }

  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const real = getSupabaseAdmin();
    const value = Reflect.get(real, prop);
    // Methods must stay bound to the real client, not this proxy — the
    // library relies on internal `this` state (e.g. `.from(...).select(...)`).
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
