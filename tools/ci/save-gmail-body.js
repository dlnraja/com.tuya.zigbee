#!/usr/bin/env node
'use strict';
/** Save a Gmail PLAIN_TEXT body into the recursive inbox (gitignored). */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, '.github', 'state', 'diag-recursive-inbox', 'bodies');
const id = process.argv[2];
if (!id) {
  console.error('usage: save-gmail-body.js <messageId> < body.txt');
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
const body = fs.readFileSync(0, 'utf8');
const file = path.join(OUT, `${id}.txt`);
fs.writeFileSync(file, body);
console.log('wrote', file, body.length);
