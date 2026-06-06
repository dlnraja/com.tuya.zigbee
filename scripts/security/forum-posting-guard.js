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
    // Skip disabled workflows
    if (c.includes('DISABLED') || /if:\s*false/.test(c)) continue;
    // Check REPLY_TOPICS env var (the actual posting target)
    const rm = c.match(/REPLY_TOPICS['":\s]+['"]?(\d+)/);
    if (rm && rm[1] !== SAFE) { console.error(`❌ ${f}: REPLY_TOPICS=${rm[1]}`); v++; }
    // Check for forbidden topics in ACTUAL posting code (not comments)
    // Look for topic IDs in env vars, function args, or API calls
    const lines = c.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comment lines
      if (/^\s*#/.test(line) || /^\s*\/\//.test(line)) continue;
      for (const tid of FORBIDDEN) {
        if (line.includes(tid) && /REPLY_TOPICS|topic_id|create_post|post_reply|reply_to/i.test(line)) {
          console.error(`❌ ${f}:${i + 1}: Posts to forbidden topic ${tid}`); v++;
        }
      }
    }
  }
}
console.log(v === 0 ? `✅ Forum guard: PASS — only T${SAFE}` : `❌ FAIL: ${v} violation(s)`);
process.exit(v > 0 ? 1 : 0);
