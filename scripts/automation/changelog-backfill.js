'use strict';
/**
 * P3075 (t587u): backfill old .homeychangelog.json entries with granular en/fr notes.
 *
 * For every published version we look at the commits that landed between the previous version
 * bump and this one, keep the ones a user would notice (fix / feat / perf), and write a short
 * note in our own words: what kind of change, which device family, which model ids. Nothing is
 * copied from issues or forum posts — only our own commit subjects are read, and only topic words
 * and ids are kept from them. Versions are never added, removed or renumbered.
 *
 *   node scripts/automation/changelog-backfill.js --dry [--limit N] [--from 9.0.1500] [--to 9.0.1601]
 *   node scripts/automation/changelog-backfill.js --write --limit 200
 *   node scripts/automation/changelog-backfill.js --write --handwritten notes.json   (hand-written en/fr win)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const CE = require('./changelog-entry.js');

// Device families and areas: [pattern, en, fr]. Order = priority when a commit names several.
const TOPICS = [
  [/\b(trv|thermostat|radiator|heating|climate|setpoint)\b/i, 'thermostats', 'thermostats'],
  [/\b(radar|presence|mmwave|occupancy)\b/i, 'presence radars', 'radars de présence'],
  [/\b(pir|motion)\b/i, 'motion sensors', 'détecteurs de mouvement'],
  [/\b(curtain|cover|blind|shutter|roller|window covering)\b/i, 'curtains and blinds', 'rideaux et volets'],
  [/\b(smoke|co2?|gas|leak|water.?leak|flood)\b/i, 'safety sensors', 'détecteurs de sécurité'],
  [/\b(door|contact|window sensor)\b/i, 'door and window sensors', 'capteurs d\'ouverture'],
  [/\b(button|remote|scene|knob|switch_?wireless|wireless)\b/i, 'buttons and remotes', 'boutons et télécommandes'],
  [/\b(plug|socket|outlet)\b/i, 'smart plugs', 'prises connectées'],
  [/\b(energy|power meter|metering|kwh|din|rcbo|breaker)\b/i, 'energy meters', 'compteurs d\'énergie'],
  [/\b(dimmer|bulb|light|led|rgb|strip|lamp)\b/i, 'lights and dimmers', 'éclairages et variateurs'],
  [/\b(switch|relay|gang)\b/i, 'wall switches', 'interrupteurs'],
  [/\b(valve|irrigation|garden)\b/i, 'valves', 'vannes'],
  [/\b(temp|humidity|climate sensor|lcd|soil|lux|illuminance)\b/i, 'climate sensors', 'capteurs d\'ambiance'],
  [/\b(siren|alarm)\b/i, 'sirens', 'sirènes'],
  [/\b(door ?lock|smart lock|doorbell)\b/i, 'locks', 'serrures'],
  [/\b(fan|air purifier|dehumid)\b/i, 'fans and air purifiers', 'ventilateurs et purificateurs'],
  [/\b(wi-?fi|tuya-local|tuya local|ewelink|sonoff lan|lan)\b/i, 'Wi-Fi devices', 'appareils Wi-Fi'],
  [/\b(ir|infrared)\b/i, 'IR remotes', 'télécommandes IR'],
  [/\b(battery|batter)\b/i, 'battery reporting', 'niveau de batterie'],
  [/\b(pair|pairing|interview|fingerprint|couple|manufacturer|mfr)\b/i, 'pairing and device recognition', 'appairage et reconnaissance des appareils'],
  [/\b(flow|trigger|condition|action card)\b/i, 'Flow cards', 'cartes Flow'],
  [/\b(setting|settings|calibration|offset)\b/i, 'device settings', 'réglages des appareils'],
  [/\b(crash|exception|unhandled|typeerror|null)\b/i, 'crash fixes', 'plantages'],
  [/\b(memory|leak|timer|heap|cache)\b/i, 'memory and timers', 'mémoire et minuteries'],
  [/\b(repair)\b/i, 'the Repair screen', 'l\'écran Réparer'],
  [/\b(translation|i18n|locale|title|titles)\b/i, 'translations', 'traductions'],
];
const KIND = {
  fix: ['Fixed', 'Corrigé'],
  feat: ['New', 'Nouveau'],
  perf: ['Faster', 'Plus rapide'],
};
const SKIP_TYPES = /^(chore|ci|style|test|tests|docs|build|refactor|revert|merge|wip)\b/i;
const MODEL_RE = /\b(TS\d{4}[A-Z]?|TS\d{3}F|ZG-\d{3}[A-Z]*|SNZB-\d{2}[A-Z]?|TRV\d{2,3}|MTG\d{3}|ZY-M100|SPM\d{2}V\d(?:-GT)?)\b/g;

/** One commit subject → null (internal) or { kind, topics: [[en, fr]], models: [] }. */
function classify(subject) {
  const s = String(subject || '').trim();
  if (!s || SKIP_TYPES.test(s) || /^v\d+\.\d+\.\d+\b/.test(s) || /\[auto:/.test(s)) return null;
  const m = s.match(/^(fix|feat|perf)\b/i);
  const kind = m ? m[1].toLowerCase() : (/\b(fix|fixed|restore|repair|guard against)\b/i.test(s) ? 'fix' : (/\b(add|added|new|support)\b/i.test(s) ? 'feat' : null));
  if (!kind) return null;
  // Our own subject minus refs: ticket ids, run ids, forum/issue numbers are not user information.
  const clean = s.replace(/^[a-z]+(\([^)]*\))?!?:\s*/i, '').replace(/\((?:forum|run|GH|issue|PR|#)[^)]*\)/gi, ' ').replace(/\bP\d{3,5}[a-z0-9-]*\b/g, ' ');
  const topics = [];
  for (const [re, en, fr] of TOPICS) if (re.test(clean) && topics.length < 2) topics.push([en, fr]);
  const models = [...new Set((clean.match(MODEL_RE) || []).map((x) => x.toUpperCase()))].slice(0, 3);
  return { kind, topics, models };
}

function joinList(items, lang) {
  if (items.length <= 1) return items.join('');
  const and = lang === 'fr' ? ' et ' : ' and ';
  return items.slice(0, -1).join(', ') + and + items[items.length - 1];
}

/** Commit subjects of one version → { en, fr } in our own words. */
function describe(subjects, { max = 4 } = {}) {
  const groups = { fix: new Map(), feat: new Map(), perf: new Map() };
  let internal = 0;
  for (const s of subjects || []) {
    const c = classify(s);
    if (!c) { internal++; continue; }
    const key = c.topics.length ? c.topics[0][0] : '';
    const g = groups[c.kind];
    const cur = g.get(key) || { topic: c.topics[0] || null, models: new Set(), n: 0 };
    c.models.forEach((x) => cur.models.add(x));
    cur.n++;
    g.set(key, cur);
  }
  const parts = { en: [], fr: [] };
  let shown = 0, hidden = 0;
  for (const kind of ['feat', 'fix', 'perf']) {
    const items = { en: [], fr: [] };
    for (const [, v] of groups[kind]) {
      // Nothing a user can name (no device family, no model): counted, not listed.
      if (shown >= max || (!v.topic && !v.models.size)) { hidden += v.n; continue; }
      shown++;
      const ids = v.models.size ? ` (${[...v.models].slice(0, 3).join(', ')})` : '';
      items.en.push((v.topic ? v.topic[0] : 'general reliability') + ids);
      items.fr.push((v.topic ? v.topic[1] : 'fiabilité générale') + ids);
    }
    if (items.en.length) {
      parts.en.push(`${KIND[kind][0]}: ${joinList(items.en, 'en')}.`);
      parts.fr.push(`${KIND[kind][1]} : ${joinList(items.fr, 'fr')}.`);
    }
  }
  if (!parts.en.length && hidden) {
    parts.en.push(`Reliability: ${hidden} small fix${hidden > 1 ? 'es' : ''} in the app core.`);
    parts.fr.push(`Fiabilité : ${hidden} petite${hidden > 1 ? 's' : ''} correction${hidden > 1 ? 's' : ''} dans le cœur de l'app.`);
    hidden = 0;
  }
  if (!parts.en.length) {
    return {
      en: 'Maintenance build: same devices and behaviour as the previous version (publishing and test tooling only).',
      fr: 'Version de maintenance : mêmes appareils et même comportement que la précédente (outils de publication et de test uniquement).',
    };
  }
  if (hidden) { parts.en.push(`Plus ${hidden} other change${hidden > 1 ? 's' : ''} in the app core.`); parts.fr.push(`Et ${hidden} autre${hidden > 1 ? 's' : ''} changement${hidden > 1 ? 's' : ''} dans le cœur de l'app.`); }
  if (internal) { parts.en.push('Behind the scenes: tests and publishing checks.'); parts.fr.push('En coulisses : tests et contrôles de publication.'); }
  return { en: parts.en.join(' '), fr: parts.fr.join(' ') };
}

// A version bump commit, by its subject: "v9.0.1601: 459 drivers", "chore(stable): v5.12.511",
// "release: v1.0.42", "source manifests 9.0.1571 -> 9.0.1574".
const BUMP_RE = [/^v(\d+\.\d+\.\d+)[:\s]/, /^(?:chore|release|build)(?:\([^)]*\))?:\s*v?(\d+\.\d+\.\d+)\b/i, /source manifests [\d.]+ -> (\d+\.\d+\.\d+)/];
function bumpOf(subject) {
  for (const re of BUMP_RE) { const m = String(subject).match(re); if (m) return m[1]; }
  return null;
}

/** Version -> our commit subjects since the previous bump (tags first, then bump subjects). */
function versionRanges(cwd = process.cwd(), { maxCommits = 40000 } = {}) {
  const git = (args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const tagAt = new Map();
  for (const line of git(['for-each-ref', '--format=%(objectname) %(*objectname) %(refname:short)', 'refs/tags']).split('\n')) {
    const [obj, peeled, name] = line.split(' ');
    const m = name && name.match(/^v?(\d+\.\d+\.\d+)$/);
    if (m) tagAt.set(peeled || obj, m[1]);
  }
  const ranges = new Map();
  let acc = [];
  for (const line of git(['log', '--first-parent', '--reverse', '-n', String(maxCommits), '--format=%H\t%s']).split('\n')) {
    if (!line) continue;
    const i = line.indexOf('\t');
    const h = line.slice(0, i), s = line.slice(i + 1);
    acc.push(s);
    const v = tagAt.get(h) || bumpOf(s);
    if (v && !ranges.has(v)) { ranges.set(v, acc); acc = []; }
  }
  return ranges;
}

/** An entry worth rewriting: placeholder, vague one-liner, or a copy of the previous version's text. */
function needsRewrite(entry, prevEntry) {
  const en = entry && typeof entry === 'object' ? entry.en : entry;
  if (!en || CE.isPlaceholder(en)) return 'placeholder';
  if (/^(Device fixes and improvements|Stability improvements|Reliability improvements|Maintenance release|Various|Minor)/i.test(en) || en.length < 40) return 'vague';
  const prevEn = prevEntry && typeof prevEntry === 'object' ? prevEntry.en : prevEntry;
  if (prevEn && prevEn === en) return 'duplicate';
  if (typeof entry === 'object' && !entry.fr) return 'no-fr';
  return null;
}

/** Rewrite in place (bounded by limit). Human English we wrote earlier is kept; only fr is added. */
function backfill(obj, ranges, { limit = Infinity, from = null, to = null } = {}) {
  const keys = Object.keys(obj).filter((k) => /^\d+\.\d+\.\d+$/.test(k)).sort(CE.cmpVer);
  const changes = [];
  for (let i = 0; i < keys.length && changes.length < limit; i++) {
    const v = keys[i];
    if (from && CE.cmpVer(v, from) < 0) continue;
    if (to && CE.cmpVer(v, to) > 0) continue;
    const why = needsRewrite(obj[v], obj[keys[i - 1]]);
    if (!why) continue;
    const subjects = ranges.get(v);
    if (!subjects) continue; // no bump commit on this branch: leave it, never guess
    const gen = describe(subjects);
    const before = obj[v];
    obj[v] = why === 'no-fr' ? { en: before.en, fr: gen.fr } : gen;
    changes.push({ version: v, why, before, after: obj[v] });
  }
  return changes;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const file = path.join(process.cwd(), '.homeychangelog.json');
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ranges = versionRanges(process.cwd());
  // Hand-written notes (our own words) win over the generator; only for versions already listed.
  const hw = opt('--handwritten') ? JSON.parse(fs.readFileSync(opt('--handwritten'), 'utf8')) : {};
  const manual = [];
  for (const [v, e] of Object.entries(hw)) {
    if (!obj[v] || !e || !e.en || !e.fr) continue;
    manual.push({ version: v, why: 'handwritten', before: obj[v], after: e });
    obj[v] = { en: e.en, fr: e.fr };
  }
  const changes = manual.concat(backfill(obj, ranges, { limit: Number(opt('--limit')) || Infinity, from: opt('--from'), to: opt('--to') }));
  if (args.includes('--write')) fs.writeFileSync(file, JSON.stringify(CE.orderChangelog(obj), null, 2) + '\n');
  if (args.includes('--json')) console.log(JSON.stringify(changes, null, 2));
  else console.log(`${changes.length} entr${changes.length === 1 ? 'y' : 'ies'} ${args.includes('--write') ? 'rewritten' : 'to rewrite'} (${ranges.size} versions mapped to commits)`);
}

module.exports = { classify, describe, versionRanges, bumpOf, needsRewrite, backfill, TOPICS };
