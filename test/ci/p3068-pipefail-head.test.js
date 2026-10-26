'use strict';
// P3068: under `pipefail`, `git <cmd> | head -N` exits 141 (SIGPIPE) as soon as git writes more than
// head reads (Bastien Promote Upstream, run 40329544123, 26/10 13:19 UTC: `git branch -a | head -40`).
// Any run script with pipefail in effect must not pipe a git command straight into head without `|| true`.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WF = path.resolve(__dirname, '..', '..', '.github', 'workflows');
const RISK = /\bgit\s+[^|;&]*\|\s*head\b/;

function offenders(doc, file) {
  const out = [];
  const defShell = doc && doc.defaults && doc.defaults.run && doc.defaults.run.shell;
  for (const [jobId, job] of Object.entries((doc && doc.jobs) || {})) {
    const jobShell = job && job.defaults && job.defaults.run && job.defaults.run.shell;
    for (const st of (job && job.steps) || []) {
      if (typeof st.run !== 'string') {continue;}
      const shell = st.shell || jobShell || defShell || '';
      const pipefail = shell === 'bash' || /pipefail/.test(String(shell)) || /set\s+-[a-z]*o\s+pipefail|set\s+-o\s+pipefail/.test(st.run);
      if (!pipefail) {continue;}
      for (const line of st.run.split('\n')) {
        if (RISK.test(line) && !/\|\|\s*(true|:)/.test(line)) {out.push(`${file}:${jobId}: ${line.trim()}`);}
      }
    }
  }
  return out;
}

test('P3068 rule catches the Bastien Promote SIGPIPE pattern', () => {
  const doc = { jobs: { j: { steps: [{ run: 'set -euo pipefail\ngit branch -a | head -40\n' }] } } };
  assert.strictEqual(offenders(doc, 'x').length, 1);
  doc.jobs.j.steps[0].run = 'set -euo pipefail\ngit branch -a | sed -n 1,40p\n';
  assert.strictEqual(offenders(doc, 'x').length, 0);
});

test('P3068 no workflow pipes git into head under pipefail', () => {
  const bad = [];
  for (const f of fs.readdirSync(WF).filter((x) => /\.ya?ml$/.test(x))) {
    let doc;
    try { doc = yaml.load(fs.readFileSync(path.join(WF, f), 'utf8')); } catch (_e) { continue; }
    bad.push(...offenders(doc, f));
  }
  assert.deepStrictEqual(bad, []);
});
