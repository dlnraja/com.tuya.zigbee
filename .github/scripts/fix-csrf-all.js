#!/usr/bin/env node
'use strict';
// Fix CSRF refresh in all forum scripts that use getForumAuth but lack refreshCsrf
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname);
const scripts = [
  'forum-activity-scraper.js',
  'forum-pm-scanner.js',
  'forum-scan-spam.js',
  'forum-updater.js',
  'github-issue-manager.js',
  'monthly-comprehensive.js',
  'nightly-processor.js',
];

let fixed = 0;
for (const f of scripts) {
  const fp = path.join(dir, f);
  if (!fs.existsSync(fp)) { console.log('SKIP (not found):', f); continue; }
  let c = fs.readFileSync(fp, 'utf8');
  if (c.includes('refreshCsrf')) { console.log('SKIP (already has):', f); continue; }
  if (!c.includes('getForumAuth')) { console.log('SKIP (no forum auth):', f); continue; }

  let changed = false;

  // Step 1: Add refreshCsrf to import
  const importPatterns = [
    { find: '{getForumAuth,fmtCk,FORUM}', replace: '{getForumAuth,refreshCsrf,fmtCk,FORUM}' },
    { find: '{getForumAuth,fmtCk,exCk,FORUM}', replace: '{getForumAuth,refreshCsrf,fmtCk,exCk,FORUM}' },
    { find: '{ getForumAuth, fmtCk, FORUM }', replace: '{ getForumAuth, refreshCsrf, fmtCk, FORUM }' },
  ];
  for (const p of importPatterns) {
    if (c.includes(p.find)) {
      c = c.replace(p.find, p.replace);
      changed = true;
      break;
    }
  }

  // If no standard pattern, try regex
  if (!changed) {
    const m = c.match(/const\s*\{([^}]*getForumAuth[^}]*)\}\s*=\s*require\(['"]\.\/forum-auth['"]\)/);
    if (m && !m[1].includes('refreshCsrf')) {
      c = c.replace(m[1], m[1].replace('getForumAuth', 'getForumAuth,refreshCsrf'));
      changed = true;
    }
  }

  // Step 2: Add refreshCsrf call after getForumAuth()
  if (changed) {
    // Find "auth=await getForumAuth()" or "auth = await getForumAuth()"
    const authRe = /((?:let |const |var )?auth\s*=\s*await\s+getForumAuth\(\);?)/;
    const am = c.match(authRe);
    if (am) {
      const line = am[1].endsWith(';') ? am[1] : am[1] + ';';
      const csrfLine = "\n    if(auth&&auth.type==='session')auth=await refreshCsrf(auth);";
      c = c.replace(am[1], line + csrfLine);
    }
  }

  if (changed) {
    fs.writeFileSync(fp, c);
    fixed++;
    console.log('FIXED:', f);
  } else {
    console.log('COULD NOT FIX:', f);
  }
}

console.log('\nTotal fixed:', fixed);
