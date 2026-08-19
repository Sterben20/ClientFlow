import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Safely try to load 'pg' if available for direct DB diagnostics
let Client: any = null;
try {
  Client = require('pg').Client;
} catch (e) {
  // pg is not installed, we'll gracefully degrade to NOT VERIFIED for system catalogs
}

async function runDiagnostic() {
  console.log("==================================================");
  console.log("ACTIVITY SYSTEM FINAL DIAGNOSTIC");
  console.log("==================================================\n");

  const args = process.argv.slice(2);
  const sinceIndex = args.indexOf('--since');
  let cutoffDate: Date;

  if (sinceIndex !== -1 && args[sinceIndex + 1]) {
    cutoffDate = new Date(args[sinceIndex + 1]);
    if (isNaN(cutoffDate.getTime())) {
      console.error("Invalid --since timestamp provided.");
      process.exit(1);
    }
    console.log(`Analyzing activities created since: ${cutoffDate.toISOString()}\n`);
  } else {
    console.error("Missing required argument: --since <ISO_TIMESTAMP>");
    process.exit(1);
  }

  let pgClient: any = null;
  let hasDirectDb = false;

  if (databaseUrl && Client) {
    try {
      pgClient = new Client({ connectionString: databaseUrl });
      await pgClient.connect();
      hasDirectDb = true;
      console.log("✅ Direct database connection established.\n");
    } catch (err) {
      console.warn("⚠️ Failed to connect to database directly. Using degraded diagnostics.\n");
    }
  } else {
    console.warn("⚠️ DATABASE_URL or 'pg' package not found. System catalog diagnostics will report NOT VERIFIED.\n");
  }

  const results: Record<string, string> = {
    triggerAttachments: 'NOT VERIFIED',
    rlsPolicyState: 'NOT VERIFIED',
    metadataIntegrity: 'NOT VERIFIED',
    workspaceAttribution: 'NOT VERIFIED',
    actorAttribution: 'NOT VERIFIED',
    duplicateDetection: 'NOT VERIFIED',
    appendOnlyPolicy: 'NOT VERIFIED',
    securityDefiner: 'NOT VERIFIED'
  };

  // ==========================================
  // [1] Trigger Attachments
  // ==========================================
  console.log("--- [1] Trigger Attachments ---");
  const expectedTriggers = [
    { table: 'clients', trigger: 'on_client_activity' },
    { table: 'projects', trigger: 'on_project_activity' },
    { table: 'tasks', trigger: 'on_task_activity' },
    { table: 'client_notes', trigger: 'on_client_note_activity' },
    { table: 'memberships', trigger: 'on_membership_activity' }
  ];

  if (hasDirectDb) {
    let allFound = true;
    for (const expected of expectedTriggers) {
      const res = await pgClient.query(`
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = $1 AND t.tgname = $2
      `, [expected.table, expected.trigger]);
      if (res.rowCount > 0) {
        console.log(`  ✅ ${expected.table} -> ${expected.trigger}`);
      } else {
        console.log(`  ❌ MISSING: ${expected.table} -> ${expected.trigger}`);
        allFound = false;
      }
    }
    results.triggerAttachments = allFound ? 'PASS' : 'FAIL';
  } else {
    // Fallback to RPC
    const { data: triggers, error: triggerError } = await supabase.rpc('get_activity_triggers');
    if (triggerError) {
      console.log("  ⚠️ Temporary diagnostic RPC 'get_activity_triggers' unavailable.");
      results.triggerAttachments = 'NOT VERIFIED';
    } else {
      let allFound = true;
      for (const expected of expectedTriggers) {
        const found = triggers?.find((t: any) => t.table_name === expected.table && t.trigger_name === expected.trigger);
        if (found) {
          console.log(`  ✅ ${expected.table} -> ${expected.trigger}`);
        } else {
          console.log(`  ❌ MISSING: ${expected.table} -> ${expected.trigger}`);
          allFound = false;
        }
      }
      results.triggerAttachments = allFound ? 'PASS' : 'FAIL';
      console.log("  (Verified via temporary diagnostic RPC)");
    }
  }

  // ==========================================
  // [2] RLS Policy State & [7] Append-only Policy
  // ==========================================
  console.log("\n--- [2] RLS Policy State & [7] Append-only Policy ---");
  if (hasDirectDb) {
    const res = await pgClient.query(`
      SELECT policyname, cmd 
      FROM pg_policies 
      WHERE tablename = 'activities'
    `);
    
    let hasSelect = false;
    let hasMutation = false;
    let legacyFound = false;

    for (const row of res.rows) {
      if (row.cmd === 'SELECT') hasSelect = true;
      if (['INSERT', 'UPDATE', 'DELETE'].includes(row.cmd)) hasMutation = true;
      if (['Members can insert activities', 'Members can update activities', 'Admins and Owners can delete activities'].includes(row.policyname)) {
        legacyFound = true;
      }
    }

    if (!hasSelect) {
      console.log("  ❌ Missing workspace-scoped SELECT policy!");
      results.rlsPolicyState = 'FAIL';
      results.appendOnlyPolicy = 'FAIL';
    } else if (legacyFound) {
      console.log("  ❌ Legacy permissive mutation policies still exist!");
      results.rlsPolicyState = 'FAIL';
      results.appendOnlyPolicy = 'FAIL';
    } else if (hasMutation) {
      console.log("  ❌ Found unexpected mutation policies!");
      results.rlsPolicyState = 'FAIL';
      results.appendOnlyPolicy = 'FAIL';
    } else {
      console.log("  ✅ Only SELECT policy exists. Legacy policies dropped.");
      console.log("  ✅ Append-only constraint guaranteed by default-deny.");
      results.rlsPolicyState = 'PASS';
      results.appendOnlyPolicy = 'PASS';
    }
  } else {
    console.log("  ⚠️ Diagnostic unavailable. Requires direct DB connection.");
    results.rlsPolicyState = 'NOT VERIFIED';
    results.appendOnlyPolicy = 'NOT VERIFIED';
  }

  // ==========================================
  // [8] SECURITY DEFINER
  // ==========================================
  console.log("\n--- [8] SECURITY DEFINER ---");
  if (hasDirectDb) {
    const functions = [
      'handle_client_activity',
      'handle_project_activity',
      'handle_task_activity',
      'handle_client_note_activity',
      'handle_membership_activity'
    ];
    let allSecDef = true;

    for (const fn of functions) {
      const res = await pgClient.query(`
        SELECT prosecdef, proconfig 
        FROM pg_proc 
        WHERE proname = $1
      `, [fn]);
      
      if (res.rowCount === 0) {
        console.log(`  ❌ Missing function: ${fn}`);
        allSecDef = false;
      } else {
        const p = res.rows[0];
        const isSecDef = p.prosecdef === true;
        const hasSearchPath = p.proconfig && p.proconfig.some((c: string) => c.startsWith('search_path='));
        if (isSecDef && hasSearchPath) {
          console.log(`  ✅ ${fn} (SECURITY DEFINER, search_path hardened)`);
        } else {
          console.log(`  ❌ ${fn} (SecDef: ${isSecDef}, SearchPath: ${hasSearchPath})`);
          allSecDef = false;
        }
      }
    }
    results.securityDefiner = allSecDef ? 'PASS' : 'FAIL';
  } else {
    console.log("  ⚠️ Diagnostic unavailable. Requires direct DB connection.");
    results.securityDefiner = 'NOT VERIFIED';
  }

  // ==========================================
  // Data Fetching for [3], [4], [5], [6]
  // ==========================================
  let allActivities = [];
  let page = 0;
  const pageSize = 1000;
  let fetchMore = true;

  while (fetchMore) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Failed to fetch activities:", error.message);
      process.exit(1);
    }
    if (data.length < pageSize) {
      fetchMore = false;
    }
    allActivities.push(...data);
    page++;
  }

  console.log(`\nFetched ${allActivities.length} activities created since cutoff.`);

  // ==========================================
  // [3] Metadata Integrity
  // ==========================================
  console.log("\n--- [3] Metadata Integrity ---");
  let metadataPass = true;
  for (const activity of allActivities) {
    const meta = activity.metadata || {};
    let missingFields: string[] = [];

    const checkFields = (fields: string[], allowEmpty = false) => {
      for (const f of fields) {
        if (!(f in meta)) {
          missingFields.push(f);
        } else if (!allowEmpty && meta[f] === '') {
          missingFields.push(f + ' (empty)');
        }
      }
    };

    switch (activity.action) {
      case 'client.created':
      case 'client.deleted':
        checkFields(['name']); break;
      case 'project.created':
      case 'project.deleted':
        checkFields(['name', 'client_id']); break;
      case 'project.status_changed':
        checkFields(['name', 'client_id', 'previous_status', 'new_status']); break;
      case 'task.created':
      case 'task.deleted':
        checkFields(['title', 'project_id', 'client_id']); break;
      case 'task.status_changed':
        checkFields(['title', 'project_id', 'client_id', 'previous_status', 'new_status']); break;
      case 'note.created':
        checkFields(['client_id']); break;
      case 'note.deleted':
        checkFields(['client_id', 'content_preview']); break;
      case 'member.added':
      case 'member.removed':
        checkFields(['member_id', 'member_name', 'member_email']); break;
    }

    if (missingFields.length > 0) {
      metadataPass = false;
      console.log(`  ❌ MALFORMED: ID ${activity.id} | Action: ${activity.action} | Missing: ${missingFields.join(', ')}`);
    }
  }
  if (metadataPass) {
    console.log("  ✅ All metadata conforms to the canonical contract.");
  }
  results.metadataIntegrity = metadataPass ? 'PASS' : 'FAIL';

  // ==========================================
  // [4] Workspace Attribution
  // ==========================================
  console.log("\n--- [4] Workspace Attribution ---");
  let workspacePass = true;
  const workspaces = new Set<string>();

  for (const activity of allActivities) {
    if (!activity.workspace_id) {
      workspacePass = false;
      console.log(`  ❌ NULL workspace_id on activity: ${activity.id}`);
    } else {
      workspaces.add(activity.workspace_id);
    }
  }

  if (workspacePass) {
    console.log(`  ✅ All activities have workspace_id. Found ${workspaces.size} distinct workspaces.`);
  }
  results.workspaceAttribution = workspacePass ? 'PASS' : 'FAIL';

  // ==========================================
  // [5] Actor Attribution
  // ==========================================
  console.log("\n--- [5] Actor Attribution ---");
  let actorPass = true;
  for (const activity of allActivities) {
    if (!activity.actor_id) {
      actorPass = false;
      console.log(`  ❌ NULL actor_id on activity: ${activity.id}`);
    }
    // We cannot reliably verify if the actor_id matches the authenticated actor historical identity 
    // unless it is member.added, where it's allowed to be the inviter.
    // The strict trigger rules ensure this.
  }
  if (actorPass) {
    console.log("  ✅ All activities have non-null actor_id.");
  }
  results.actorAttribution = actorPass ? 'PASS' : 'FAIL';

  // ==========================================
  // [6] Duplicate Detection
  // ==========================================
  console.log("\n--- [6] Duplicate Detection ---");
  const signatureMap = new Map<string, number>();
  let duplicatePass = true;

  for (const activity of allActivities) {
    // Round to nearest second to catch exact operation duplicates
    const timestampSec = Math.floor(new Date(activity.created_at).getTime() / 1000);
    const signature = `${activity.workspace_id}:${activity.entity_type}:${activity.entity_id}:${activity.action}:${timestampSec}`;
    
    const count = signatureMap.get(signature) || 0;
    if (count > 0) {
      duplicatePass = false;
      console.log(`  ❌ SUSPICIOUS DUPLICATE: Action '${activity.action}' on entity '${activity.entity_id}' at ${activity.created_at}`);
    }
    signatureMap.set(signature, count + 1);
  }

  if (duplicatePass) {
    console.log("  ✅ No suspicious duplicate events detected.");
  }
  results.duplicateDetection = duplicatePass ? 'PASS' : 'FAIL';

  // Cleanup
  if (pgClient) {
    await pgClient.end();
  }

  console.log("\n==================================================");
  console.log("FINAL RESULT");
  console.log("==================================================");
  
  let finalPass = true;
  for (const [key, status] of Object.entries(results)) {
    console.log(`[${Object.keys(results).indexOf(key) + 1}] ${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`);
    console.log(`    ${status}`);
    if (status !== 'PASS') {
      finalPass = false;
    }
  }

  console.log("\nOVERALL STATUS:", finalPass ? "✅ PASS" : "❌ FAIL");
  
  if (!finalPass) {
    process.exit(1);
  }
}

runDiagnostic().catch(err => {
  console.error("Diagnostic script failed:", err);
  process.exit(1);
});
