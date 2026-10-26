'use strict';
// P3068: a job whose checkout is sparse (e.g. scripts/digest only) must not ask actions/setup-node to
// cache npm with a cache-dependency-path that the sparse checkout does not contain: setup-node fails
// with "Some specified paths were not resolved, unable to cache dependencies" (Autonomous Verification
// P37 ci-health, run 40339710338, 26/10 14:26 UTC).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WF = path.resolve(__dirname, '..', '..', '.github', 'workflows');

function covered(sparse, file) {
  const dirs = String(sparse).split(/\s+/).filter(Boolean).map((d) => d.replace(/\/$/, ''));
  if (!file.includes('/')) {return true;} // cone mode always includes root files
  return dirs.some((d) => file === d || file.startsWith(`${d}/`));
}

test('P3068 sparse checkouts never feed setup-node an npm cache key file they did not check out', () => {
  const bad = [];
  for (const f of fs.readdirSync(WF).filter((x) => /\.ya?ml$/.test(x))) {
    let doc;
    try { doc = yaml.load(fs.readFileSync(path.join(WF, f), 'utf8')); } catch (_e) { continue; }
    for (const [jobId, job] of Object.entries((doc && doc.jobs) || {})) {
      let sparse = null;
      for (const st of (job && job.steps) || []) {
        const uses = String(st.uses || '');
        if (uses.startsWith('actions/checkout')) {sparse = st.with && st.with['sparse-checkout'] ? st.with['sparse-checkout'] : null;}
        if (uses.startsWith('actions/setup-node') && sparse && st.with && st.with.cache) {
          const dep = String(st.with['cache-dependency-path'] || 'package-lock.json');
          for (const file of dep.split(/\s+/).filter(Boolean)) {
            if (!covered(sparse, file)) {bad.push(`${f}:${jobId} ${file} not in sparse-checkout "${String(sparse).trim()}"`);}
          }
        }
      }
    }
  }
  assert.deepStrictEqual(bad, []);
});
