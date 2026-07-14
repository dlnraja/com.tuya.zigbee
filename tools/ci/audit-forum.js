// audit-forum.js — audit forum scraper
const fs = require('fs');
const files = [
  'tools/ci/forum-fetch-140352.js',
  'tools/ci/forum-integration.js',
  'tools/ci/search-forum.js',
  'tools/ci/search-forum-v2.js',
  'tools/ci/search-forum-posts.js',
  'tools/ci/search-forum-posts-v2.js',
  'tools/ci/forum-temporal-collect.js',
];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const content = fs.readFileSync(f, 'utf8');
  const conc = (content.match(/concurrency[:\s=]*\d+/g) || []).slice(0, 5);
  const puppeteer = content.includes('puppeteer') || content.includes('Puppeteer');
  const browserUA = content.includes('User-Agent') ? 'browser-UA' : 'no-UA';
  const delays = (content.match(/delay\s*\(\s*\d+|sleep\s*\(\s*\d+|timeout\s*[=:]\s*\d+/g) || []).slice(0, 5);
  console.log(f);
  console.log('  Puppeteer:', puppeteer ? 'YES' : 'no');
  console.log('  UA mode:', browserUA);
  console.log('  Concurrency:', conc.length ? conc.join(', ') : 'none');
  console.log('  Delays/timeouts:', delays.length ? delays.join(', ') : 'none');
  console.log();
}
