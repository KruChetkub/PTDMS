import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-backup-restore-cron-secret',
  'Access-Control-Max-Age': '86400',
};

const backupTables = [
  'profiles',
  'departments',
  'course_categories',
  'training_records',
  'certificates',
  'development_analysis',
  'login_history',
  'audit_logs',
  'system_settings',
  'site_content_documents',
  'site_content_history',
  'portal_user_manuals',
  'strategy_events',
  'meeting_room_reservations',
  'it_assets',
  'it_asset_evaluation_settings',
  'spd_service_categories',
  'spd_service_request_subjects',
  'spd_service_tickets',
  'spd_service_ticket_timeline',
  'spd_service_satisfaction_surveys',
  'spd_service_notification_settings',
  'spd_assistant_sources',
  'spd_assistant_knowledge',
  'spd_assistant_page_contexts',
  'spd_assistant_conversations',
  'spd_assistant_messages',
  'spd_assistant_feedback',
  'public_visit_sessions',
  'public_page_views',
] as const;

type BackupTableName = typeof backupTables[number];

type Caller = {
  type: 'manual' | 'scheduler';
  userId: string | null;
  email: string | null;
  name: string | null;
  role: string | null;
};

type BackupPayload = {
  schema_version: 1;
  app: 'PTDMS';
  backup_id: string;
  created_at: string;
  created_by: Caller;
  tables: Record<string, unknown[]>;
  storage_manifest: Array<Record<string, unknown>>;
  summary: {
    table_count: number;
    row_count: number;
    storage_object_count: number;
  };
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getBearerToken(req: Request) {
  const authorization = req.headers.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

async function authorizeBackupRequest(req: Request, adminClient: ReturnType<typeof createClient>) {
  const cronSecret = Deno.env.get('BACKUP_RESTORE_CRON_SECRET');
  const requestSecret = req.headers.get('x-backup-restore-cron-secret') || '';

  if (cronSecret && requestSecret === cronSecret) {
    return {
      authorized: true,
      caller: {
        type: 'scheduler',
        userId: null,
        email: null,
        name: 'Google Apps Script Daily Backup',
        role: 'scheduler',
      } as Caller,
    };
  }

  const token = getBearerToken(req);
  if (!token) {
    return { authorized: false, status: 401, reason: 'missing_authorization' };
  }

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    return { authorized: false, status: 401, reason: 'invalid_authorization' };
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('user_id, full_name, role, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    return { authorized: false, status: 500, reason: profileError.message };
  }

  if (profile?.role !== 'super_admin' || profile?.status !== 'active') {
    return { authorized: false, status: 403, reason: 'super_admin_required' };
  }

  return {
    authorized: true,
    caller: {
      type: 'manual',
      userId: user.id,
      email: user.email ?? null,
      name: profile.full_name ?? null,
      role: profile.role ?? null,
    } as Caller,
  };
}

function pickTables(input: unknown): BackupTableName[] {
  if (!Array.isArray(input) || input.length === 0) {
    return [...backupTables];
  }

  const allowed = new Set<string>(backupTables);
  const selected = input.filter((table): table is BackupTableName => typeof table === 'string' && allowed.has(table));
  return selected.length > 0 ? selected : [...backupTables];
}`r`n`r`nasync function exportTables(adminClient: ReturnType<typeof createClient>, tables: BackupTableName[]) {
  const result: Record<string, unknown[]> = {};
  let rowCount = 0;

  for (const table of tables) {
    const rows: unknown[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await adminClient
        .from(table)
        .select('*')
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(`table_export_failed:${table}:${error.message}`);
      }

      const batch = Array.isArray(data) ? data : [];
      rows.push(...batch);
      rowCount += batch.length;

      if (batch.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    result[table] = rows;
  }

  return { tables: result, rowCount };
}

async function listStorageObjects(adminClient: ReturnType<typeof createClient>) {
  const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets();
  if (bucketsError) {
    console.error('backup storage list buckets failed', bucketsError);
    return [];
  }

  const objects: Array<Record<string, unknown>> = [];

  async function walk(bucketName: string, prefix = '') {
    const { data, error } = await adminClient.storage.from(bucketName).list(prefix, {
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.error('backup storage list failed', { bucketName, prefix, error: error.message });
      return;
    }

    for (const item of data || []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      const isFolder = !item.id && !item.metadata;

      if (isFolder) {
        await walk(bucketName, path);
        continue;
      }

      const signed = await adminClient.storage.from(bucketName).createSignedUrl(path, 60 * 60).catch(() => ({ data: null, error: null }));
      objects.push({
        bucket: bucketName,
        path,
        name: item.name,
        id: item.id ?? null,
        updated_at: item.updated_at ?? null,
        created_at: item.created_at ?? null,
        metadata: item.metadata ?? null,
        signed_url: signed.data?.signedUrl ?? null,
      });
    }
  }

  for (const bucket of buckets || []) {
    await walk(bucket.name);
  }

  return objects;
}

async function sendBackupToAppsScript(backup: BackupPayload) {
  const appsScriptUrl = Deno.env.get('BACKUP_RESTORE_APPS_SCRIPT_URL');
  const backupSecret = Deno.env.get('BACKUP_RESTORE_SECRET');

  if (!appsScriptUrl || !backupSecret) {
    return { ok: false, skipped: true, reason: 'missing_backup_restore_env' };
  }

  const response = await fetch(appsScriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Backup-Restore-Secret': backupSecret,
    },
    body: JSON.stringify({
      event: 'ptdms_backup_created',
      export_secret: backupSecret,
      backup,
    }),
  });

  const responseText = await response.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  if (!response.ok || parsed?.ok === false) {
    return {
      ok: false,
      skipped: false,
      reason: String(parsed?.error || responseText || response.statusText).slice(0, 500),
      status: response.status,
    };
  }

  return {
    ok: true,
    skipped: false,
    result: parsed || { message: responseText },
  };
}

async function recordBackupAudit(
  adminClient: ReturnType<typeof createClient>,
  caller: Caller,
  action: string,
  status: 'success' | 'fail',
  metadata: Record<string, unknown>,
) {
  await adminClient.from('audit_logs').insert({
    actor_id: caller.userId,
    actor_user_id: caller.userId,
    actor_email: caller.email,
    actor_name: caller.name,
    actor_role: caller.role,
    module: 'backup_restore',
    action,
    route: '/admin/security',
    target_type: 'backup_restore',
    status,
    metadata,
    export_status: 'pending',
  }).then(() => null, () => null);
}function parseBackupPayload(input: unknown): BackupPayload | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const value = input as Record<string, unknown>;
  if (value.app !== 'PTDMS' || value.schema_version !== 1 || !value.tables || typeof value.tables !== 'object') {
    return null;
  }

  return value as BackupPayload;
}

async function restoreTables(adminClient: ReturnType<typeof createClient>, backup: BackupPayload) {
  const restored: Record<string, number> = {};
  const errors: Array<{ table: string; error: string }> = [];

  for (const table of backupTables) {
    const rows = backup.tables[table];
    if (!Array.isArray(rows) || rows.length === 0) {
      continue;
    }

    const chunkSize = 250;
    let restoredRows = 0;

    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize) as Record<string, unknown>[];
      const { error } = await adminClient.from(table).upsert(chunk);

      if (error) {
        errors.push({ table, error: error.message });
        break;
      }

      restoredRows += chunk.length;
    }

    if (restoredRows > 0) {
      restored[table] = restoredRows;
    }
  }

  return { restored, errors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, reason: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, reason: 'missing_supabase_env' }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const authResult = await authorizeBackupRequest(req, adminClient);
  if (!authResult.authorized) {
    return jsonResponse({ ok: false, reason: authResult.reason }, authResult.status);
  }

  const caller = authResult.caller;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const action = typeof body.action === 'string' ? body.action : '';

  try {
    if (action === 'create_backup') {
      const selectedTables = pickTables(body.tables);
      const backupId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const exported = await exportTables(adminClient, selectedTables);
      const storageManifest = body.includeStorage === false ? [] : await listStorageObjects(adminClient);
      const backup: BackupPayload = {
        schema_version: 1,
        app: 'PTDMS',
        backup_id: backupId,
        created_at: createdAt,
        created_by: caller,
        tables: exported.tables,
        storage_manifest: storageManifest,
        summary: {
          table_count: selectedTables.length,
          row_count: exported.rowCount,
          storage_object_count: storageManifest.length,
        },
      };

      const appsScript = await sendBackupToAppsScript(backup);
      await recordBackupAudit(adminClient, caller, 'backup_created', appsScript.ok ? 'success' : 'fail', {
        backup_id: backupId,
        table_count: backup.summary.table_count,
        row_count: backup.summary.row_count,
        storage_object_count: backup.summary.storage_object_count,
        apps_script: appsScript,
      });

      return jsonResponse({
        ok: true,
        backup_id: backupId,
        created_at: createdAt,
        summary: backup.summary,
        apps_script: appsScript,
        backup,
      });
    }

    if (action === 'restore_backup') {
      if (caller.type === 'scheduler') {
        return jsonResponse({ ok: false, reason: 'scheduler_restore_not_allowed' }, 403);
      }
      const backup = parseBackupPayload(body.backup);
      if (!backup) {
        return jsonResponse({ ok: false, reason: 'invalid_backup_payload' }, 400);
      }

      const result = await restoreTables(adminClient, backup);
      await recordBackupAudit(adminClient, caller, 'backup_restored', result.errors.length === 0 ? 'success' : 'fail', {
        backup_id: backup.backup_id,
        restored: result.restored,
        errors: result.errors,
      });

      return jsonResponse({
        ok: result.errors.length === 0,
        backup_id: backup.backup_id,
        restored: result.restored,
        errors: result.errors,
      }, result.errors.length === 0 ? 200 : 207);
    }

    return jsonResponse({ ok: false, reason: 'unknown_action' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    console.error('backup-restore-data failed', { action, message });
    await recordBackupAudit(adminClient, caller, action || 'unknown', 'fail', { error: message });
    return jsonResponse({ ok: false, reason: message }, 500);
  }
});