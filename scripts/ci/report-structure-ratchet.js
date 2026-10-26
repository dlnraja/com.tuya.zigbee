#!/usr/bin/env node
'use strict';
/**
 * scripts/ci/report-structure-ratchet.js — keeps our reports readable and our own (P3069, t585u).
 *
 * What it looks at, in plain words:
 *  - every workflow should open with a short "about" block that says what it does, in our words,
 *    and who we took ideas from (see scripts/ci/workflow-about.js);
 *  - scripts that build reports should not paste other people's issue titles, comment bodies or
 *    forum posts — they link to them instead (scripts/lib/report-writer.js sourceRef/topicOf);
 *  - hand-written knowledge docs should not carry long blockquotes / quoted passages copied from
 *    somewhere else;
 *  - any report produced with the shared helper keeps its shape (summary, table, thanks).
 *
 * It is a ratchet: today's debt is written to .github/report-ratchet-baseline.json and may only
 * shrink. New debt fails CI; paying debt off is always allowed (re-run with --write-baseline).
 *
 *   node scripts/ci/report-structure-ratchet.js                 # check (exit 1 on regression)
 *   node scripts/ci/report-structure-ratchet.js --write-baseline
 *   node scripts/ci/report-structure-ratchet.js --inventory docs/knowledge/GHA_REPORTS_INVENTORY.md
 */
const fs = require('fs');
const path = require('path');
const RW = require('../lib/report-writer');

const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE = path.join(ROOT, '.github', 'report-ratchet-baseline.json');
const ABOUT_RE = /^# >>> about \(P3069\)/m;

function walk(dir, exts, out = []) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name.startsWith('.git') && e.name !== '.github') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };

function scanWorkflows() {
  const dir = path.join(ROOT, '.github', 'workflows');
  return fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort().map((f) => {
    const s = read(path.join(dir, f));
    return {
      file: f,
      about: ABOUT_RE.test(s),
      summary: /GITHUB_STEP_SUMMARY|core\.summary/.test(s),
      helper: /report-writer/.test(s),
      posts: /createComment|issues\.create\b|gh issue (comment|create)|gh pr comment|createPost|\/posts\.json/.test(s),
    };
  });
}

// A third-party text field interpolated into output: `${it.title}`, `${c.body}`, `${p.cooked}`…
const QUOTE_RE = /\$\{[^}]*\b(?:it|issue|i|pr|item|c|comment|p|post|t|topic|x|f\.it)\.(?:title|body|cooked|excerpt|raw|blurb)\b[^}]*\}/;
function scanScripts() {
  const files = [...walk(path.join(ROOT, 'scripts'), ['.js', '.cjs', '.mjs']), ...walk(path.join(ROOT, '.github', 'scripts'), ['.js', '.cjs', '.mjs'])];
  const out = [];
  for (const p of files) {
    if (p.endsWith(path.join('lib', 'report-writer.js')) || p.endsWith('report-structure-ratchet.js')) continue;
    const s = read(p);
    if (!/GITHUB_STEP_SUMMARY|core\.summary|\.md['"`]|appendFileSync|writeFileSync|body:/.test(s)) continue;
    const lines = s.split('\n');
    const hits = [];
    lines.forEach((l, i) => { if (QUOTE_RE.test(l) && !/topicOf|sourceRef|\/\/ ok-own-text/.test(l)) hits.push(i + 1); });
    if (hits.length) out.push({ file: rel(p), lines: hits.length });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

function scanDocs() {
  const files = [
    ...walk(path.join(ROOT, 'docs', 'knowledge'), ['.md']),
    path.join(ROOT, 'CREDITS.md'), path.join(ROOT, 'docs', 'CREDITS.md'),
    ...walk(path.join(ROOT, 'reports'), ['.md']),
  ].filter((p) => fs.existsSync(p));
  const excerpts = {}; const broken = [];
  for (const p of files) {
    const s = read(p);
    const n = RW.findQuotedExcerpts(s).length;
    if (n) excerpts[rel(p)] = n;
    if (s.includes(`<!-- ${RW.MARK}`)) { const pr = RW.checkStructure(s); if (pr.length) broken.push({ file: rel(p), problems: pr }); }
  }
  return { excerpts, broken };
}

function collect() {
  const wf = scanWorkflows();
  const docs = scanDocs();
  return {
    workflows: wf,
    workflowsWithoutAbout: wf.filter((w) => !w.about).map((w) => w.file),
    quotingScripts: scanScripts(),
    docExcerpts: docs.excerpts,
    brokenReports: docs.broken,
  };
}

function compare(cur, base) {
  const errs = [];
  const baseNoAbout = new Set(base.workflowsWithoutAbout || []);
  for (const f of cur.workflowsWithoutAbout) if (!baseNoAbout.has(f)) errs.push(`workflow ${f} has no "# >>> about (P3069)" header (run: node scripts/ci/workflow-about.js --write)`);
  const bq = new Map((base.quotingScripts || []).map((x) => [x.file, x.lines]));
  for (const x of cur.quotingScripts) {
    if (!bq.has(x.file)) errs.push(`${x.file}: interpolates third-party title/body into a report (${x.lines} line(s)) — use report-writer sourceRef/topicOf`);
    else if (x.lines > bq.get(x.file)) errs.push(`${x.file}: more third-party text interpolations than baseline (${x.lines} > ${bq.get(x.file)})`);
  }
  const bd = base.docExcerpts || {};
  for (const [f, n] of Object.entries(cur.docExcerpts)) if (n > (bd[f] || 0)) errs.push(`${f}: ${n} long quoted excerpt(s) (baseline ${bd[f] || 0}) — rewrite in our words with id, link and author`);
  for (const b of cur.brokenReports) errs.push(`${b.file}: report-writer shape broken (${b.problems.join(', ')})`);
  return errs;
}

function inventoryMarkdown(cur) {
  const wf = cur.workflows;
  const r = RW.createReport({
    title: 'GitHub Actions reports — inventory (P3069)',
    lang: 'en',
    summary: `${wf.length} workflows: ${wf.filter((w) => w.summary).length} write a job summary, ${wf.filter((w) => w.helper).length} already use the shared report helper and ${wf.filter((w) => w.about).length} carry our own "about" header. ${cur.quotingScripts.length} scripts still interpolate third-party titles or bodies, and ${Object.keys(cur.docExcerpts).length} docs hold long quoted passages to rewrite.`,
    maxRows: 200,
  });
  r.table(['workflow', 'about header', 'job summary', 'shared helper', 'writes to GitHub'],
    wf.map((w) => [w.file, w.about ? 'yes' : 'no', w.summary ? 'yes' : '-', w.helper ? 'yes' : '-', w.posts ? 'own repo only (see notes)' : '-']));
  r.details('Scripts that interpolate third-party titles or bodies (to migrate)', cur.quotingScripts.map((x) => `- \`${x.file}\` — ${x.lines} line(s)`).join('\n') || '- none');
  r.details('Docs with long quoted passages (to rewrite)', Object.entries(cur.docExcerpts).map(([f, n]) => `- \`${f}\` — ${n}`).join('\n') || '- none');
  r.details('Notes on posting', [
    'Workflows flagged "writes to GitHub" only write inside this repository (labelled tracking issues, the digest issue, alerts).',
    'Nothing posts on the Homey Community forum or on upstream repositories; replies stay behind the anti-flood ledger (data/progress/replies-ledger.json).',
  ]);
  r.thanks('GitHub job-summary documentation', 'actionlint (rhysd)', 'the Homey Community and Zigbee2MQTT trackers for the link-do-not-quote habit');
  return r.toMarkdown();
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const cur = collect();
  if (args.includes('--write-baseline')) {
    const out = { _doc: 'P3069 report ratchet: may only shrink. Regenerate: node scripts/ci/report-structure-ratchet.js --write-baseline', workflowsWithoutAbout: cur.workflowsWithoutAbout, quotingScripts: cur.quotingScripts, docExcerpts: cur.docExcerpts };
    fs.writeFileSync(BASELINE, JSON.stringify(out, null, 2) + '\n');
    console.log(`baseline written: ${cur.workflowsWithoutAbout.length} workflows without about, ${cur.quotingScripts.length} quoting scripts, ${Object.keys(cur.docExcerpts).length} docs with excerpts`);
  }
  const inv = args.indexOf('--inventory');
  if (inv >= 0) { fs.writeFileSync(path.join(ROOT, args[inv + 1]), inventoryMarkdown(cur)); console.log(`inventory written: ${args[inv + 1]}`); }
  if (!args.includes('--write-baseline') && inv < 0) {
    const base = fs.existsSync(BASELINE) ? JSON.parse(read(BASELINE)) : {};
    const errs = compare(cur, base);
    if (errs.length) { console.error(errs.map((e) => `::error::${e}`).join('\n')); process.exit(1); }
    console.log(`report ratchet OK: ${cur.workflowsWithoutAbout.length} workflows without about, ${cur.quotingScripts.length} quoting scripts, ${Object.keys(cur.docExcerpts).length} docs with excerpts (baseline may only shrink)`);
  }
}

module.exports = { collect, compare, inventoryMarkdown, scanScripts, scanDocs, scanWorkflows, QUOTE_RE };
