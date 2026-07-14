/**
 * PTDMS Audit Logs Google Apps Script endpoint.
 *
 * Script Properties required:
 * - SPREADSHEET_ID: Google Sheet id for audit log rows
 * - AUDIT_LOG_EXPORT_SECRET: same value as Supabase Function secret AUDIT_LOG_EXPORT_SECRET
 * - DEFAULT_NOTIFY_EMAILS: optional comma-separated notification emails
 * - AUDIT_LOG_ARCHIVE_FOLDER_ID: optional override for Google Drive archive folder id
 *
 * Default archive folder:
 * 1jPXYXmj-Ey7abo9X9YypUJivS6eWeslm
 */
const SCRIPT_PROPS = PropertiesService.getScriptProperties();
const DEFAULT_AUDIT_LOG_ARCHIVE_FOLDER_ID = '1jPXYXmj-Ey7abo9X9YypUJivS6eWeslm';

const HEADERS = [
  'export_batch_id',
  'exported_to_sheet_at',
  'bangkok_date',
  'id',
  'created_at',
  'created_at_th',
  'actor_user_id',
  'actor_email',
  'actor_name',
  'actor_role',
  'module',
  'action',
  'route',
  'target_type',
  'target_id',
  'status',
  'error_message',
  'ip_address',
  'user_agent',
  'request_id',
  'session_id',
  'retry_count',
  'metadata',
  'before_data',
  'after_data'
];

function setupAuditLogSheets() {
  const ss = getAuditSpreadsheet_();
  const spreadsheetId = ss.getId();
  const bangkokDate = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const sheetName = getMonthlySheetName_(bangkokDate);
  const sheet = getOrCreateSheet_(ss, sheetName);

  return {
    ok: true,
    spreadsheet_id: spreadsheetId,
    sheet_name: sheetName,
    header_columns: HEADERS.length,
    last_row: sheet.getLastRow()
  };
}

function manualAppendSampleAuditLog() {
  const ss = getAuditSpreadsheet_();
  const spreadsheetId = ss.getId();
  const bangkokDate = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const sheetName = getMonthlySheetName_(bangkokDate);
  const sheet = getOrCreateSheet_(ss, sheetName);
  const now = new Date().toISOString();
  const payload = {
    batch_id: 'manual-' + Utilities.getUuid(),
    bangkok_date: bangkokDate,
    started_at: now,
    completed_at: now,
    total_logs: 1,
    module_summary: { manual: 1 },
    action_summary: { manual_sample_log: 1 }
  };
  const sampleLog = {
    id: 'manual-' + Utilities.getUuid(),
    created_at: now,
    actor_user_id: 'manual-user',
    actor_email: Session.getActiveUser().getEmail() || 'manual@example.com',
    actor_name: 'Manual Test',
    actor_role: 'admin',
    module: 'manual',
    action: 'manual_sample_log',
    route: '/manual-test',
    target_type: 'google_sheet',
    target_id: sheetName,
    status: 'success',
    error_message: '',
    ip_address: '',
    user_agent: 'Google Apps Script manual run',
    request_id: '',
    session_id: '',
    retry_count: 0,
    metadata: { source: 'manualAppendSampleAuditLog' },
    before_data: null,
    after_data: { sheet_name: sheetName }
  };

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, HEADERS.length)
    .setValues([toSheetRow_(payload, sampleLog, now)]);

  return {
    ok: true,
    sheet_name: sheetName,
    inserted_rows: 1,
    batch_id: payload.batch_id
  };
}

function manualSendSuccessEmailTest() {
  const bangkokDate = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const payload = {
    batch_id: 'manual-email-' + Utilities.getUuid(),
    bangkok_date: bangkokDate,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    total_logs: 0,
    module_summary: { manual: 1 },
    action_summary: { manual_email_test: 1 }
  };

  sendNotification_(payload, getMonthlySheetName_(bangkokDate), 0, true, '', null);

  return {
    ok: true,
    message: 'manual_success_email_sent_if_recipients_are_configured'
  };
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const payload = parsePayload_(e);
    validateSecret_(payload.export_secret);

    const ss = getAuditSpreadsheet_();
    const sheetName = getMonthlySheetName_(payload.bangkok_date);
    const sheet = getOrCreateSheet_(ss, sheetName);

    const logs = Array.isArray(payload.logs) ? payload.logs : [];
    const exportedToSheetAt = new Date().toISOString();
    const rows = logs.map(function(log) {
      return toSheetRow_(payload, log, exportedToSheetAt);
    });

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    }

    const archiveResult = saveAuditArchive_(payload);

    sendNotification_(payload, sheetName, rows.length, true, '', archiveResult);

    return json_({
      ok: true,
      batch_id: payload.batch_id,
      sheet_name: sheetName,
      inserted_rows: rows.length,
      archive_file_id: archiveResult.file_id || '',
      archive_file_url: archiveResult.file_url || '',
      archive_skipped: archiveResult.skipped || false,
      archive_error: archiveResult.error || ''
    });
  } catch (error) {
    try {
      const payload = safeParsePayload_(e);
      sendNotification_(payload, '', 0, false, sanitizeError_(error), null);
    } catch (notifyError) {
      console.error(notifyError);
    }

    return json_({
      ok: false,
      error: sanitizeError_(error)
    }, 500);
  } finally {
    lock.releaseLock();
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('missing_post_body');
  }

  return JSON.parse(e.postData.contents);
}

function safeParsePayload_(e) {
  try {
    return parsePayload_(e);
  } catch (error) {
    return {};
  }
}

function validateSecret_(requestSecret) {
  const expectedSecret = getRequiredProp_('AUDIT_LOG_EXPORT_SECRET');
  if (!requestSecret || requestSecret !== expectedSecret) {
    throw new Error('unauthorized');
  }
}

function getRequiredProp_(key) {
  const value = SCRIPT_PROPS.getProperty(key);
  if (!value) {
    throw new Error('missing_script_property_' + key);
  }
  return value;
}

function getAuditSpreadsheet_() {
  const spreadsheetId = SCRIPT_PROPS.getProperty('SPREADSHEET_ID');
  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (activeSpreadsheet) {
    return activeSpreadsheet;
  }

  throw new Error('missing_script_property_SPREADSHEET_ID');
}

function getMonthlySheetName_(bangkokDate) {
  const dateText = bangkokDate || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const parts = dateText.split('-');
  return 'audit_logs_' + parts[0] + '_' + parts[1];
}

function getOrCreateSheet_(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  ensureHeader_(sheet);
  return sheet;
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, HEADERS.length);
    return;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const isSame = HEADERS.every(function(header, index) {
    return currentHeaders[index] === header;
  });

  if (!isSame) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function toSheetRow_(payload, log, exportedToSheetAt) {
  return [
    payload.batch_id || '',
    exportedToSheetAt,
    payload.bangkok_date || '',
    log.id || '',
    log.created_at || '',
    toBangkokDateTime_(log.created_at),
    log.actor_user_id || '',
    log.actor_email || '',
    log.actor_name || '',
    log.actor_role || '',
    log.module || '',
    log.action || '',
    log.route || '',
    log.target_type || '',
    log.target_id || '',
    log.status || '',
    log.error_message || '',
    log.ip_address || '',
    log.user_agent || '',
    log.request_id || '',
    log.session_id || '',
    log.retry_count || 0,
    stringifyJson_(log.metadata),
    stringifyJson_(log.before_data),
    stringifyJson_(log.after_data)
  ];
}

function saveAuditArchive_(payload) {
  const folderId = SCRIPT_PROPS.getProperty('AUDIT_LOG_ARCHIVE_FOLDER_ID') || DEFAULT_AUDIT_LOG_ARCHIVE_FOLDER_ID;
  if (!folderId) {
    return { skipped: true };
  }

  const archive = payload.archive || {};
  if (!archive.content) {
    return { skipped: true, error: 'missing_archive_content' };
  }

  try {
    const folder = DriveApp.getFolderById(folderId);
    const fileName = sanitizeFileName_(archive.file_name || ('audit-logs-' + (payload.batch_id || Utilities.getUuid()) + '.json'));
    const blob = Utilities.newBlob(archive.content, archive.mime_type || MimeType.PLAIN_TEXT, fileName);
    const file = folder.createFile(blob);
    file.setDescription('PTDMS Audit Logs archive batch ' + (payload.batch_id || '') + ' sha256=' + (archive.sha256 || ''));

    return {
      skipped: false,
      file_id: file.getId(),
      file_url: file.getUrl(),
      sha256: archive.sha256 || ''
    };
  } catch (error) {
    return { skipped: false, error: sanitizeError_(error) };
  }
}

function sanitizeFileName_(value) {
  return String(value).replace(/[\\/:*?"<>|#%{}~&]/g, '_').slice(0, 180);
}

function toBangkokDateTime_(isoText) {
  if (!isoText) {
    return '';
  }

  return Utilities.formatDate(new Date(isoText), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
}

function stringifyJson_(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function sendNotification_(payload, sheetName, insertedRows, success, errorMessage, archiveResult) {
  const recipients = getNotifyEmails_(payload);
  if (recipients.length === 0) {
    return;
  }

  const bangkokDate = payload.bangkok_date || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const subject = success
    ? 'PTDMS Audit Logs Export สำเร็จ - ' + bangkokDate
    : 'PTDMS Audit Logs Export ไม่สำเร็จ - ' + bangkokDate;

  const body = success
    ? buildSuccessEmail_(payload, sheetName, insertedRows, archiveResult)
    : buildFailureEmail_(payload, errorMessage);

  MailApp.sendEmail({
    to: recipients.join(','),
    subject: subject,
    body: body
  });
}

function getNotifyEmails_(payload) {
  const fromPayload = Array.isArray(payload.notify_emails) ? payload.notify_emails : [];
  const fromProps = (SCRIPT_PROPS.getProperty('DEFAULT_NOTIFY_EMAILS') || '')
    .split(',')
    .map(function(email) { return email.trim(); })
    .filter(Boolean);

  const emails = fromPayload.length > 0 ? fromPayload : fromProps;
  return Array.from(new Set(emails));
}

function buildSuccessEmail_(payload, sheetName, insertedRows, archiveResult) {
  const archiveLines = archiveResult && archiveResult.file_url
    ? ['', 'Archive JSON:', archiveResult.file_url, 'SHA-256: ' + (archiveResult.sha256 || '')]
    : [];
  return [
    'PTDMS Audit Logs Export สำเร็จ',
    '',
    'วันที่ log: ' + (payload.bangkok_date || ''),
    'Batch ID: ' + (payload.batch_id || ''),
    'Sheet: ' + sheetName,
    'จำนวน log ที่รับมา: ' + (payload.total_logs || 0),
    'จำนวนแถวที่บันทึก: ' + insertedRows,
    'Started at: ' + (payload.started_at || ''),
    'Completed at: ' + (payload.completed_at || ''),
    '',
    'Module summary:',
    JSON.stringify(payload.module_summary || {}, null, 2),
    '',
    'Action summary:',
    JSON.stringify(payload.action_summary || {}, null, 2)
  ].concat(archiveLines).join('\n');
}

function buildFailureEmail_(payload, errorMessage) {
  return [
    'PTDMS Audit Logs Export ไม่สำเร็จ',
    '',
    'วันที่ log: ' + (payload.bangkok_date || ''),
    'Batch ID: ' + (payload.batch_id || ''),
    'Error: ' + (errorMessage || 'unknown_error'),
    '',
    'กรุณาตรวจสอบ Google Apps Script, Script Properties และ Supabase Edge Function'
  ].join('\n');
}

function sanitizeError_(error) {
  const message = error && error.message ? error.message : String(error);
  return message.replace(/token|secret|password|apikey|api_key/gi, '[redacted]').slice(0, 500);
}

function json_(body, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}