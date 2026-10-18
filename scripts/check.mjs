import fs from 'node:fs';
const pages = ['index.html','careers.html','privacy.html','updates.html'];
for (const page of pages) {
  const html = fs.readFileSync(page,'utf8');
  for (const marker of ['<title>','name="description"','<h1','</main>','</html>']) if (!html.includes(marker)) throw new Error(`${page} missing ${marker}`);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
    const target = match[1].split(/[?#]/)[0];
    if (target && !fs.existsSync(`.${target}`)) throw new Error(`${page} broken local link: ${target}`);
  }
}
for (const file of ['styles.css','script.js','robots.txt','assets/field.svg','assets/favicon.svg','api/submit.js','api/status.js','google-sheets/Code.gs']) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
console.log('Static pages, metadata, and local links verified.');

