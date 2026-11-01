#!/usr/bin/env node
'use strict';
// WHY(P3119, 01/11/2026 Paris, owner t682u/t693u): no home data of Bastien or of ANY user may sit in
// the repo (room names, device labels, IEEE addresses, Homey ids, personal mails). This rewrites the
// CURRENT tree only (no history rewrite) with stable, context-preserving placeholders per file:
// first room seen -> [pièce A], next -> [pièce B]; IEEE -> [IEEE-1]; email -> [email-1]; Homey ids ->
// [homey-id-1]. The same entity keeps the same placeholder inside one file, so the story stays readable.
// Runtime code (lib/, drivers/) is never touched here. Usage: privacy-redact.js [--check] [paths...]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOMS = ['salle de bain', 'salle à manger', 'sous[- ]sol', 'chambre(?: principale?| parents| enfants?| d\'amis)?',
  'salon', 'cuisine', 'séjour', 'buanderie', 'couloir', 'grenier', 'cellier', 'véranda', 'mezzanine', 'dressing'];
const ROOM_RE = new RegExp('\\b(' + ROOMS.join('|') + ')\\b', 'gi');
const IEEE_RE = /\b(?:[0-9a-f]{2}:){7}[0-9a-f]{2}\b|\b0x[0-9a-f]{16}\b/gi;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
// Project/public addresses that are not personal data.
const EMAIL_OK = /@(example\.(com|org|net|invalid)|users\.noreply\.github\.com|athom\.com|homey\.app|github\.com)$|^dlnraja@gmail\.com$|^(noreply|no-reply|support|security)@/i;
const HOMEYID_RE = /\b(homeyId|cloudId|zoneId|flowId|userId|zone|homey_id)(["']?\s*[:=]\s*["']?)([0-9a-f]{24}|[0-9a-f-]{36})/gi;
// Room words only count as personal in files about a real home/diag (all users, not only Bastien).
const PERSONAL_PATH = /bastien|diag|fleet-treat|mesh|live|photos|couples\/|user|report/i;

function letters(n) { let s = ''; n++; while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); } return s; }

function redact(text, rel) {
  const maps = { room: new Map(), ieee: new Map(), email: new Map(), hid: new Map() };
  let n = 0;
  const pick = (m, key, mk) => { const k = key.toLowerCase(); if (!m.has(k)) m.set(k, mk(m.size)); return m.get(k); };
  let out = text.replace(IEEE_RE, (x) => { if (/^(00:){7}00$|^(ff:){7}ff$/i.test(x)) return x; n++; return pick(maps.ieee, x, (i) => `[IEEE-${i + 1}]`); });
  out = out.replace(EMAIL_RE, (x) => { if (EMAIL_OK.test(x)) return x; n++; return pick(maps.email, x, (i) => `[email-${i + 1}]`); });
  out = out.replace(HOMEYID_RE, (_, k, sep, v) => { n++; return k + sep + pick(maps.hid, v, (i) => `[homey-id-${i + 1}]`); });
  if (PERSONAL_PATH.test(rel)) out = out.replace(ROOM_RE, (x) => { n++; return pick(maps.room, x, (i) => `[pièce ${letters(i)}]`); });
  return { out, n };
}

const SCOPE = /^(docs|reports|data\/leads|\.agents|\.cursor)\/|\.md$/;
const SKIP = /^(lib|drivers|node_modules|test\/fixtures)\/|(^|\/)_?[^/]*app\.json$|\.(svg|png|jpe?g|gif|ico|zip|gz)$/;
// P3128: generated app.json copies hold generic product hints (example IEEE, room words in pairing tips), not house data
function files(root, args) {
  const all = execFileSync('git', ['ls-files', ...args], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  return all.filter((f) => SCOPE.test(f) && !SKIP.test(f));
}
function main() {
  const argv = process.argv.slice(2); const check = argv.includes('--check');
  const root = process.cwd(); let total = 0; let touched = 0;
  for (const rel of files(root, argv.filter((a) => !a.startsWith('--')))) {
    const p = path.join(root, rel); let t; try { t = fs.readFileSync(p, 'utf8'); } catch { continue; }
    if (t.length > 8e6) continue;
    const { out, n } = redact(t, rel);
    if (n) { total += n; touched++; if (!check) fs.writeFileSync(p, out); }
  }
  console.log(`privacy-redact: ${touched} file(s), ${total} value(s) ${check ? 'would be ' : ''}redacted`);
  if (check && total) process.exit(1);
}
module.exports = { redact, ROOM_RE, IEEE_RE, EMAIL_OK };
if (require.main === module) main();
