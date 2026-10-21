#!/usr/bin/env node
'use strict';
// Checks every relative href/src in the generated HTML points to an existing file (and anchor).
const fs = require('fs');
const path = require('path');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}

function check(dir, opts = {}) {
  const root = path.resolve(dir);
  const outside = path.resolve(opts.allowOutside || path.join(root, '..'));
  const files = walk(root).filter(f => f.endsWith('.html'));
  const ids = new Map();
  const idsOf = f => {
    if (!ids.has(f)) { const s = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''; ids.set(f, new Set([...s.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]))); }
    return ids.get(f);
  };
  const broken = [];
  for (const f of files) {
    const html = fs.readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>/gi, '');
    for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
      const url = m[1].replace(/&amp;/g, '&');
      if (!url || /^(https?:|mailto:|data:|javascript:)/i.test(url)) continue;
      const [p, hash] = url.split('#');
      const target = p ? path.resolve(path.dirname(f), p.split('?')[0]) : f;
      const rel = path.relative(root, f);
      if (!target.startsWith(outside)) { broken.push(rel + ' -> ' + url + ' (outside site)'); continue; }
      if (!target.startsWith(root)) continue; // parent site (device finder), not ours to check
      if (!fs.existsSync(target)) { broken.push(rel + ' -> ' + url); continue; }
      if (hash && target.endsWith('.html') && !idsOf(target).has(hash)) broken.push(rel + ' -> ' + url + ' (missing anchor)');
    }
  }
  return { files: files.length, broken };
}

if (require.main === module) {
  const r = check(process.argv[2] || '.github/pages-build/docs');
  if (r.broken.length) { console.error('[links] ' + r.broken.length + ' broken link(s):\n  ' + r.broken.join('\n  ')); process.exit(1); }
  console.log('[links] ' + r.files + ' pages, all internal links OK');
}

module.exports = { check, walk };
