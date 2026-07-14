/**
 * PTDMS Backup / Restore Google Apps Script endpoint.
 *
 * Script Properties required:
 * - BACKUP_RESTORE_SECRET: same value as Supabase Function secret BACKUP_RESTORE_SECRET
 * - SUPABASE_BACKUP_FUNCTION_URL: https://PROJECT_REF.supabase.co/functions/v1/backup-restore-data
 * - BACKUP_RESTORE_CRON_SECRET: same value as Supabase Function secret BACKUP_RESTORE_CRON_SECRET
 * - BACKUP_NOTIFY_EMAILS: comma-separated email list for daily backup notifications
 *
 * Backup files are stored in this Google Drive folder by default:
 * 1fNgrPIJTgtGN3jcBlWAwofMQzf_Ii8eg
 */
const BACKUP_DRIVE_FOLDER_ID = '1fNgrPIJTgtGN3jcBlWAwofMQzf_Ii8eg';
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const secret = PropertiesService.getScriptProperties().getProperty('BACKUP_RESTORE_SECRET');
    const folderId = BACKUP_DRIVE_FOLDER_ID;

    if (!secret) {
      return jsonResponse({ ok: false, error: 'missing_script_properties' }, 500);
    }

    if (payload.export_secret !== secret) {
      return jsonResponse({ ok: false, error: 'invalid_secret' }, 403);
    }

    if (payload.event !== 'ptdms_backup_created' || !payload.backup) {
      return jsonResponse({ ok: false, error: 'invalid_payload' }, 400);
    }

    const backup = payload.backup;
    const backupId = String(backup.backup_id || Utilities.getUuid());
    const createdAt = String(backup.created_at || new Date().toISOString());
    const rootFolder = DriveApp.getFolderById(folderId);
    const backupFolder = rootFolder.createFolder('PTDMS-' + backupId + '-' + createdAt.replace(/[:.]/g, '-'));

    const backupJson = JSON.stringify(backup, null, 2);
    const backupFile = backupFolder.createFile('backup.json', backupJson, MimeType.PLAIN_TEXT);

    const storageRootFolder = backupFolder.createFolder('storage-files');
    const storageManifest = Array.isArray(backup.storage_manifest) ? backup.storage_manifest : [];
    let savedStorageFiles = 0;
    const storageErrors = [];
    const savedStorageManifest = [];

    storageManifest.forEach(function(item) {
      const result = saveStorageObject_(storageRootFolder, item);
      savedStorageManifest.push(result);

      if (result.saved) {
        savedStorageFiles += 1;
      }

      if (result.error) {
        storageErrors.push({
          bucket: result.bucket || '',
          path: result.path || '',
          error: result.error,
        });
      }
    });

    const storageManifestFile = backupFolder.createFile(
      'storage-manifest.json',
      JSON.stringify(savedStorageManifest, null, 2),
      MimeType.PLAIN_TEXT
    );

    return jsonResponse({
      ok: true,
      backup_id: backupId,
      folder_id: backupFolder.getId(),
      folder_url: backupFolder.getUrl(),
      backup_file_id: backupFile.getId(),
      backup_file_url: backupFile.getUrl(),
      storage_manifest_file_id: storageManifestFile.getId(),
      storage_manifest_file_url: storageManifestFile.getUrl(),
      saved_storage_files: savedStorageFiles,
      storage_errors: storageErrors.slice(0, 50),
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) }, 500);
  }
}

function saveStorageObject_(storageRootFolder, item) {
  const bucket = item && item.bucket ? String(item.bucket) : 'bucket';
  const path = item && item.path ? String(item.path) : '';
  const manifest = {
    bucket: bucket,
    path: path,
    original_name: item && item.name ? String(item.name) : '',
    drive_path: '',
    drive_file_id: null,
    drive_file_url: null,
    metadata: item && item.metadata ? item.metadata : null,
    saved: false,
    error: null,
  };

  try {
    if (!item || !item.signed_url) {
      manifest.error = 'missing_signed_url';
      return manifest;
    }

    const response = UrlFetchApp.fetch(String(item.signed_url), { muteHttpExceptions: true });
    if (response.getResponseCode() >= 400) {
      manifest.error = 'http_' + response.getResponseCode();
      return manifest;
    }

    const bucketFolder = getOrCreateFolder_(storageRootFolder, sanitizeDriveName_(bucket));
    const pathParts = path.split('/').filter(Boolean);
    const fileName = sanitizeDriveName_(pathParts.pop() || manifest.original_name || 'file');
    let parentFolder = bucketFolder;

    pathParts.forEach(function(part) {
      parentFolder = getOrCreateFolder_(parentFolder, sanitizeDriveName_(part));
    });

    const file = parentFolder.createFile(response.getBlob().setName(fileName));
    manifest.drive_path = bucket + '/' + path;
    manifest.drive_file_id = file.getId();
    manifest.drive_file_url = file.getUrl();
    manifest.saved = true;
    return manifest;
  } catch (error) {
    manifest.error = String(error);
    return manifest;
  }
}

function getOrCreateFolder_(parentFolder, name) {
  const safeName = sanitizeDriveName_(name);
  const folders = parentFolder.getFoldersByName(safeName);
  return folders.hasNext() ? folders.next() : parentFolder.createFolder(safeName);
}

function sanitizeDriveName_(value) {
  return String(value || 'unnamed').replace(/[\\/:*?"<>|#%{}~&]/g, '_').slice(0, 180);
}

function jsonResponse(value, status) {
  const output = ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
/**
 * Run this from an Apps Script time-driven trigger.
 * It asks Supabase Edge Function to create a backup, then emails the result.
 */
function runDailyBackup() {
  const properties = PropertiesService.getScriptProperties();
  const functionUrl = properties.getProperty('SUPABASE_BACKUP_FUNCTION_URL');
  const cronSecret = properties.getProperty('BACKUP_RESTORE_CRON_SECRET');
  const notifyEmails = getNotifyEmails_();

  if (!functionUrl || !cronSecret) {
    const message = 'Missing SUPABASE_BACKUP_FUNCTION_URL or BACKUP_RESTORE_CRON_SECRET in Script Properties.';
    notifyBackupResult_(notifyEmails, 'PTDMS Backup Failed', message);
    throw new Error(message);
  }

  try {
    const response = UrlFetchApp.fetch(functionUrl, {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      headers: {
        'X-Backup-Restore-Cron-Secret': cronSecret,
      },
      payload: JSON.stringify({
        action: 'create_backup',
        includeStorage: true,
      }),
    });

    const status = response.getResponseCode();
    const text = response.getContentText();
    const result = parseJson_(text);

    if (status >= 400 || !result || result.ok === false) {
      const reason = result && result.reason ? result.reason : text;
      const message = 'Daily backup failed. HTTP ' + status + '\n\n' + reason;
      notifyBackupResult_(notifyEmails, 'PTDMS Backup Failed', message);
      throw new Error(message);
    }

    const summary = result.summary || {};
    const appsScript = result.apps_script || {};
    const folderUrl = appsScript.result && appsScript.result.folder_url ? appsScript.result.folder_url : '-';
    const message = [
      'Daily PTDMS backup completed successfully.',
      '',
      'Backup ID: ' + (result.backup_id || '-'),
      'Tables: ' + (summary.table_count || 0),
      'Rows: ' + (summary.row_count || 0),
      'Storage files: ' + (summary.storage_object_count || 0),
      'Google Drive folder: ' + folderUrl,
    ].join('\n');

    notifyBackupResult_(notifyEmails, 'PTDMS Backup Success', message);
    return result;
  } catch (error) {
    const message = 'Daily backup failed with exception:\n\n' + String(error);
    notifyBackupResult_(notifyEmails, 'PTDMS Backup Failed', message);
    throw error;
  }
}

/**
 * Run once manually to create a daily trigger around 02:00-03:00.
 */
function createDailyBackupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'runDailyBackup') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('runDailyBackup')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
}

function getNotifyEmails_() {
  const value = PropertiesService.getScriptProperties().getProperty('BACKUP_NOTIFY_EMAILS') || '';
  return value.split(',').map(function(email) { return email.trim(); }).filter(Boolean);
}

function notifyBackupResult_(emails, subject, body) {
  if (!emails || emails.length === 0) return;
  MailApp.sendEmail({
    to: emails.join(','),
    subject: subject,
    body: body,
  });
}

function parseJson_(text) {
  try {
    return JSON.parse(text || '{}');
  } catch (error) {
    return null;
  }
}