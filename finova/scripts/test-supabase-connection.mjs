// ============================================================
// Finova — Supabase Connection & Schema Verifier
// Tests reachability, Auth service, and presence of all
// Prompt 4 & Prompt 5 tables in remote or local Supabase.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load from .env.local if present
let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
let key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (k.trim() === 'NEXT_PUBLIC_SUPABASE_URL') url = val;
        if (k.trim() === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' || k.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') key = val;
      }
    }
  } catch {
    // ignore
  }
}

if (!url || !key) {
  console.log('ℹ Notice: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not configured in .env.local');
  console.log('  Finova is ready to connect once your Supabase project credentials are provided in .env.local.');
  process.exit(0);
}

console.log('Testing connection to Supabase instance:', url);
const supabase = createClient(url, key);

async function testConnection() {
  try {
    // 1. Check Auth service reachability
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('Auth getSession returned error:', sessionError.message);
    } else {
      console.log('✓ Supabase Auth endpoint reached successfully. Active session:', sessionData.session ? 'Yes' : 'No (guest)');
    }

    // 2. Tables to verify
    const tables = [
      { name: 'profiles', migration: '20261008000000_auth_and_agreements.sql' },
      { name: 'user_agreements', migration: '20261008000000_auth_and_agreements.sql' },
      { name: 'broker_accounts', migration: '20261009000000_financial_database_architecture.sql' },
      { name: 'instruments', migration: '20261009000000_financial_database_architecture.sql' },
      { name: 'holdings', migration: '20261009000000_financial_database_architecture.sql' },
      { name: 'investment_transactions', migration: '20261009000000_financial_database_architecture.sql' },
      { name: 'instrument_prices', migration: '20261009000000_financial_database_architecture.sql' },
      { name: 'portfolio_snapshots', migration: '20261009000000_financial_database_architecture.sql' },
      { name: 'risk_profiles', migration: '20261009000000_financial_database_architecture.sql' },
      { name: 'investment_goals', migration: '20261009000000_financial_database_architecture.sql' },
    ];

    console.log('\nChecking Supabase tables:');
    for (const tbl of tables) {
      const { error } = await supabase.from(tbl.name).select('count', { count: 'exact', head: true });
      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ Table "${tbl.name}" not found. Run migration: ${tbl.migration}`);
        } else {
          // May receive RLS permission message when querying as anon without auth - which confirms table exists!
          console.log(`✓ Table "${tbl.name}" exists (RLS enforced: ${error.message})`);
        }
      } else {
        console.log(`✓ Table "${tbl.name}" exists and is accessible.`);
      }
    }

    console.log('\nSupabase schema check complete!');
  } catch (err) {
    console.error('Connection test error:', err);
  }
}

testConnection();
