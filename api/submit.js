const { randomUUID } = require('node:crypto');

const clean = (value, max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const emailOkay = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
const urlOkay = value => {
  if (!value) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Invalid submission.' };
  if (!['farmers', 'partners', 'talent'].includes(body.type)) return { error: 'Unknown form type.' };
  if (clean(body.website)) return { error: 'Submission rejected.' };
  const name = clean(body.name, 120);
  const email = clean(body.email, 254).toLowerCase();
  if (!name || !emailOkay(email) || body.consent !== true) return { error: 'Name, valid email and consent are required.' };
  const record = { id: randomUUID(), submittedAt: new Date().toISOString(), type: body.type, name, email, consent: true };
  if (body.type === 'farmers') Object.assign(record, { state: clean(body.state, 80), district: clean(body.district, 80), category: clean(body.category, 80) });
  if (body.type === 'partners') {
    const area = clean(body.area, 120), message = clean(body.message, 3000);
    if (!area || !message) return { error: 'Collaboration area and message are required.' };
    Object.assign(record, { organization: clean(body.organization, 160), area, message });
  }
  if (body.type === 'talent') {
    const role = clean(body.role, 120), motivation = clean(body.motivation, 3000);
    const linkedin = clean(body.linkedin, 500), portfolio = clean(body.portfolio, 500), resume = clean(body.resume, 500);
    if (!role || !motivation || ![linkedin, portfolio, resume].every(urlOkay)) return { error: 'Interest area, motivation and valid HTTPS links are required.' };
    Object.assign(record, { role, motivation, skills: clean(body.skills, 3000), linkedin, portfolio, resume, availability: clean(body.availability, 200), engagement: clean(body.engagement, 100) });
  }
  return { record };
}

module.exports = async function submit(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host || origin !== `https://${host}`) return res.status(403).json({ error: 'Origin rejected.' });
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return res.status(415).json({ error: 'JSON is required.' });
  if (Number(req.headers['content-length'] || 0) > 16_384 || JSON.stringify(req.body || '').length > 16_384) return res.status(413).json({ error: 'Submission is too large.' });
  const { record, error } = validate(req.body);
  if (error) return res.status(400).json({ error });
  const url = process.env.GOOGLE_SHEETS_WEB_APP_URL;
  const secret = process.env.GOOGLE_SHEETS_SECRET;
  if (!url?.startsWith('https://script.google.com/macros/s/') || !url.endsWith('/exec') || !secret) return res.status(503).json({ error: 'Online submissions are not connected yet.' });
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret, record }),
      signal: AbortSignal.timeout(15000)
    });
    const result = await upstream.json();
    if (!upstream.ok || result.saved !== true || result.id !== record.id) throw new Error('Sheet did not confirm save.');
    return res.status(201).json({ saved: true, id: record.id });
  } catch (error) {
    console.error('Google Sheet submission failed:', error.message);
    return res.status(503).json({ error: 'Could not confirm storage. Please try again later.' });
  }
};
