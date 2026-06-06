#!/usr/bin/env node
/**
 * input-sanitizer.js — Prevent command injection from issue/PR inputs (security.md §3)
 */
'use strict';
const input = process.argv.includes('--file')
  ? require('fs').readFileSync(process.argv[process.argv.indexOf('--file') + 1], 'utf8')
  : process.argv.slice(2).join(' ');
if (!input) { console.error('Usage: input-sanitizer.js "string" | --file <path>'); process.exit(1); }
const D = [
  [/[;&|`$(){}[\]!]/, 'shell metachar'], [/\.\.[\/\\]/, 'path traversal'],
  [/[\r\n]/, 'CRLF'], [/\x00/, 'null byte'], [/\$\(/, 'cmd substitution'],
  [/\|/, 'pipe'], [/&&/, 'chain'], [/[*?]/, 'glob'],
  [/<script/i, 'script tag'], [/<iframe/i, 'iframe tag'], [/javascript:/i, 'js URL'],
];
const f = D.filter(([, n]) => D.find(([rx]) => rx.test(input)) || false).map(d => d[1]);
// simplified: check each
const found = []; for (const [rx, name] of D) { if (rx.test(input)) found.push(name); }
if (found.length) { console.error(`❌ UNSAFE: ${found.join(', ')}`); process.exit(1); }
console.log(`✅ Input sanitized (${input.length} chars)`);
