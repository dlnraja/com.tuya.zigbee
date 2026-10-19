#!/usr/bin/env node
'use strict';
/**
 * Hand-off for bot triage / monthly scan candidates (P2882, 2026-10-19).
 *
 * auto-bot-issue-triage.yml and monthly-scan.yml write .github/state/bot-auto-scan-candidates.json, but
 * .github/state is gitignored, so nothing ever read that list in a later run. This step copies each
 * missing manufacturer into the tracked progress ledger (data/progress/ledger.json) as a `lead:<mfr>`
 * item with status `pending`. The daily resume reads them with `node scripts/progress/ledger-cli.js next lead`.
 *
 * Rules kept: the list carries manufacturer names only, so nothing is placed in a driver (no pid is ever
 * guessed, never key on mfr alone). Existing ledger entries are never downgraded or rewritten; the match
 * is case-insensitive so padding/case variants do not create duplicates. Notes hold only ids and links.
 *
 * Usage: node scripts/progress/ingest-bot-candidates.js [candidates.json] [--dry] [--max=N]
 * Prints "added=N"; writes the ledger only when something was added.
 */
const fs = require('fs');
const path = require('path');
const L = require('../lib/ledger');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_IN = path.join(ROOT, '.github', 'state', 'bot-auto-scan-candidates.json');
const MFR_RE = /^_T[YZ][A-Z0-9]{2,5}_[A-Za-z0-9]{4,20}$/;

// Display form keeps the case; control and zero-width characters are dropped. Comparison is case-insensitive.
const norm = (s) => [...String(s || '')].filter((c) => { const x = c.charCodeAt(0); return x > 31 && x !== 127 && !(x >= 0x200b && x <= 0x200d) && x !== 0xfeff; }).join('').trim();

function ingest(bag, ledger, { max = 200, repo = 'dlnraja/com.tuya.zigbee', today = new Date().toISOString().slice(0, 10) } = {}) {
  const have = new Set(Object.keys(ledger.items || {}).filter((k) => k.startsWith('lead:')).map((k) => k.slice(5).toLowerCase()));
  const issueOf = new Map();
  for (const it of (bag && bag.issues) || []) {
    for (const m of it.missing || []) { if (!issueOf.has(norm(m).toLowerCase())) { issueOf.set(norm(m).toLowerCase(), it.number); } }
  }
  const added = [];
  for (const raw of (bag && bag.missingMfrs) || []) {
    if (added.length >= max) { break; }
    const mfr = norm(raw);
    if (!MFR_RE.test(mfr) || have.has(mfr.toLowerCase())) { continue; }
    const n = issueOf.get(mfr.toLowerCase());
    const where = n ? `issue #${n} https://github.com/${repo}/issues/${n}` : bag.source || 'bot scan';
    ledger.items[`lead:${mfr}`] = {
      status: 'pending',
      date: today,
      note: `mfr only, no pid: from ${bag.source || 'bot scan'} (${where}); research the exact mfr+pid couple before placing`,
      by: bag.source || 'bot-candidates',
    };
    have.add(mfr.toLowerCase());
    added.push(mfr);
  }
  return added;
}

function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--')) || DEFAULT_IN;
  const dry = args.includes('--dry');
  const maxArg = args.find((a) => a.startsWith('--max='));
  if (!fs.existsSync(file)) { console.log(`no candidates file (${path.relative(ROOT, file)}), added=0`); return; }
  let bag;
  try { bag = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.log(`unreadable candidates file: ${e.message}, added=0`); return; }
  const ledger = L.load();
  const added = ingest(bag, ledger, { max: maxArg ? Number(maxArg.split('=')[1]) : 200, repo: process.env.GITHUB_REPOSITORY || undefined });
  if (added.length && !dry) { L.save(ledger); }
  console.log(`${added.length ? added.join('\n') + '\n' : ''}added=${added.length}${dry ? ' (dry)' : ''}`);
  if (process.env.GITHUB_OUTPUT) { fs.appendFileSync(process.env.GITHUB_OUTPUT, `added=${added.length}\n`); }
}

module.exports = { ingest };
if (require.main === module) { main(); }
