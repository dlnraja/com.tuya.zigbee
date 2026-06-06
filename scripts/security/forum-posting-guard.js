#!/usr/bin/env node
/**
 * forum-posting-guard.js — Bot ONLY posts on T140352 (WORKFLOW_GUIDELINES.md §C.10)
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const SAFE = '140352', FORBIDDEN = ['26439', '146735'];
let v = 0;
const wd = path.join(ROOT, '.github', 'workflows');
if (fs.existsSync(wd)) {
  for (const f of fs.readdirSync(wd).filter(f => f.endsWith('.yml'))) {
    const c = fs.readFileSync(path.join(wd, f), 'utf8');
    const rm = c.match(/REPLY_TOPICS['":\s]+['"]?(\d+)/);
    if (rm && rm[1] !== SAFE) { console.error(`❌ ${f}: REPLY_TOPICS=${rm[1]} (must be ${SAFE})`); v++; }
    for (const tid of FORBIDDEN) {
      if (c.includes(tid) && /REPLY|post_reply|create_post/i.test(c)) {
        console.error(`❌ ${f}: Posts to forbidden topic ${tid}`); v++;
      }
    }
  }
}
console.log(v === 0 ? `✅ Forum guard: PASS — only T${SAFE}` : `❌ FAIL: ${v} violation(s)`);
process.exit(v > 0 ? 1 : 0);
