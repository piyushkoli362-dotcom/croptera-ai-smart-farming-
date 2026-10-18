// Paste into Apps Script opened from the private response spreadsheet.
// Set the SHEET_WRITE_SECRET script property before deploying this web app.
const SHEETS = {
  farmers: {
    name: 'Pre-Registrations',
    fields: ['id', 'submittedAt', 'name', 'email', 'state', 'district', 'category', 'consent'],
    headers: ['Submission ID', 'Submitted At (UTC)', 'Full Name', 'Email', 'State', 'District', 'User Category', 'Consent']
  },
  partners: {
    name: 'Enquiries',
    fields: ['id', 'submittedAt', 'name', 'email', 'organization', 'area', 'message', 'consent'],
    headers: ['Submission ID', 'Submitted At (UTC)', 'Name', 'Work Email', 'Organization', 'Collaboration Area', 'Message', 'Consent']
  },
  talent: {
    name: 'Talent Interest',
    fields: ['id', 'submittedAt', 'name', 'email', 'role', 'skills', 'linkedin', 'portfolio', 'resume', 'motivation', 'availability', 'engagement', 'consent'],
    headers: ['Submission ID', 'Submitted At (UTC)', 'Full Name', 'Email', 'Interest Area', 'Skills / Experience', 'LinkedIn URL', 'Portfolio URL', 'Resume URL', 'Motivation', 'Availability', 'Engagement Type', 'Consent']
  }
};

function safeCell(value) {
  const text = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function reply(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function setupSheets() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(type => {
    const definition = SHEETS[type];
    let sheet = book.getSheetByName(definition.name);
    if (!sheet) sheet = book.insertSheet(definition.name);
    sheet.getRange(1, 1, 1, definition.headers.length).setValues([definition.headers]);
    sheet.getRange(1, 1, 1, definition.headers.length).setBackground('#166534').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
}

function doPost(e) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHEET_WRITE_SECRET');
  if (!expected) return reply({ saved: false, error: 'Storage is not configured.' });
  let payload;
  try { payload = JSON.parse(e.postData.contents); }
  catch (_) { return reply({ saved: false, error: 'Invalid JSON.' }); }
  if (payload.secret !== expected) return reply({ saved: false, error: 'Unauthorized.' });
  const record = payload.record;
  const definition = record && SHEETS[record.type];
  if (!definition || !record.id || !record.submittedAt || !record.name || !record.email || record.consent !== true) return reply({ saved: false, error: 'Invalid record.' });
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(definition.name);
    if (!sheet) return reply({ saved: false, error: 'Run setupSheets first.' });
    const row = definition.fields.map(field => safeCell(field === 'consent' ? 'Yes' : record[field]));
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return reply({ saved: true, id: record.id });
  } catch (_) {
    return reply({ saved: false, error: 'Could not save entry.' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
