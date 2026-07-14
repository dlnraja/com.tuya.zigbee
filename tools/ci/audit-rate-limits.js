// audit-rate-limits.js — P54 Source of truth audit
// Find all external API call sites in the codebase, with their current
// rate limit settings. Helps identify bottlenecks and over-throttling.
'use strict';
const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (f.endsWith('.js')) files.push(p);
  }
  return files;
}

const allFiles = [
  ...walk('lib'),
  ...walk('scripts'),
  ...walk('tools'),
];

const STATS = {
  github_api: [],
  raw_githubusercontent: [],
  imap_email: [],
  puppeteer_browser: [],
  other_external: [],
};

const RATE_PATTERNS = [
  { regex: /concurrency:\s*(\d+)/g, name: 'concurrency' },
  { regex: /perHost:\s*\{[^}]*\}/g, name: 'perHost' },
  { regex: /timeout.*?(\d+)\s*\*?\s*1000/g, name: 'timeout_ms' },
  { regex: /setTimeout.*?(\d+)\s*\*\s*60\s*\*\s*1000/g, name: 'delay_min' },
];

console.log('=== External API call site audit ===\n');

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');

  // Detect GitHub API calls
  if (content.includes('api.github.com')) {
    STATS.github_api.push(file);
  }
  if (content.includes('raw.githubusercontent.com')) {
    STATS.raw_githubusercontent.push(file);
  }
  if (content.includes('imap') || content.includes('IMAP') || content.includes('gmail')) {
    STATS.imap_email.push(file);
  }
  if (content.includes('puppeteer') || content.includes('Puppeteer')) {
    STATS.puppeteer_browser.push(file);
  }
  if (content.includes('https://') && !content.includes('api.github.com') && !content.includes('raw.githubusercontent.com')) {
    STATS.other_external.push(file);
  }
}

console.log('GitHub API (api.github.com):', STATS.github_api.length, 'files');
for (const f of STATS.github_api.slice(0, 5)) console.log('  -', f);
if (STATS.github_api.length > 5) console.log('  ... and', STATS.github_api.length - 5, 'more');

console.log('\nRaw github (raw.githubusercontent.com):', STATS.raw_githubusercontent.length, 'files');
for (const f of STATS.raw_githubusercontent.slice(0, 5)) console.log('  -', f);
if (STATS.raw_githubusercontent.length > 5) console.log('  ... and', STATS.raw_githubusercontent.length - 5, 'more');

console.log('\nIMAP/Email:', STATS.imap_email.length, 'files');
for (const f of STATS.imap_email.slice(0, 5)) console.log('  -', f);

console.log('\nPuppeteer:', STATS.puppeteer_browser.length, 'files');
for (const f of STATS.puppeteer_browser.slice(0, 5)) console.log('  -', f);

console.log('\nOther external URLs:', STATS.other_external.length, 'files');
for (const f of STATS.other_external.slice(0, 5)) console.log('  -', f);

// Find perHost and concurrency settings across all files
console.log('\n=== Rate limit / concurrency settings ===');
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(/(concurrency|perHost|timeout):\s*[\d{][^,\n}]+/g);
  if (matches && matches.length > 0) {
    const interesting = matches.filter(m => !m.match(/^(timeout):/));
    if (interesting.length > 0) {
      console.log(file.replace(process.cwd() + '/', ''));
      interesting.slice(0, 5).forEach(m => console.log('  ', m));
    }
  }
}
