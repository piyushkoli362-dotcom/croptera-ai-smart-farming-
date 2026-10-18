const configured = () => Boolean(
  process.env.GOOGLE_SHEETS_WEB_APP_URL?.startsWith('https://script.google.com/macros/s/') &&
  process.env.GOOGLE_SHEETS_WEB_APP_URL?.endsWith('/exec') &&
  process.env.GOOGLE_SHEETS_SECRET
);

module.exports = function status(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  return res.status(200).json({ ready: configured() });
};
