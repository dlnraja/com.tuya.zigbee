'use strict';
const fs = require('fs');
const path = require('path');
const p = path.join(
  process.env.USERPROFILE,
  '.cursor/projects/c-Users-Dell-Documents-homey-master/agent-tools/34ca9810-a5ff-4663-a46c-7945c8f69a3e.txt',
);
const t = fs.readFileSync(p, 'utf8');
const decoded = t.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\"/g, '"');
const uuids = [...new Set([...decoded.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)].map((m) => m[0]))];
const vers = [...new Set([...decoded.matchAll(/9\.0\.\d+/g)].map((m) => m[0]))];
const out = { uuids, vers, count: uuids.length };
fs.writeFileSync(path.join(__dirname, 'GMAIL_DIAG_UUIDS.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
