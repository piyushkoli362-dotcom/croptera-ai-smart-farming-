import fs from 'node:fs/promises';
import path from 'node:path';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const root = process.cwd();
const defaultDir = path.join(root, 'outputs', '01a14bb4-619f-7b02-956a-0d044f0b2e4b');
const dataDir = path.resolve(process.env.CROPTERA_DATA_DIR || defaultDir);
const recordsFile = path.join(dataDir, 'submissions.jsonl');
const workbookFile = path.join(dataDir, 'Croptera_Leads.xlsx');

const definitions = [
  { type: 'farmers', name: 'Pre-Registrations', title: 'Farmer Pre-Registrations', headers: ['Submission ID', 'Submitted At (UTC)', 'Full Name', 'Email', 'State', 'District', 'User Category', 'Consent'], fields: ['id', 'submittedAt', 'name', 'email', 'state', 'district', 'category', 'consent'] },
  { type: 'partners', name: 'Enquiries', title: 'Partnership Enquiries', headers: ['Submission ID', 'Submitted At (UTC)', 'Name', 'Work Email', 'Organization', 'Collaboration Area', 'Message', 'Consent'], fields: ['id', 'submittedAt', 'name', 'email', 'organization', 'area', 'message', 'consent'] },
  { type: 'talent', name: 'Talent Interest', title: 'Talent Expressions of Interest', headers: ['Submission ID', 'Submitted At (UTC)', 'Full Name', 'Email', 'Interest Area', 'Skills / Experience', 'LinkedIn URL', 'Portfolio URL', 'Resume URL', 'Motivation', 'Availability', 'Engagement Type', 'Consent'], fields: ['id', 'submittedAt', 'name', 'email', 'role', 'skills', 'linkedin', 'portfolio', 'resume', 'motivation', 'availability', 'engagement', 'consent'] },
];

function safeCell(value) {
  if (value == null) return '';
  const text = String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

async function readRecords() {
  let contents = '';
  try { contents = await fs.readFile(recordsFile, 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return contents.split('\n').filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch { throw new Error(`Invalid private record on line ${index + 1}`); }
  });
}

const records = await readRecords();
const workbook = Workbook.create();
for (const definition of definitions) {
  const sheet = workbook.worksheets.add(definition.name);
  const lastColumn = String.fromCharCode(64 + definition.headers.length);
  sheet.getRange('A1').values = [[definition.title]];
  sheet.getRange('A2').values = [['Private visitor information — keep this workbook access restricted.']];
  sheet.getRange(`A4:${lastColumn}4`).values = [definition.headers];
  sheet.getRange('A1').format.font = { name: 'Arial', size: 17, bold: true, color: '#166534' };
  sheet.getRange('A2').format.font = { name: 'Arial', size: 10, color: '#667466' };
  sheet.getRange(`A4:${lastColumn}4`).format = { fill: '#166534', font: { name: 'Arial', bold: true, color: '#FFFFFF', size: 10 } };
  sheet.getRange(`A4:${lastColumn}4`).format.rowHeight = 30;
  sheet.getRange(`A1:${lastColumn}1000`).format.verticalAlignment = 'center';
  sheet.getRange(`A1:${lastColumn}1000`).format.wrapText = true;
  sheet.getRange('B5:B1000').format.numberFormat = 'yyyy-mm-dd hh:mm';
  for (let index = 0; index < definition.headers.length; index++) {
    const letter = String.fromCharCode(65 + index);
    const width = /ID|Email|URL|Message|Motivation|Skills/.test(definition.headers[index]) ? 31 : 21;
    sheet.getRange(`${letter}1:${letter}1000`).format.columnWidth = width;
  }
  const rows = records.filter(record => record.type === definition.type).map(record => definition.fields.map(field => safeCell(field === 'consent' ? (record[field] ? 'Yes' : 'No') : record[field])));
  if (rows.length) {
    sheet.getRange(`A5:${lastColumn}${rows.length + 4}`).values = rows;
    sheet.getRange(`A5:${lastColumn}${rows.length + 4}`).format.borders = { preset: 'inside', style: 'thin', color: '#E0EAE0' };
  }
}
workbook.recalculate();
if (process.env.VERIFY_WORKBOOK === '1') {
  for (const definition of definitions) {
    const preview = await workbook.render({ sheetName: definition.name, range: `A1:D6`, scale: 1.5, format: 'png' });
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, `${definition.type}-preview.png`), new Uint8Array(await preview.arrayBuffer()));
  }
  const summary = await workbook.inspect({ kind: 'sheet', include: 'id,name', maxChars: 2000 });
  console.log(summary.ndjson);
}
await fs.mkdir(dataDir, { recursive: true });
const temporaryFile = path.join(dataDir, `Croptera_Leads.${process.pid}.tmp.xlsx`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(temporaryFile);
await fs.rename(temporaryFile, workbookFile);
console.log(`Exported ${records.length} private submission(s) to ${workbookFile}`);
