import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const id = process.argv[2];
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')) {
  throw new Error('Pass the exact submission ID to remove.');
}
const dataDir = path.resolve(process.env.CROPTERA_DATA_DIR || path.join(process.cwd(), 'outputs', '01a14bb4-619f-7b02-956a-0d044f0b2e4b'));
const file = path.join(dataDir, 'submissions.jsonl');
const records = (await fs.readFile(file, 'utf8')).split('\n').filter(Boolean).map(JSON.parse);
const filtered = records.filter(record => record.id !== id);
if (filtered.length === records.length) throw new Error('Submission ID not found.');
const temp = path.join(dataDir, `submissions.${process.pid}.tmp`);
await fs.writeFile(temp, filtered.map(record => JSON.stringify(record)).join('\n') + (filtered.length ? '\n' : ''), { encoding: 'utf8', mode: 0o600 });
await fs.rename(temp, file);
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(process.cwd(), 'scripts', 'export-submissions.mjs')], { cwd: process.cwd(), env: { ...process.env, CROPTERA_DATA_DIR: dataDir }, windowsHide: true, stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Excel export exited ${code}`)));
});
console.log(`Removed submission ${id} from the private record store and workbook.`);
