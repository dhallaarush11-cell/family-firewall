import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

// Resolve directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to parse environment variables without external dependencies
function loadEnv() {
  const envLocalPath = path.join(rootDir, '.env.local');
  const envPath = path.join(rootDir, '.env');

  let envFile = '';
  if (fs.existsSync(envLocalPath)) {
    envFile = fs.readFileSync(envLocalPath, 'utf8');
  } else if (fs.existsSync(envPath)) {
    envFile = fs.readFileSync(envPath, 'utf8');
  } else {
    throw new Error('Neither .env.local nor .env found');
  }

  const env = {};
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }

  const url = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in environment file');
  }

  return { url, anonKey };
}

async function runSecurityTest() {
  console.log('====================================================');
  console.log('       FAMILY FIREWALL RLS SECURITY VERIFICATION    ');
  console.log('====================================================\n');

  const { url, anonKey } = loadEnv();

  // Create isolated clients for User A and User B
  const clientA = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  const clientB = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  // Track created test rows
  const createdRows = [];

  try {
    // 1. Sign in User A and User B anonymously
    console.log('[1/3] Signing in two separate anonymous users (A and B)...');
    const { data: authA, error: authErrA } = await clientA.auth.signInAnonymously();
    if (authErrA || !authA.user) {
      throw new Error(`User A sign-in failed: ${authErrA?.message}`);
    }
    const userA = authA.user;

    const { data: authB, error: authErrB } = await clientB.auth.signInAnonymously();
    if (authErrB || !authB.user) {
      throw new Error(`User B sign-in failed: ${authErrB?.message}`);
    }
    const userB = authB.user;

    console.log(`  -> User A ID: ${userA.id}`);
    console.log(`  -> User B ID: ${userB.id}\n`);

    // 2. As User A: call create_family and insert one pause_pressed event
    console.log("[2/3] Setting up User A's family and pause_pressed event...");
    const { data: familyId, error: familyErr } = await clientA.rpc('create_family', {
      p_name: 'Test Elder A',
      p_role: 'elder',
      p_lang: 'en'
    });

    if (familyErr || !familyId) {
      throw new Error(`create_family RPC failed: ${familyErr?.message}`);
    }

    createdRows.push({
      table: 'families',
      id: familyId,
      description: 'Family cluster created by User A'
    });
    createdRows.push({
      table: 'members',
      id: userA.id,
      description: `Member row for User A in family ${familyId}`
    });

    // User A inserts pause_pressed event
    const { data: eventData, error: eventErr } = await clientA
      .from('events')
      .insert({
        family_id: familyId,
        member_id: userA.id,
        type: 'pause_pressed',
        payload: { source: 'home' }
      })
      .select('id')
      .single();

    if (eventErr || !eventData) {
      throw new Error(`User A pause_pressed insert failed: ${eventErr?.message}`);
    }

    createdRows.push({
      table: 'events',
      id: eventData.id,
      description: `pause_pressed event in family ${familyId}`
    });

    console.log(`  -> Family ID: ${familyId}`);
    console.log(`  -> Event ID:  ${eventData.id}\n`);

    // 3. As User B (who is not in any family):
    console.log('[3/3] Testing unauthorized read/write access as User B (not in any family)...');

    const testResults = [];

    // Query events
    const { data: eventsData, error: readEventsErr } = await clientB.from('events').select('*');
    testResults.push({
      target: 'events (SELECT)',
      expected: '0 rows',
      actual: `${eventsData?.length ?? 0} rows`,
      pass: (eventsData?.length ?? 0) === 0,
      details: readEventsErr ? readEventsErr.message : 'Protected by RLS'
    });

    // Query members
    const { data: membersData, error: readMembersErr } = await clientB.from('members').select('*');
    testResults.push({
      target: 'members (SELECT)',
      expected: '0 rows',
      actual: `${membersData?.length ?? 0} rows`,
      pass: (membersData?.length ?? 0) === 0,
      details: readMembersErr ? readMembersErr.message : 'Protected by RLS'
    });

    // Query families
    const { data: familiesData, error: readFamiliesErr } = await clientB.from('families').select('*');
    testResults.push({
      target: 'families (SELECT)',
      expected: '0 rows',
      actual: `${familiesData?.length ?? 0} rows`,
      pass: (familiesData?.length ?? 0) === 0,
      details: readFamiliesErr ? readFamiliesErr.message : 'Protected by RLS'
    });

    // Query drill_sessions
    const { data: drillsData, error: readDrillsErr } = await clientB.from('drill_sessions').select('*');
    testResults.push({
      target: 'drill_sessions (SELECT)',
      expected: '0 rows',
      actual: `${drillsData?.length ?? 0} rows`,
      pass: (drillsData?.length ?? 0) === 0,
      details: readDrillsErr ? readDrillsErr.message : 'Protected by RLS'
    });

    // Query pairing_codes
    const { data: codesData, error: readCodesErr } = await clientB.from('pairing_codes').select('*');
    testResults.push({
      target: 'pairing_codes (SELECT)',
      expected: '0 rows',
      actual: `${codesData?.length ?? 0} rows`,
      pass: (codesData?.length ?? 0) === 0,
      details: readCodesErr ? readCodesErr.message : 'Protected by RLS'
    });

    // Try to insert an event into User A's family using User B's credentials
    const { data: unauthorizedInsertData, error: insertErr } = await clientB
      .from('events')
      .insert({
        family_id: familyId,
        member_id: userB.id,
        type: 'pause_pressed',
        payload: { source: 'drill' }
      })
      .select();

    const insertRejected = !!insertErr && !unauthorizedInsertData;
    testResults.push({
      target: "events (INSERT into A's family)",
      expected: 'Rejected (Yes)',
      actual: insertRejected ? 'Rejected (Yes)' : 'Accepted (FAIL)',
      pass: insertRejected,
      details: insertErr ? `Error: ${insertErr.code || insertErr.message}` : 'UNEXPECTED INSERT SUCCESS'
    });

    // Print Results Table
    console.log('\n--- RLS ACCESS CONTROL RESULTS TABLE ---');
    console.table(
      testResults.map(r => ({
        'Target Table / Operation': r.target,
        'Expected': r.expected,
        'Actual Result': r.actual,
        'RLS Status': r.pass ? 'PASS (Secure)' : 'FAIL (Leaked)',
        'Details': r.details
      }))
    );

    // List Created Test Rows
    console.log('\n--- CREATED TEST ROWS FOR CLEANUP ---');
    console.log('The following test rows were created during this security test:');
    console.table(
      createdRows.map(r => ({
        'Table': r.table,
        'Row ID / UUID': r.id,
        'Description': r.description
      }))
    );

    console.log('\nTo delete these test rows, run the following SQL query in Supabase SQL Editor:');
    console.log(`DELETE FROM public.families WHERE id = '${familyId}';`);
    console.log(`-- (Cascade deletes automatically remove member '${userA.id}' and event '${eventData.id}')\n`);

  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runSecurityTest();
