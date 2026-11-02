'use strict';
// P3231: a workflow job that uses a sparse checkout must include every local file its node
// scripts require (transitively). Root cause: daily-digest.yml homey job checked out
// scripts/digest but not scripts/lib, so homey-digest.js crashed on ../lib/report-writer.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const WF = path.join(ROOT, '.github', 'workflows');

function parseJobs(text) {
  const jobs = [];
  let cur = null;
  const lines = text.split('\n');
  let inJobs = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^jobs:\s*$/.test(l)) { inJobs = true; continue; }
    if (inJobs && /^\S/.test(l)) inJobs = false;
    const m = inJobs && l.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (m) { cur = { name: m[1], sparse: null, scripts: [] }; jobs.push(cur); continue; }
    if (!cur) continue;
    const s = l.match(/^(\s*)sparse-checkout:\s*(\|)?\s*(\S.*)?$/);
    if (s) {
      // several checkouts in one job: union of all sparse sets
      cur.sparse = cur.sparse || [];
      if (s[3] && !s[2]) cur.sparse.push(s[3].trim());
      else {
        const ind = s[1].length;
        while (i + 1 < lines.length) {
          const n = lines[i + 1];
          const ni = n.match(/^(\s*)\S/);
          if (!ni) { i++; continue; }
          if (ni[1].length <= ind) break;
          cur.sparse.push(n.trim()); i++;
        }
      }
      continue;
    }
    for (const r of l.matchAll(/\bnode\s+((?:scripts|tools|lib)\/[\w./-]+\.js)\b/g)) cur.scripts.push(r[1]);
  }
  return jobs;
}

function resolveLocal(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [base, base + '.js', base + '.json', path.join(base, 'index.js')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function closure(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(f, 'utf8');
    // only static, top-level-looking relative requires (not inside try/catch fallbacks we cannot see)
    for (const m of src.matchAll(/require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) {
      const r = resolveLocal(f, m[1]);
      if (r) stack.push(r);
    }
  }
  return [...seen];
}

const covered = (rel, sparse) => sparse.some((d) => rel === d || rel.startsWith(d.replace(/\/$/, '') + '/'));

test('sparse checkouts include every locally required file (P3231)', () => {
  const problems = [];
  for (const wf of fs.readdirSync(WF).filter((f) => /\.ya?ml$/.test(f))) {
    for (const job of parseJobs(fs.readFileSync(path.join(WF, wf), 'utf8'))) {
      if (!job.sparse || !job.sparse.length) continue;
      if (job.sparse.some((d) => d.startsWith('!'))) continue; // negative patterns: skip
      for (const s of job.scripts) {
        const abs = path.join(ROOT, s);
        if (!fs.existsSync(abs)) continue;
        for (const f of closure(abs)) {
          const rel = path.relative(ROOT, f).split(path.sep).join('/');
          if (!covered(rel, job.sparse)) problems.push(`${wf}#${job.name}: ${s} needs ${rel}`);
        }
      }
    }
  }
  assert.deepStrictEqual([...new Set(problems)], []);
});

test('parser sees the daily-digest homey job sparse set', () => {
  const jobs = parseJobs(fs.readFileSync(path.join(WF, 'daily-digest.yml'), 'utf8'));
  const homey = jobs.find((j) => j.name === 'homey');
  assert.ok(homey && homey.sparse && homey.sparse.includes('scripts/digest'));
  assert.ok(homey.scripts.includes('scripts/digest/homey-digest.js'));
});
