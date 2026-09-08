/**
 * Live security contract: every protected Edge Function must reject a request
 * that has an API key but no Authorization bearer token.
 *
 * Run against the intended Supabase project:
 *   npm run test:edge:no-token
 *
 * The login-attempt function intentionally accepts failed-login reports
 * without a token. Its protected success=true path is tested here instead.
 */

const supabaseUrl = (
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
).replace(/\/+$/, '');
const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !anonKey) {
  throw new Error(
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or their non-VITE equivalents) before running this test.',
  );
}

const protectedRequests = [
  {
    functionName: 'backup-restore-data',
    body: { action: 'create_backup' },
  },
  {
    functionName: 'export-audit-logs',
    body: {},
  },
  {
    functionName: 'update-user-email',
    body: {
      userId: '00000000-0000-4000-8000-000000000000',
      email: 'security-test.invalid@example.com',
    },
  },
  {
    functionName: 'meeting-room-telegram-notify',
    body: {
      event: 'reservation_created',
      reservationId: '00000000-0000-4000-8000-000000000000',
    },
  },
  {
    functionName: 'spd-service-telegram-notify',
    body: {
      event: 'ticket_created',
      ticketId: '00000000-0000-4000-8000-000000000000',
    },
  },
  {
    functionName: 'record-audit-log',
    body: { module: 'security_test', action: 'missing_token' },
  },
  {
    functionName: 'record-login-attempt',
    body: {
      email: 'security-test.invalid@example.com',
      success: true,
    },
  },
];

let failures = 0;

for (const { functionName, body } of protectedRequests) {
  let response;

  try {
    response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${functionName}: request failed (${error.name})`);
    continue;
  }

  if (response.status !== 401) {
    failures += 1;
    console.error(
      `FAIL ${functionName}: expected HTTP 401, received HTTP ${response.status}`,
    );
    continue;
  }

  console.log(`PASS ${functionName}: HTTP 401`);
}

if (failures > 0) {
  throw new Error(`${failures} protected Edge Function request(s) did not return HTTP 401.`);
}

console.log(
  `PASS: all ${protectedRequests.length} protected Edge Function paths reject requests without a token.`,
);
