// Read-only schema probe using the configured public Supabase key.
// A table's REST visibility does not prove its constraints, policies or migrations.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = { ...process.env };
if (fs.existsSync('.env.local')) for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (match && !env[match[1]]) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.log('Configured Supabase endpoint unavailable; owner preflight is pending.'); process.exitCode = 1; }
else {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const table of ['broker_accounts', 'holdings', 'investment_transactions', 'portfolio_snapshots', 'investment_goals', 'user_watchlist']) {
    const columns = table === 'investment_goals' ? 'goal_name,target_amount,current_amount,current_allocated_amount,target_date,category,priority,status,currency' : '*';
    const { error } = await client.from(table).select(columns).limit(0);
    const status = !error ? 'REST relation available; owner policies still require verification' : ['PGRST205', '42P01'].includes(error.code) ? 'Relation missing from REST schema; check migration state' : ['42501', 'PGRST301'].includes(error.code) ? 'Public access denied; owner verification required' : `Could not verify (code ${error.code || 'transport'}); owner verification required`;
    console.log(`${table}: ${status}`);
  }
  console.log('No writes performed. Run the owner SQL preflight separately before a release.');
}
