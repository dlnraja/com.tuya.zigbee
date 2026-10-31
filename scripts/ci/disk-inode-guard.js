#!/usr/bin/env node
'use strict';
// P3096 (31/10/2026): disk + inode guard. Lesson: the dev box hit 100 % inodes (stale worktrees,
// /tmp) and every tool failed to spawn. CI runners can fill the same way (npm cache, artifacts).
// Warn at WARN %, fail at FAIL % of bytes OR inodes, before heavy steps run. No deletion here:
// cleanup stays a human/runner decision. Env: DISK_GUARD_WARN (85), DISK_GUARD_FAIL (97),
// DISK_GUARD_PATH ('.'), DISK_GUARD_SOFT=1 (never fail, report only).
const fs = require('fs');

function usage(p) {
  const s = fs.statfsSync(p);
  const pct = (free, total) => (total > 0 ? Math.round(1000 * (1 - free / total)) / 10 : 0);
  return { bytesPct: pct(s.bavail, s.blocks), inodesPct: pct(s.ffree, s.files), freeMB: Math.round((s.bavail * s.bsize) / 1048576), freeInodes: s.ffree };
}

function verdict(u, warn = 85, fail = 97) {
  const worst = Math.max(u.bytesPct, u.inodesPct);
  return worst >= fail ? 'fail' : worst >= warn ? 'warn' : 'ok';
}

if (require.main === module) {
  const p = process.env.DISK_GUARD_PATH || '.';
  let u;
  try { u = usage(p); } catch (e) { console.log(`[disk-guard] statfs unavailable (${e.message}); skip`); process.exit(0); }
  const v = verdict(u, Number(process.env.DISK_GUARD_WARN || 85), Number(process.env.DISK_GUARD_FAIL || 97));
  console.log(`[disk-guard] ${v.toUpperCase()} bytes ${u.bytesPct}% (free ${u.freeMB} MB) inodes ${u.inodesPct}% (free ${u.freeInodes})`);
  if (v === 'warn' && process.env.GITHUB_ACTIONS) console.log(`::warning::disk/inode usage high (bytes ${u.bytesPct}%, inodes ${u.inodesPct}%)`);
  process.exit(v === 'fail' && process.env.DISK_GUARD_SOFT !== '1' ? 1 : 0);
}
module.exports = { usage, verdict };
