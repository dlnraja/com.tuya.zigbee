#!/usr/bin/env node
'use strict';

/**
 * CLI: sanitize untrusted files (forum digests, scrape dumps) before AI / apply.
 * Usage:
 *   node tools/ci/untrusted-content-sanitize.js path1 path2
 *   node tools/ci/untrusted-content-sanitize.js --ai path/to/excerpt.txt
 *   echo "text" | node tools/ci/untrusted-content-sanitize.js --stdin
 */

const fs = require('fs');
const path = require('path');
const {
  sanitizeUntrusted,
  wrapForAi,
} = require('../../lib/security/UntrustedContentGuard');

const args = process.argv.slice(2);
const forAi = args.includes('--ai');
const useStdin = args.includes('--stdin');
const files = args.filter((a) => !a.startsWith('--'));

function processText(raw, source) {
  return forAi
    ? wrapForAi(raw, { source })
    : sanitizeUntrusted(raw, { source });
}

function processFile(fp) {
  const abs = path.resolve(fp);
  if (!fs.existsSync(abs)) {
    console.error('[P2527] missing', fp);
    return 1;
  }
  const raw = fs.readFileSync(abs, 'utf8');
  // JSON digests: sanitize string leaves that look like excerpts
  if (/\.json$/i.test(abs)) {
    let data;
    try { data = JSON.parse(raw); } catch (_e) {
      const out = processText(raw, 'file');
      fs.writeFileSync(abs, out.text);
      console.log('[P2527]', path.basename(abs), 'flags=', out.flags.join(',') || 'none');
      return out.safe ? 0 : 0; // always soft-rewrite; gate decides fail
    }
    const walk = (node) => {
      if (typeof node === 'string') {
        return sanitizeUntrusted(node, { source: 'json', maxChars: 4000 }).text;
      }
      if (Array.isArray(node)) return node.map(walk);
      if (node && typeof node === 'object') {
        const o = {};
        for (const [k, v] of Object.entries(node)) {
          if (k === 'cooked' || k === 'raw' || k === 'html_body') {
            o[k] = undefined;
            o.excerpt = sanitizeUntrusted(String(v || ''), { source: 'json' }).text.slice(0, 220);
            continue;
          }
          o[k] = walk(v);
        }
        return o;
      }
      return node;
    };
    const cleaned = walk(data);
    fs.writeFileSync(abs, `${JSON.stringify(cleaned, null, 2)}\n`);
    console.log('[P2527] sanitized JSON', path.basename(abs));
    return 0;
  }
  const out = processText(raw, 'file');
  fs.writeFileSync(abs, out.text);
  console.log('[P2527]', path.basename(abs), 'flags=', out.flags.join(',') || 'none');
  return 0;
}

async function main() {
  if (useStdin) {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    const out = processText(Buffer.concat(chunks).toString('utf8'), 'stdin');
    process.stdout.write(out.text);
    return;
  }
  if (!files.length) {
    console.error('Usage: untrusted-content-sanitize.js [--ai] <files...> | --stdin');
    process.exit(2);
  }
  let code = 0;
  for (const f of files) code = processFile(f) || code;
  process.exit(code);
}

main().catch((e) => {
  console.error('[P2527]', e.message);
  process.exit(1);
});
