import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'dist');
const publicFiles = ['index.html', 'careers.html', 'privacy.html', 'updates.html', 'styles.css', 'showcase.css', 'script.js', 'robots.txt', 'google0a9687274ca52e4f.html', 'google6346d7fbc9b6f809.html'];
const pages = [
  { file: 'index.html', route: '/', index: true },
  { file: 'careers.html', route: '/careers.html', index: true },
  { file: 'privacy.html', route: '/privacy.html', index: true },
  { file: 'updates.html', route: '/updates.html', index: false }
];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const file of publicFiles) fs.copyFileSync(path.join(root, file), path.join(out, file));
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });

// Preview deployments must also point search engines to this canonical production host.
const siteUrl = 'https://croptera-ai-smart-farming.vercel.app';
if (process.env.SITE_URL && process.env.SITE_URL.replace(/\/+$/, '') !== siteUrl) {
  throw new Error(`SITE_URL must match the canonical production origin: ${siteUrl}`);
}
if (siteUrl) {
  if (!/^https:\/\/[^\s/?#]+$/.test(siteUrl)) throw new Error('SITE_URL must be an HTTPS origin without a path');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter(page => page.index).map(page => `  <url><loc>${siteUrl}${page.route}</loc></url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(out, 'sitemap.xml'), xml);
  fs.appendFileSync(path.join(out, 'robots.txt'), `Sitemap: ${siteUrl}/sitemap.xml\n`);

  for (const page of pages) {
    const file = path.join(out, page.file);
    let html = fs.readFileSync(file, 'utf8');
    const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1];
    const title = head?.match(/<title>([^<]+)<\/title>/i)?.[1];
    const description = head?.match(/<meta name="description" content="([^"]+)"/i)?.[1];
    if (!title || !description) throw new Error(`${page.file} needs a title and description`);

    const url = `${siteUrl}${page.route}`;
    const image = `${siteUrl}/assets/croptera-logo.png`;
    const tags = [
      `<link rel="canonical" href="${url}">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="Croptera AI">`,
      `<meta property="og:locale" content="en_IN">`,
      `<meta property="og:title" content="${title}">`,
      `<meta property="og:description" content="${description}">`,
      `<meta property="og:url" content="${url}">`,
      `<meta property="og:image" content="${image}">`,
      `<meta property="og:image:alt" content="Croptera AI logo">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${title}">`,
      `<meta name="twitter:description" content="${description}">`,
      `<meta name="twitter:image" content="${image}">`
    ];
    if (page.route === '/') {
      const graph = {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: 'Croptera AI', url: `${siteUrl}/`, logo: { '@type': 'ImageObject', url: image }, founder: { '@id': `${siteUrl}/#founder` } },
          { '@type': 'Person', '@id': `${siteUrl}/#founder`, name: 'Piyush Koli', image: `${siteUrl}/assets/piyush-koli.jpg`, sameAs: 'https://www.linkedin.com/in/piyush-koli-31883b36b/' },
          { '@type': 'WebSite', '@id': `${siteUrl}/#website`, name: 'Croptera AI', url: `${siteUrl}/`, publisher: { '@id': `${siteUrl}/#organization` }, inLanguage: 'en-IN' }
        ]
      };
      tags.push(`<script type="application/ld+json">${JSON.stringify(graph).replaceAll('<', '\\u003c')}</script>`);
      tags.push('<link rel="preload" as="image" href="/assets/hero-farmer.png" fetchpriority="high">');
    }
    // Source pages may contain older Open Graph tags; emit one consistent set.
    html = html.replace(/<meta property="og:[^"]+" content="[^"]*">/gi, '');
    html = html.replace('</head>', `${tags.join('')}</head>`);
    fs.writeFileSync(file, html);
  }
}

console.log(`Built ${out}${siteUrl ? ` for ${siteUrl}` : ' without production canonical URLs or sitemap'}`);


