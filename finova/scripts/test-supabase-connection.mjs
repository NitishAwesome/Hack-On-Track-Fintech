// Supabase Connection Verifier
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
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing in environment / .env.local');
  process.exit(1);
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

    // 2. Check public table access (profiles / user_agreements)
    const { error: profileError } = await supabase.from('profiles').select('count').limit(1);
    if (profileError) {
      console.log('Note on public.profiles table:', profileError.message);
      if (profileError.code === '42P01') {
        console.log('ℹ Table "profiles" does not exist yet. Please run migration: 20261008000000_auth_and_agreements.sql in your Supabase SQL Editor.');
      }
    } else {
      console.log('✓ public.profiles table exists and query succeeded.');
    }

    // 3. Check user_agreements table
    const { error: agreementsError } = await supabase.from('user_agreements').select('count').limit(1);
    if (agreementsError) {
      console.log('Note on public.user_agreements table:', agreementsError.message);
      if (agreementsError.code === '42P01') {
        console.log('ℹ Table "user_agreements" does not exist yet. Please run migration: 20261008000000_auth_and_agreements.sql in your Supabase SQL Editor.');
      }
    } else {
      console.log('✓ public.user_agreements table exists and query succeeded.');
    }

    console.log('\nSupabase credentials test complete!');
  } catch (err) {
    console.error('Connection test error:', err);
  }
}

testConnection();
