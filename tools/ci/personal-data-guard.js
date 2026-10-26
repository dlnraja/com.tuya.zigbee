#!/usr/bin/env node
'use strict';
// P3074: keep the maintainer's personal profile data (CV / LinkedIn exports, personal
// mailbox, phone) out of the repository. Fails on a tracked path or file content that
// matches the patterns below. Personal address and phone are compared by SHA-256 so
// this file does not carry them in plaintext.
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PATTERNS = [
  /myskills/i,
  /linkedin[_-]?cv/i,
  /linkedin[_-]?about/i,
  /linkedin\.com\/in\//i,
];
const HASHED = new Set([
  '83d41ed4fe9de6ca44d4295fc71fd5f0450bc457dc425433e697a8ed8098d19f',
  'fb96c5d5fb2337e86c2d353b4e1e9d4c50dba97e023d0bbaca3ce9bfdae4f77c',
  'dab391ff711549dfccb1335a62f3a59af2487b40d443108bb8d4c9d38c53b8b4',
]);
// P3075 (t609u): job-search / application material never belongs here either. Words and short
// phrases (employer names, application vocabulary) are compared as SHA-256 of the normalised
// text (lowercase, no accents, punctuation → space), so the list itself stays unreadable.
const TERM_HASHES = new Set([
  'dcc37dac260f81326aa7ee041f10ba0f9d1f997b9bd2991438f16c533baee9a5',
  '248c84a127ddd05c2b9dff2f8cc4009f79a403bc303e412a8e6b21534288efdb',
  '76e2366dd976e0bf54a6e3b372dc67852e89a0bd2abe8f4110c6b64f9914cd6e',
  'eabe47dbfc7f4b8b265b6fe7e6f7d9e73c14a86eada06a18e52b21a321037323',
  'd555be37ef86585a56441cd75faaae67772251f621207b8cdc21ed914717e044',
  'a47c18d8c30926c8b990e336639ba19199eda4d00920fc377f75d1647cd1cab3',
  'c09dd6136e51676754ad085d07ba5a82cce1bb2b06ce923ead4df91ec6c2c7b4',
  'f2f40ed74d5ca6c42916c38dc13ec23703253982d228572e2137b5c46ad46716',
  'cc2c5b0485f4531f0ce36f8fc51f00a59d10b4e6027fa1b64516d054c89bbb50',
  '729431682a67160ef30f777984106cbe5c97dbc0fbda177df0450da40eb26be2',
  'ec8b778e04b2ff16f644d1d58b86e2f25ce380bcbe1c6eb83e6bffb89a941fba',
  '05043bf76988e539a5fe22c629d15436c03feadb9305ef3d4d174b4313266d66',
  '89997e36ae88f868dfb6e0378df689423a9f81f0e2ac7a0762a060b7b50cacea',
  '423576a0f6ca02105fc79105c1e36e3c704cf504ffb9f69fcd09f88c59532ced',
  '8155280a9f821efece4befc404545301aad483620295353305fe4bbeb5ff932d',
  '3a0266289d2f2b3472705624127adbe7b509cfd49271faf6cf54b46b117767e8',
]);
const JOB_PATHS = [/(^|\/)candidatures\//i, /(^|\/)jobs\//i, /(^|\/)removed-personal-dir\//i];
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const PHONE_RE = /(?:\+33[ .-]?|\b0)[1-9](?:[ .-]?\d{2}){4}\b/g;
// .gitignore lists the blocked folders on purpose (exclusion patterns, not content)
const SELF = new Set(['tools/ci/personal-data-guard.js', 'test/p3074-personal-data-guard.test.js', '.gitignore']);
const SKIP_PATH = /(^|\/)(node_modules\/|\.git\/)|\.(png|jpe?g|gif|webp|ico|zip|gz|pdf)$/i;

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function normPhone(p) { const d = p.replace(/\D/g, ''); return d.startsWith('33') ? '0' + d.slice(2) : d; }

const memo = new Map();
const hashOnce = (w) => { let h = memo.get(w); if (h === undefined) { h = TERM_HASHES.has(sha(w)); if (memo.size < 500000) memo.set(w, h); } return h; };
/** True when a word or a 2-3 word phrase of `text` is a listed job/employer term. */
function hasJobTerm(text) {
  const words = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.length >= 5 && w.length <= 12 && hashOnce(w)) return true;
    if (i + 1 < words.length && (w === 'cover' || w === 'lettre' || w === 'lettres' || w === 'offre' || w === 'offres')) {
      if (hashOnce(w + ' ' + words[i + 1])) return true;
      if (i + 2 < words.length && hashOnce(w + ' ' + words[i + 1] + ' ' + words[i + 2])) return true;
    }
  }
  return false;
}

function scanText(text) {
  const out = [];
  for (const re of PATTERNS) if (re.test(text)) out.push(String(re));
  if (hasJobTerm(text)) out.push('job-application-term');
  for (const m of text.match(EMAIL_RE) || []) if (HASHED.has(sha(m.toLowerCase()))) { out.push('personal-email'); break; }
  for (const m of text.match(PHONE_RE) || []) if (HASHED.has(sha(normPhone(m)))) { out.push('personal-phone'); break; }
  return out;
}
function scanPath(p) {
  const out = PATTERNS.concat(JOB_PATHS).filter((re) => re.test(p)).map(String);
  if (hasJobTerm(p)) out.push('job-application-term');
  return out;
}

function trackedFiles(root) {
  return execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 1 << 28 }).toString().split('\0').filter(Boolean);
}

function run(root) {
  const findings = [];
  for (const f of trackedFiles(root)) {
    if (SELF.has(f)) continue;
    const hits = scanPath(f).map((h) => 'path:' + h);
    if (!SKIP_PATH.test(f)) {
      let t = null; try { t = fs.readFileSync(path.join(root, f), 'utf8'); } catch { /* deleted or unreadable */ }
      if (t && !t.includes('\u0000')) hits.push(...scanText(t));
    }
    if (hits.length) findings.push({ file: f, hits });
  }
  return findings;
}

module.exports = { scanText, scanPath, run, normPhone, hasJobTerm };

if (require.main === module) {
  const res = run(process.cwd());
  for (const r of res) console.log(`FOUND ${r.hits.join(', ')} in ${r.file}`);
  if (res.length) { console.error(`personal-data-guard: ${res.length} file(s) with personal profile data`); process.exit(1); }
  console.log('personal-data-guard: clean');
}
