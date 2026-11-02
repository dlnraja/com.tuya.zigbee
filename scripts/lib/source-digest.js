'use strict';
// P3138 (t734u/t735u/t736u): shared structured digest for EVERY source reader (forum, Gmail/diag triage,
// issues/PR triage, upstream-watch, Johan/forks, KB refresh, enrich, crash-triage, upstream thread miner).
// Deterministic, no AI. External text is DATA ONLY: never executed, never followed, sanitized + capped.
// Privacy (t736u): only technical facts survive (mfr, pid, DP, clusters, firmware). Usernames (unless
// credit), IEEE, emails, Homey ids, rooms, device names, schedules, routine times, presence, locations are
// replaced with context-preserving placeholders. Behaviour patterns are never inferred or stored.
// assertClean() fails closed (throws) — callers must not write a digest that does not pass it.
// Same classes as tools/ci/house-data-guard.js (P3120); inlined so branches without that tool still load.
let IEEE_RE = /\b(?!(?:00:){7}00\b)(?:[0-9a-f]{2}:){7}[0-9a-f]{2}\b/gi;
let ROOM_RE = /\b(salon|cuisine|chambres?|sous[ -]sol|salle de bains?|salle a manger|salle à manger|s[ée]jour|buanderie|cellier|grenier|v[ée]randa|entr[ée]e principale|chambre principale?|bureau de bastien)\b/gi;
try { ({ IEEE_RE, ROOM_RE } = require('../../tools/ci/house-data-guard')); } catch (_e) { /* inline fallback */ }

const MAX_FIELD = 280;
const MFR_RE = /\b_T[A-Za-z0-9]{2,5}_[A-Za-z0-9]{4,16}\b/g;
const PID_RE = /\b(TS[0-9]{3,4}[A-Z]?|ZG-[0-9]{3}[A-Z0-9-]*)\b/g;
const DP_RE = /\bDP\s?(?:id)?\s?[#:=]?\s?(\d{1,3})\b/gi;
const CLUSTER_RE = /\b0x(E000|E001|EF00|FC[0-9A-F]{2}|0[0-9A-F]{3})\b/gi;
const FW_RE = /\b(?:appVersion|swBuildId|firmware(?: version)?|fw)\s*[:=]?\s*v?([0-9][0-9A-Za-z._-]{0,15})\b/gi;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const HOMEY_RE = /\b(?:homey|cloud|zone|flow|user|boot)Id\b\s*["']?\s*[:=]\s*["']?[0-9a-f-]{16,}["']?|\bhomey-[0-9a-f]{24}\b|\b[0-9a-f]{24}\b/gi;
const MENTION_RE = /(^|[^\w`])@([A-Za-z0-9][A-Za-z0-9-]{0,38})\b/g;
const GEO_RE = /-?\b\d{1,2}\.\d{4,},\s*-?\d{1,3}\.\d{4,}\b/g;
const TIME_RE = /\b(?:[01]?\d|2[0-3])[:h][0-5]\d\b|\b(?:1[0-2]|0?[1-9])\s?(?:am|pm)\b/gi;
const ROUTINE_RE = /\b(every|each|chaque|tous les)\s+(morning|evening|night|day|weekday|weekend|matin|soir|nuit|jour|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b|\b(when (?:i|we) (?:leave|come home|go to (?:bed|sleep)|wake up|arrive)|quand (?:je|on) (?:pars|rentre|me couche|me l[eè]ve)|(?:i|we) (?:am|are) (?:away|home|on holiday|on vacation)|(?:je suis|nous sommes) (?:absents?|en vacances|à la maison))\b/gi;
// P3224: "garage" followed by a device-type word (garage door / opener / gate / DPn) is a Tuya product
// category (TS0603 garage door controller), not a room of the user's house; every other use still matches.
const ROOM_EN_RE = /\b(living ?room|kitchen|bedroom|kids'? room|bathroom|garage(?![ -]?(?:doors?|openers?|gates?|DP\s?\d))|basement|attic|hallway|nursery|office of \w+)\b/gi;
// P3224 (KB refresh 41447782455): upstream device facts that only LOOK like private classes. Masked before
// the leak check (never stored differently): Z2M/ZHA converter enum maps ("lookup:{...}" lists the
// device's own scene names such as "kitchen") and Shelly model tokens ("Shelly|1PM", "1PM Gen4"),
// which TIME_RE would read as 1 pm. Narrow and case-sensitive on purpose.
const UPSTREAM_FACT_RES = [/\blookup:\{[^{}\n]{0,2000}\}/g, /(?<=Shelly[ |](?:Plus ?|Pro ?|Mini ?)?)[1-4]PM\b/g, /\b[1-4]PM(?= ?(?:Mini |Plus |Pro )?Gen ?\d)/g];
function maskUpstreamFacts(s) { let out = String(s); for (const re of UPSTREAM_FACT_RES) { re.lastIndex = 0; out = out.replace(re, '[upstream-fact]'); } return out; }
const DEVNAME_RE = /["“]([^"”\n]{2,40})["”]\s*(?:device|sensor|switch|plug|capteur|prise|interrupteur)/gi;
const IEEE_LOOSE = /\b0x[0-9a-f]{16}\b|\b(?:[0-9a-f]{2}:){7}[0-9a-f]{2}\b/gi;

function sanitize(text, cap = 20000) {
  return String(text == null ? '' : text)
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .slice(0, cap);
}

/** Context-preserving redaction. credit = set of logins allowed (authors credited in CREDITS.md). */
function redact(text, credit = new Set()) {
  const ieee = new Map(); const users = new Map(); const rooms = new Map();
  const tag = (m, k, label) => { if (!m.has(k)) m.set(k, label(m.size)); return m.get(k); };
  const L = (n) => String.fromCharCode(65 + (n % 26));
  return sanitize(text)
    .replace(EMAIL_RE, '[email]')
    .replace(HOMEY_RE, '[homey-id]')
    .replace(IEEE_LOOSE, (m) => tag(ieee, m.toLowerCase(), (n) => `[IEEE-${n + 1}]`))
    .replace(IEEE_RE, (m) => tag(ieee, m.toLowerCase(), (n) => `[IEEE-${n + 1}]`))
    .replace(GEO_RE, '[lieu]')
    .replace(ROUTINE_RE, '[habitude]')
    .replace(TIME_RE, (m, off, str) => { if (/^[1-4]PM$/.test(m) && (/Shelly[ |](?:Plus ?|Pro ?|Mini ?)?$/.test(str.slice(Math.max(0, off - 12), off)) || /^ ?(?:Mini |Plus |Pro )?Gen ?\d/.test(str.slice(off + m.length, off + m.length + 12)))) return m;
      const h = parseInt(m, 10); const pm = /pm/i.test(m);
      const hh = pm && h < 12 ? h + 12 : h; return hh >= 18 || hh < 5 ? '[soirée]' : hh < 12 ? '[matinée]' : '[après-midi]'; })
    .replace(ROOM_RE, (m) => tag(rooms, m.toLowerCase(), (n) => `[pièce ${L(n)}]`))
    .replace(ROOM_EN_RE, (m) => tag(rooms, m.toLowerCase(), (n) => `[pièce ${L(n)}]`))
    .replace(DEVNAME_RE, (m) => m.replace(/["“][^"”]+["”]/, '"[nom appareil]"'))
    .replace(MENTION_RE, (m, pre, u) => (credit.has(u.toLowerCase()) ? m : `${pre}${tag(users, u.toLowerCase(), (n) => `[user-${n + 1}]`)}`));
}

const uniq = (a) => [...new Set(a)];
function facts(text) {
  const t = String(text || '');
  return {
    mfrs: uniq((t.match(MFR_RE) || []).map((s) => s.toLowerCase())).slice(0, 40),
    pids: uniq(t.match(PID_RE) || []).slice(0, 20),
    dps: uniq([...t.matchAll(DP_RE)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 256)).sort((a, b) => a - b).slice(0, 40),
    clusters: uniq((t.match(CLUSTER_RE) || []).map((s) => '0x' + s.slice(2).toUpperCase())).slice(0, 20),
    firmware: uniq([...t.matchAll(FW_RE)].map((m) => m[1])).slice(0, 10),
  };
}

const sentences = (t) => String(t || '').replace(/```[\s\S]*?```/g, ' ').split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 12);
const pick = (ss, re) => { const s = ss.find((x) => re.test(x)); return s ? s.slice(0, MAX_FIELD) : null; };
const CAUSE = /root cause|caused by|because|the (?:issue|problem) is|turns out|due to|cause:/i;
const RESOL = /\bfix(?:ed|es)? (?:in|by)\b|resolved|workaround|merged|solution|solved|now works|fonctionne/i;
const REGR = /regress|broke|breaks|stopped working|after (?:the )?update|since v?\d/i;
const ADOPT = /\b(?:should|must|need to|recommend|use|send|bind|write|configure|set)\b.*\b(?:attribute|cluster|dp|command|magic|bind|report|0x)/i;
const AVOID = /\b(?:do not|don't|never|avoid|should not|must not|drains?|kills? battery)\b/i;

function status(meta) {
  if (meta.merged) return 'merged';
  if (meta.state === 'closed') return /not planned|wontfix|stale|invalid|duplicate/i.test((meta.labels || []).join(' ') + ' ' + (meta.stateReason || '')) ? 'closed-unresolved' : 'closed-resolved';
  return 'open';
}

/**
 * build({source, url, title, body, comments[], state, stateReason, merged, labels[], linked[], authors[], credit[]}, ledger?)
 * ledger = parsed data/ssot/couple-sources.json (optional) to map couples -> drivers.
 */
function build(input, ledger) {
  const credit = new Set((input.credit || []).map((s) => String(s).toLowerCase()));
  const rawAll = [input.title, input.body, ...(input.comments || [])].map((x) => sanitize(x)).join('\n');
  const f = facts(rawAll);
  const ss = sentences(redact(rawAll, credit));
  const couples = [];
  for (const m of f.mfrs) for (const p of f.pids) { const k = `${m}|${p}`; if (!ledger || (ledger.couples && ledger.couples[k])) couples.push(k); }
  const drivers = uniq(couples.flatMap((k) => (ledger && ledger.couples && ledger.couples[k] && ledger.couples[k].drivers) || []));
  const d = {
    v: 1,
    source: String(input.source || 'unknown').slice(0, 60),
    url: String(input.url || '').slice(0, 200),
    title: redact(input.title || '', credit).slice(0, 160),
    labels: (input.labels || []).map(String).slice(0, 10),
    status: status(input),
    linked: (input.linked || []).map(String).filter((u) => /^https:\/\/github\.com\//.test(u)).slice(0, 10),
    problem: (ss[0] || null),
    cause: pick(ss, CAUSE),
    resolution: pick(ss, RESOL),
    implications: { couples: couples.slice(0, 30), drivers, dps: f.dps, clusters: f.clusters, firmware: f.firmware, pids: f.pids },
    adopt: pick(ss.filter((s) => !AVOID.test(s)), ADOPT),
    avoid: pick(ss, AVOID),
    regressions: pick(ss, REGR),
    credit: [...credit].slice(0, 10),
    ai: null,
  };
  d.candidateTasks = candidateTasks(d);
  return d;
}

function candidateTasks(d) {
  const out = [];
  if (!d.implications.couples.length && !d.implications.pids.length) return out;
  const tgt = d.implications.couples.join(', ') || d.implications.pids.join(', ');
  if (d.adopt) out.push({ kind: 'adopt', target: tgt, hint: d.adopt, url: d.url });
  if (d.avoid) out.push({ kind: 'avoid', target: tgt, hint: d.avoid, url: d.url });
  if (d.regressions) out.push({ kind: 'watch-regression', target: tgt, hint: d.regressions, url: d.url });
  if (d.status !== 'open' && d.resolution) out.push({ kind: 'verify-resolution', target: tgt, hint: d.resolution, url: d.url });
  return out.slice(0, 4);
}

/** Optional AI summary: accepted only as a capped, redacted string; never alters facts. */
function attachAi(d, summary) {
  if (typeof summary !== 'string') return d;
  const s = redact(summary).slice(0, 400);
  if (/ignore (?:all|previous)|system prompt|you are|<\/?script/i.test(s)) return d;
  return Object.assign({}, d, { ai: s });
}

const LEAK_CHECKS = [
  ['email', EMAIL_RE], ['ieee', IEEE_LOOSE], ['homey-id', HOMEY_RE], ['geo', GEO_RE], ['routine', ROUTINE_RE],
  ['time', TIME_RE], ['room-fr', ROOM_RE], ['room-en', ROOM_EN_RE],
];
/** Fail closed: throws if any private class survives. Returns the object when clean. */
function assertClean(obj) {
  const s = maskUpstreamFacts(typeof obj === 'string' ? obj : JSON.stringify(obj));
  const hits = [];
  for (const [k, re] of LEAK_CHECKS) { re.lastIndex = 0; if (re.test(s)) hits.push(k); re.lastIndex = 0; }
  if (hits.length) { const e = new Error(`source-digest privacy guard: ${hits.join(',')}`); e.code = 'PRIVACY_LEAK'; throw e; }
  return obj;
}

function toMarkdown(d) {
  const L = (k, v) => `- **${k}:** ${v == null || (Array.isArray(v) && !v.length) ? '—' : Array.isArray(v) ? v.join(', ') : v}`;
  return [`### ${d.title || d.url}`, '', L('Source', `${d.source} — ${d.url}`), L('Status', d.status), L('Labels', d.labels),
    L('Problem', d.problem), L('Root cause', d.cause), L('Resolution', d.resolution), L('Couples', d.implications.couples),
    L('Drivers', d.implications.drivers), L('DPs', d.implications.dps), L('Clusters', d.implications.clusters),
    L('Firmware', d.implications.firmware), L('Adopt', d.adopt), L('Avoid', d.avoid), L('Regressions to watch', d.regressions),
    L('Linked', d.linked), L('Credit', d.credit), ''].join('\n');
}

module.exports = { build, redact, sanitize, facts, assertClean, attachAi, candidateTasks, toMarkdown, maskUpstreamFacts };
