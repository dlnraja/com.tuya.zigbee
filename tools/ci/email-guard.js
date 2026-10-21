#!/usr/bin/env node
'use strict';
// P2957: no third-party personal email addresses in tracked files (forum users, store authors,
// diag senders). Check mode (default) exits 1 on a finding; --fix redacts in place.
// Allowed: the maintainer's own addresses, placeholders, noreply/bot and official platform contacts.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const REDACTED = '[redacted-email]';
const ALLOW_ADDR = new Set(['dlnraja@gmail.com', '[redacted-email]']);
const ALLOW_DOMAIN = /(^|\.)(example\.(com|org|net)|email\.com|b\.com|users\.noreply\.github\.com|github\.com|homey\.app|athom\.com|athom\.discoursemail\.com|[a-z0-9-]+\.local|localhost)$/i;
const ALLOW_LOCAL = /^(no-?reply|notifications?|support|security|bot|p\d+-bot)$/i;
const SKIP_PATH = /(^|\/)(node_modules\/|(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$|LICEN[SC]E|\.git\/)|\.(png|jpe?g|gif|webp|svg|ico|zip|gz|pdf)$/i;

function allowed(addr) {
  const a = addr.toLowerCase(); const [local, domain] = a.split('@');
  if (ALLOW_ADDR.has(a) || ALLOW_DOMAIN.test(domain)) return true;
  // npm-style "pkg@1.2.3" or scoped refs are not emails
  if (/^\d/.test(domain) || /@\d+\.\d+/.test(a)) return true;
  return ALLOW_LOCAL.test(local) && /\.(com|app|io|dev)$/.test(domain) && /homey|athom|github/.test(domain);
}

function scanText(text) { return (text.match(RE) || []).filter((m) => !allowed(m)); }
function redactText(text) { return text.replace(RE, (m) => (allowed(m) ? m : REDACTED)); }

function trackedFiles(root) {
  return execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 1 << 28 }).toString().split('\0').filter((f) => f && !SKIP_PATH.test(f));
}

function run(root, fix) {
  const findings = [];
  for (const f of trackedFiles(root)) {
    const p = path.join(root, f);
    let t; try { t = fs.readFileSync(p, 'utf8'); } catch { continue; }
    if (t.includes('\u0000')) continue;
    const hits = scanText(t);
    if (!hits.length) continue;
    findings.push({ file: f, count: hits.length });
    if (fix) fs.writeFileSync(p, redactText(t));
  }
  return findings;
}

module.exports = { allowed, scanText, redactText, run, REDACTED };

if (require.main === module) {
  const fix = process.argv.includes('--fix');
  const res = run(process.cwd(), fix);
  for (const r of res) console.log(`${fix ? 'redacted' : 'FOUND'} ${r.count} email(s) in ${r.file}`);
  if (!fix && res.length) { console.error(`email-guard: ${res.length} file(s) with third-party emails. Run: node tools/ci/email-guard.js --fix`); process.exit(1); }
  console.log(`email-guard: ${fix ? 'fixed ' + res.length + ' file(s)' : 'clean'}`);
}
