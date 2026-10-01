'use strict';
/**
 * scripts/digest/quirks.js — per manufacturerName+productId firmware-quirk dataset (report-only).
 *
 * Categories (multilingual keyword rules EN/FR/DE/NL/ES/IT, deterministic, no AI):
 *   spurious-zero · null-invalid · wrong-scaling · reboot · overheat · over-reporting ·
 *   duplicate-report · disconnect
 * Inputs:
 *   1. digest-leads records of this run (own issues/PRs, JohanBendz, forum, git history) — their
 *      `signals.quirks` are computed in leads.js with classify().
 *   2. External community trackers via the GitHub issue search API (one search per pair over
 *      several public Zigbee projects; title+body of ≤10 hits are classified) — QUIRKS_GH_MAX (4)
 *      searches per run, ≥3 s apart.
 *   3. Public Discourse forums of other home-automation projects (search.json, one rotating forum
 *      per run, ≤ QUIRKS_DISCOURSE_MAX (1) request, 3–6 s spacing, same User-Agent as the digest).
 * Dataset: $QUIRKS_DB (default .github/state/quirks/quirks.json, persisted with actions/cache).
 *   { pairs: { "mfr|PID": { checkedAt, quirks: { <cat>: { sources: [{url, origin}], heuristic } } } } }
 *   A quirk stays `heuristic: true` until it is seen in ≥2 distinct sources (hosts/repos).
 * Report: ONE comment on the tracking issue only for NEW quirks; neutral wording, no external
 *   project names and no external URLs in the comment (they stay in the artifact dataset).
 */
const fs = require('fs');
const path = require('path');

const RULES = [
  ['spurious-zero', /\b(?:spurious|random|sudden(?:ly)?|unexpected|occasional)\s+(?:zero|0)\b|\b(?:drops?|jumps?|goes|reports?|shows?)\s+(?:to\s+)?(?:zero|0)(?:\s+(?:randomly|sometimes|occasionally))?\b|\bfaux z[ée]ros?\b|\btombe [àa] (?:z[ée]ro|0)\b|\bspringt auf (?:null|0)\b|\bvalori? (?:a )?zero\b|\bvalores? (?:en )?cero\b|\bspringt naar 0\b/i],
  ['null-invalid', /\b(?:null|NaN|undefined|invalid value|invalid data|out of range|65535|0xffff|-?32768|garbage value)\b|\bvaleur (?:nulle|invalide|aberrante)\b|\bung[üu]ltige?r? wert\b|\bongeldige waarde\b|\bvalor inv[áa]lido\b/i],
  ['wrong-scaling', /\b(?:wrong|incorrect|bad)\s+(?:scal(?:e|ing)|factor|unit|multiplier|divisor)\b|\b(?:10|100|1000)\s*(?:x|times)\s+(?:too\s+)?(?:high|low|big|small)\b|\bfactor (?:of )?(?:10|100|1000)\b|\bdivided by (?:10|100|1000)\b|\bmauvaise? (?:[ée]chelle|unit[ée])\b|\bfacteur (?:10|100|1000)\b|\bfalsche? (?:skalierung|einheit)\b|\bverkeerde (?:schaal|eenheid)\b|\bescala incorrecta\b/i],
  ['reboot', /\b(?:reboots?|restarts?|resets?)\s+(?:itself|randomly|by itself|every|constantly|spontaneously)\b|\bboot ?loop\b|\bred[ée]marre (?:tout seul|en boucle|sans cesse)\b|\bstartet (?:st[äa]ndig|zuf[äa]llig) neu\b|\bherstart (?:vanzelf|steeds)\b|\bse reinicia\b|\bsi riavvia\b/i],
  ['overheat', /\b(?:overheat(?:s|ing)?|over-?temperature|gets? (?:very )?hot|too hot|burn(?:t|ed|ing) smell|melt(?:ed|ing)?)\b|\bsurchauffe\b|\bchauffe (?:beaucoup|trop)\b|\b[üu]berhitz\w*\b|\boververhit\w*\b|\bsobrecalient\w*\b|\bsurriscald\w*\b/i],
  ['over-reporting', /\b(?:floods?|flooding|spams?|spamming|too many|excessive|every (?:second|1 ?s))\s+(?:reports?|messages?|updates?|attribute reports?)\b|\breport(?:s|ing)? (?:too often|every second|constantly)\b|\binonde le r[ée]seau\b|\btrop de (?:rapports|messages)\b|\bzu viele (?:meldungen|nachrichten)\b|\bte veel (?:berichten|meldingen)\b|\bdemasiados (?:mensajes|reportes)\b/i],
  ['duplicate-report', /\b(?:duplicate[ds]?|double[ds]?|twice|repeated)\s+(?:reports?|events?|triggers?|messages?|presses?)\b|\b(?:triggers?|fires?) twice\b|\bdoublons?\b|\bd[ée]clench\w* deux fois\b|\bdoppelt?e? (?:meldung|ereignis|ausl[öo]s)\w*\b|\bdubbele (?:melding|events?)\b|\beventos? duplicados?\b/i],
  ['disconnect', /\b(?:disconnect(?:s|ed|ing)?|drops? off(?: the network)?|goes? offline|falls? off|unavailable|loses? connection|unreachable|leaves? the network)\b|\bse d[ée]connecte\b|\bhors ligne\b|\bperd la connexion\b|\bverbindung verl\w*\b|\bnicht erreichbar\b|\bverliest verbinding\b|\bse desconecta\b|\bsi disconnette\b/i],
];

function classify(text) {
  const t = String(text || '').slice(0, 100000);
  return RULES.filter(([, re]) => re.test(t)).map(([k]) => k);
}

const DB = process.env.QUIRKS_DB || '.github/state/quirks/quirks.json';
function load() { try { return JSON.parse(fs.readFileSync(DB, 'utf8')); } catch { return { schema: 1, pairs: {} }; } }
function save(db) { fs.mkdirSync(path.dirname(path.resolve(DB)), { recursive: true }); db.updatedAt = new Date().toISOString(); fs.writeFileSync(DB, JSON.stringify(db, null, 1)); }
const hostOf = (u) => { try { const x = new URL(u); return x.hostname === 'github.com' ? x.pathname.split('/').slice(1, 3).join('/') : x.hostname; } catch { return String(u).slice(0, 40); } };

/** Add evidence; returns list of { key, quirk, becameConfirmed, isNew }. */
function addEvidence(db, mfr, pid, quirks, url, origin) {
  const key = `${String(mfr).toLowerCase()}|${String(pid || '?').toUpperCase()}`;
  const e = db.pairs[key] || (db.pairs[key] = { quirks: {} });
  const out = [];
  for (const q of quirks) {
    const cur = e.quirks[q] || (e.quirks[q] = { sources: [], heuristic: true, firstSeen: new Date().toISOString() });
    const isNew = cur.sources.length === 0;
    if (cur.sources.some((s) => s.url === url) || cur.sources.length >= 8) continue;
    cur.sources.push({ url, origin, at: new Date().toISOString() });
    const distinct = new Set(cur.sources.map((s) => hostOf(s.url))).size;
    const was = cur.heuristic; cur.heuristic = distinct < 2;
    out.push({ key, quirk: q, isNew, becameConfirmed: was && !cur.heuristic });
  }
  return out;
}

module.exports = { classify, load, save, addEvidence, RULES, hostOf };
