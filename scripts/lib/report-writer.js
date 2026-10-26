'use strict';
/**
 * scripts/lib/report-writer.js — one small, dependency-free way to write CI reports (P3069).
 *
 * Why: our ~90 workflows each grew their own summary style (emoji walls, pasted issue titles,
 * forum excerpts, raw JSON). A reader should get the gist in two sentences, see the numbers in
 * one small table, and open the rest only if they care. Third-party text is never pasted: we
 * point at it (name, #id, link, @author) and say in our own words what it is about.
 *
 * Shape of every report (checked by scripts/ci/report-structure-ratchet.js):
 *   <!-- report-writer:v1 lang=xx -->
 *   ### Title
 *   One or two plain sentences.
 *   | small | table |
 *   <details><summary>…</summary> … </details>   (optional, collapsed)
 *   **Sources** (optional) — "source: [name #id](link) by @author — about: <our own topic words>"
 *   **Thanks** / **Merci** — who or what made this run possible
 *
 * Idea credits (rewritten, not copied): GitHub's own job-summary docs ("keep it short, markdown,
 * tables"), the collapsed-details habit common in Renovate / Dependabot PR bodies, and the
 * "link, don't quote" etiquette of the Homey Community forum and Zigbee2MQTT issue tracker.
 *
 * Node >= 18 built-ins only. No network, no AI. Optional AI rewording is NOT done here: callers
 * may pass an already reworded string, but every report must read fine without it.
 */
const fs = require('fs');

const MARK = 'report-writer:v1';
const DEFAULT_MAX_CHARS = 60000; // GitHub caps a step summary at 1 MiB; we stay far below on purpose
const DEFAULT_MAX_ROWS = 25;
const DEFAULT_VERBATIM_WORDS = 12; // a run of 12+ identical words from a fetched source = pasted text

const T = {
  en: { thanks: 'Thanks', sources: 'Sources', details: 'Details', more: 'more rows not shown', about: 'about', by: 'by', source: 'source', rewritten: 'text not reproduced — see the link, summary in our words pending', truncated: 'report truncated to stay readable' },
  fr: { thanks: 'Merci', sources: 'Sources', details: 'Détails', more: 'lignes de plus non affichées', about: 'sujet', by: 'par', source: 'source', rewritten: 'texte non reproduit — voir le lien, résumé à reformuler', truncated: 'rapport tronqué pour rester lisible' },
};

// Emoji: keep words, drop pictographs (status is said in words: OK / échec / ignoré).
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
function stripEmoji(s) { return String(s == null ? '' : s).replace(EMOJI_RE, '').replace(/[ \t]{2,}/g, ' ').trim(); }

/** Markdown-safe single-line cell. */
function cell(v) {
  if (v == null) return '';
  return stripEmoji(String(v)).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').slice(0, 160);
}

/** Count sentences roughly (., !, ? followed by space/end). */
function sentenceCount(s) { return (String(s).trim().match(/[.!?](\s|$)/g) || []).length || (String(s).trim() ? 1 : 0); }

// ── Deterministic "what is it about" — built from a fixed vocabulary, so it can never echo
// someone's sentence. Identifiers (manufacturer / model ids) are facts, not prose.
const VOCAB = [
  [/\bthermostat|\btrv\b|radiator|valve head|heating/i, { en: 'thermostat', fr: 'thermostat' }],
  [/\bcurtain|blind|shutter|roller|cover\b|volet/i, { en: 'cover', fr: 'volet' }],
  [/\bplug|socket|outlet|prise/i, { en: 'plug', fr: 'prise' }],
  [/\bswitch|relay|gang|interrupteur/i, { en: 'switch', fr: 'interrupteur' }],
  [/\bbutton|remote|scene|knob|télécommande|bouton/i, { en: 'button', fr: 'bouton' }],
  [/\bbulb|light|led|dimmer|lamp|ampoule|lumi/i, { en: 'light', fr: 'lumière' }],
  [/\bmotion|presence|pir|radar|mmwave|occupancy|présence|mouvement/i, { en: 'presence', fr: 'présence' }],
  [/\btemperature|humidity|th sensor|température|humidité/i, { en: 'climate sensor', fr: 'capteur climat' }],
  [/\bsmoke|co\b|gas|leak|water|fumée|fuite/i, { en: 'safety sensor', fr: 'capteur sécurité' }],
  [/\bcontact|door|window|porte|fenêtre/i, { en: 'contact', fr: 'contact' }],
  [/\benergy|power|kwh|metering|consumption|énergie|puissance/i, { en: 'energy', fr: 'énergie' }],
  [/\bbattery|batterie/i, { en: 'battery', fr: 'batterie' }],
  [/\bflow|trigger|card|carte/i, { en: 'flow cards', fr: 'cartes Flow' }],
  [/\bpair|interview|appair/i, { en: 'pairing', fr: 'appairage' }],
  [/\bcrash|error|exception|fail|plant|erreur/i, { en: 'error', fr: 'erreur' }],
  [/\bwi-?fi|tuya local|localkey|lan\b/i, { en: 'Wi-Fi local', fr: 'Wi-Fi local' }],
  [/\bfeature|request|support|add\b|ajout|demande/i, { en: 'request', fr: 'demande' }],
];
const MFR_RE = /\b_T[A-Z0-9]{2,6}_[a-z0-9]{8}\b/g;
const PID_RE = /\bT[SY]\d{3,4}[A-Z0-9_]*\b/g;

function topicOf(text, lang = 'en') {
  const s = String(text || '');
  const tags = [];
  for (const [re, lab] of VOCAB) if (re.test(s) && !tags.includes(lab[lang] || lab.en)) tags.push(lab[lang] || lab.en);
  const ids = [...new Set([...(s.match(MFR_RE) || []), ...(s.match(PID_RE) || [])])].slice(0, 3);
  const parts = [];
  if (tags.length) parts.push(tags.slice(0, 3).join(', '));
  if (ids.length) parts.push(ids.map((x) => '`' + x + '`').join(' '));
  return parts.join(' — ') || (lang === 'fr' ? 'non classé' : 'unclassified');
}

/** "source: [name #id](url) by @author — about: …" — never the source's own words. */
function sourceRef({ name, id, url, author, text, about } = {}, lang = 'en') {
  const L = T[lang] || T.en;
  const label = `${name || 'source'}${id != null && id !== '' ? ' #' + id : ''}`;
  let s = `${L.source}: ${url ? `[${label}](${url})` : label}`;
  if (author) s += ` ${L.by} @${String(author).replace(/^@/, '')}`;
  const topic = about || (text != null ? topicOf(text, lang) : '');
  if (topic) s += ` — ${L.about}: ${stripEmoji(topic)}`;
  return s;
}

// ── Verbatim detector: finds runs of >= n consecutive words shared with a fetched source.
function words(s) { return String(s || '').toLowerCase().replace(/<[^>]+>/g, ' ').match(/[\p{L}\p{N}_'-]+/gu) || []; }
function shingles(ws, n) { const set = new Set(); for (let i = 0; i + n <= ws.length; i++) set.add(ws.slice(i, i + n).join(' ')); return set; }

/**
 * findVerbatim(text, sources, n) → [{ start, end, words }] word-index ranges of `text` that
 * repeat >= n consecutive words of any source. Bounded: sources are capped at 200 KB total.
 */
function findVerbatim(text, sources = [], n = DEFAULT_VERBATIM_WORDS) {
  let budget = 200000; const pool = new Set();
  for (const src of sources) { if (budget <= 0) break; const s = String(src || '').slice(0, budget); budget -= s.length; for (const g of shingles(words(s), n)) pool.add(g); }
  if (!pool.size) return [];
  const toks = tokens(text); const ws = toks.map((t) => t.w); const hits = [];
  for (let i = 0; i + n <= ws.length; i++) {
    if (pool.has(ws.slice(i, i + n).join(' '))) {
      const last = hits[hits.length - 1];
      if (last && i <= last.end) last.end = i + n; else hits.push({ start: i, end: i + n });
    }
  }
  return hits.map((h) => ({ ...h, words: h.end - h.start, from: toks[h.start].a, to: toks[h.end - 1].b }));
}
/** Tokens with character offsets in the ORIGINAL string (no HTML stripping, so offsets stay exact). */
function tokens(s) { const out = []; const re = /[\p{L}\p{N}_'-]+/gu; let m; const str = String(s || ''); while ((m = re.exec(str))) out.push({ w: m[0].toLowerCase(), a: m.index, b: m.index + m[0].length }); return out; }

/**
 * Heuristic, source-free: markdown blockquotes and long quoted strings are the usual way a pasted
 * excerpt sneaks into a report. Returns the offending lines (>= n words inside quotes/blockquote).
 */
function findQuotedExcerpts(md, n = DEFAULT_VERBATIM_WORDS) {
  const out = [];
  const lines = String(md || '').split('\n');
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    const bq = line.match(/^\s*>\s?(.*)$/);
    if (bq && words(bq[1]).length >= n) out.push({ line: i + 1, kind: 'blockquote', words: words(bq[1]).length });
    for (const m of line.matchAll(/[“"«]([^"”»]{20,})[”"»]/g)) if (words(m[1]).length >= n) out.push({ line: i + 1, kind: 'quote', words: words(m[1]).length });
  });
  return out;
}

/**
 * sanitize(text, { sources, n, lang }) → { text, replaced } — replaces each verbatim run (and
 * long quoted / blockquoted excerpts) by a neutral placeholder. Deterministic, no AI.
 */
function sanitize(text, { sources = [], n = DEFAULT_VERBATIM_WORDS, lang = 'en' } = {}) {
  const L = T[lang] || T.en;
  const ph = `_(${L.rewritten})_`;
  let out = String(text || ''); let replaced = 0;
  // 1) quotes / blockquotes, source-free
  out = out.split('\n').map((line) => {
    const bq = line.match(/^(\s*)>\s?(.*)$/);
    if (bq && words(bq[2]).length >= n) { replaced++; return `${bq[1]}${ph}`; }
    return line.replace(/[“"«]([^"”»]{20,})[”"»]/g, (m, inner) => (words(inner).length >= n ? (replaced++, ph) : m));
  }).join('\n');
  // 2) runs shared with fetched sources
  if (sources.length) {
    const hits = findVerbatim(out, sources, n);
    if (hits.length) {
      for (const h of hits.slice().reverse()) { out = out.slice(0, h.from) + ph + out.slice(h.to); replaced++; }
    }
  }
  return { text: out, replaced };
}

// ── Builder
class Report {
  constructor({ title, lang = 'en', summary = '', maxChars = DEFAULT_MAX_CHARS, maxRows = DEFAULT_MAX_ROWS, sources = [] } = {}) {
    if (!title) throw new Error('report-writer: title required');
    this.lang = T[lang] ? lang : 'en';
    this.L = T[this.lang];
    this.title = stripEmoji(title);
    this._summary = '';
    this.maxChars = maxChars; this.maxRows = maxRows;
    this.fetched = sources; // raw third-party text we read this run (used only to detect pasting)
    this.blocks = []; this.refs = []; this.credits = [];
    if (summary) this.summary(summary);
  }
  summary(s) {
    const clean = stripEmoji(String(s).replace(/\s+/g, ' ').trim());
    // keep it to two sentences: anything longer moves into details
    const parts = clean.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [clean];
    this._summary = parts.slice(0, 2).join('').trim();
    if (parts.length > 2) this.details(this.L.details, [parts.slice(2).join('').trim()]);
    return this;
  }
  table(headers, rows) {
    const H = headers.map(cell);
    const R = (rows || []).slice(0, this.maxRows).map((r) => (Array.isArray(r) ? r : headers.map((h) => r[h])).map(cell));
    let md = `| ${H.join(' | ')} |\n| ${H.map(() => '---').join(' | ')} |\n` + R.map((r) => `| ${r.join(' | ')} |`).join('\n');
    if ((rows || []).length > this.maxRows) md += `\n\n_${rows.length - this.maxRows} ${this.L.more}_`;
    this.blocks.push(md); return this;
  }
  details(label, lines) {
    const body = (Array.isArray(lines) ? lines : [lines]).map((l) => String(l)).join('\n');
    this.blocks.push(`<details><summary>${stripEmoji(label)}</summary>\n\n${body}\n\n</details>`); return this;
  }
  text(s) { this.blocks.push(stripEmoji(s)); return this; }
  source(ref) { this.refs.push(sourceRef(ref, this.lang)); return this; }
  thanks(...who) { for (const w of who.flat()) if (w && !this.credits.includes(w)) this.credits.push(stripEmoji(w)); return this; }
  toMarkdown() {
    if (!this._summary) throw new Error('report-writer: summary required (1-2 sentences)');
    const parts = [`<!-- ${MARK} lang=${this.lang} -->`, `### ${this.title}`, '', this._summary, ''];
    for (const b of this.blocks) parts.push(b, '');
    if (this.refs.length) parts.push(`**${this.L.sources}**`, '', ...this.refs.slice(0, this.maxRows).map((r) => `- ${r}`), '');
    parts.push(`**${this.L.thanks}** — ${this.credits.length ? this.credits.join(', ') : (this.lang === 'fr' ? 'la communauté Homey et les projets cités dans CREDITS.md' : 'the Homey community and the projects listed in CREDITS.md')}.`, '');
    let md = parts.join('\n');
    md = sanitize(md, { sources: this.fetched, lang: this.lang }).text;
    if (md.length > this.maxChars) md = md.slice(0, this.maxChars - 80) + `\n\n_(${this.L.truncated})_\n`;
    return md;
  }
  /** Append to $GITHUB_STEP_SUMMARY when present (CI), else print. Never throws in CI. */
  write({ file, stdout = !process.env.GITHUB_STEP_SUMMARY } = {}) {
    const md = this.toMarkdown();
    const target = file || process.env.GITHUB_STEP_SUMMARY;
    try { if (target) fs.appendFileSync(target, md + '\n'); } catch (e) { console.error(`report-writer: ${e.message}`); }
    if (stdout) process.stdout.write(md + '\n');
    return md;
  }
}

/** Structural check used by the ratchet and by tests. */
function checkStructure(md) {
  const problems = [];
  const s = String(md || '');
  if (!s.includes(`<!-- ${MARK}`)) problems.push('missing report-writer marker');
  const m = s.match(/^### .+\n\n([^\n|<*][^\n]*)\n/m);
  if (!m) problems.push('missing plain summary under the title');
  else if (sentenceCount(m[1]) > 2) problems.push('summary longer than two sentences');
  if (!/\*\*(Thanks|Merci)\*\* — /.test(s)) problems.push('missing thanks/credits line');
  if (findQuotedExcerpts(s).length) problems.push('long quoted excerpt');
  return problems;
}

const createReport = (o) => new Report(o);
module.exports = { createReport, Report, sourceRef, topicOf, sanitize, findVerbatim, findQuotedExcerpts, checkStructure, stripEmoji, cell, MARK, DEFAULT_VERBATIM_WORDS };

// CLI: node scripts/lib/report-writer.js --title "…" --summary "…" [--lang fr] [--row "a|b"]… [--headers "x|y"] [--thanks "…"]
// Handy for plain `run:` steps that only need a short, well-formed summary.
if (require.main === module) {
  const a = process.argv.slice(2); const get = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  const all = (k) => a.reduce((acc, v, i) => (v === k && a[i + 1] != null ? acc.concat(a[i + 1]) : acc), []);
  const r = createReport({ title: get('--title') || 'Report', lang: get('--lang') || 'en', summary: get('--summary') || 'No summary given.' });
  const headers = get('--headers'); const rows = all('--row');
  if (headers) r.table(headers.split('|'), rows.map((x) => x.split('|')));
  const det = all('--detail'); if (det.length) r.details(r.L.details, det);
  r.thanks(all('--thanks'));
  r.write();
}
