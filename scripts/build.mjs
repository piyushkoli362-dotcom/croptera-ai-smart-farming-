import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const file of ['index.html', 'careers.html', 'privacy.html', 'updates.html', 'styles.css', 'showcase.css', 'script.js', 'robots.txt']) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });
const siteUrl = (process.env.SITE_URL || '').replace(/\/+$/, '');
if (siteUrl) {
  if (!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(siteUrl)) throw new Error('SITE_URL must be a real HTTPS production URL');
  const pages = ['', '/careers.html', '/privacy.html', '/updates.html'];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(page => `<url><loc>${siteUrl}${page || '/'}</loc></url>`).join('')}</urlset>\n`;
  fs.writeFileSync(path.join(out, 'sitemap.xml'), xml);
  fs.appendFileSync(path.join(out, 'robots.txt'), `Sitemap: ${siteUrl}/sitemap.xml\n`);
  for (const page of pages) {
    const file = path.join(out, page || '/index.html');
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace('</head>', `<link rel="canonical" href="${siteUrl}${page || '/'}"></head>`);
    html = html.replace('content="/assets/croptera-logo.png"', `content="${siteUrl}/assets/croptera-logo.png"`);
    fs.writeFileSync(file, html);
  }
}
console.log(`Built ${out}${siteUrl ? ` for ${siteUrl}` : ' without production canonical URLs or sitemap'}`);


