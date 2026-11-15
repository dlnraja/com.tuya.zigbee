#!/usr/bin/env node
'use strict';

/**
 * P3320 fail-closed gate (core rules-gates / pre-push / CI).
 * 1) Shipped JS (not excluded by .homeyignore) must contain no raw char > U+00FF.
 *    Use ASCII tags or \\uXXXX escapes; a small explicit allowlist may exist.
 * 2) Packaged images must be referenced or required by Athom / capability convention.
 *    Unreferenced or stray logos are blocked.
 */

const path = require('path');
const {
  scanWideInShippedJs,
  loadAllowlist,
  findUnreferencedImages,
} = require('../../scripts/maintenance/p3320-latin1-source.cjs');

function main(root = path.resolve(__dirname, '..', '..')) {
  const allowlist = loadAllowlist(root);
  const wide = scanWideInShippedJs(root, { allowlist });
  const unref = findUnreferencedImages(root);
  let failed = false;

  if (wide.length) {
    failed = true;
    const n = wide.reduce((s, h) => s + h.count, 0);
    console.error(`[P3320] FAIL: ${wide.length} shipped JS file(s) still contain ${n} raw char(s) > U+00FF.`);
    console.error('        Replace decorative glyphs with ASCII ([OK], [WARN], [ERR], ->, -) or \\uXXXX escapes.');
    console.error('        Accented Latin-1 (é, à) is fine. Do not change locales/*.json or compose titles.');
    for (const h of wide.slice(0, 25)) {
      const top = Object.entries(h.chars).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}x${v}`).join(', ');
      console.error(`  ${h.count}\t${h.file}\t${top}`);
    }
    if (wide.length > 25) console.error(`  ... +${wide.length - 25} files`);
  } else {
    console.log('[P3320] OK: shipped JS is Latin-1 (no raw char > U+00FF outside the allowlist).');
  }

  if (unref.length) {
    failed = true;
    const bytes = unref.reduce((n, x) => n + x.bytes, 0);
    console.error(`[P3320] FAIL: ${unref.length} unreferenced packaged image(s), ${(bytes / 1048576).toFixed(2)} MB.`);
    console.error('        Remove them or add a real manifest/compose/HTML/JS reference. Keep Athom small/large/xlarge.');
    for (const u of unref.slice(0, 25)) {
      console.error(`  ${u.bytes}\t${u.file}`);
    }
    if (unref.length > 25) console.error(`  ... +${unref.length - 25} files`);
  } else {
    console.log('[P3320] OK: no unreferenced packaged images.');
  }

  return failed ? 1 : 0;
}

module.exports = { main };
if (require.main === module) process.exitCode = main();
