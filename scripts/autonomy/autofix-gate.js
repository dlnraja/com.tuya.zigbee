#!/usr/bin/env node
'use strict';
// P3104: wires the decision engine + ledger into ci-autofix.
//   node autofix-gate.js check  <signature> -> prints allow=true|false, decision JSON to the summary
//   node autofix-gate.js record <signature> ok|fail
// The ledger (config/autonomy-learned.json) and decision log live in the Actions cache, never in git.
const fs = require('fs');
const path = require('path');
const learn = require('../ci/autonomy-learn.js');
const { decide } = require('./decide.js');

const ROOT = path.resolve(__dirname, '..', '..');
const LEDGER = path.join(ROOT, 'config', 'autonomy-learned.json');
const load = () => { try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')); } catch { return { entries: {}, events: [] }; } };

function check(sig, l = load(), env = process.env, root = ROOT) {
  if (learn.paused(root, 'autofix')) return { allow: false, why: 'kill switch autofix' };
  const may = learn.mayAct(l, sig, { root, feature: 'autofix', commits24h: Number(env.COMMITS_24H || 0) });
  const attempts = l.events.filter((x) => x.sig === sig && Date.now() - x.t < 864e5).length;
  const d = decide({ type: 'ci_red', workflow: env.WF_NAME, branch: env.WF_BRANCH, knownSignature: !!may.auto, attempts24h: attempts });
  // A transient re-run is reversible and always allowed under the budget; a code fix only when decide says so.
  return { allow: may.ok, codeFix: may.ok && d.autonomous && d.action === 'fix', why: may.ok ? d.reason : may.why, decision: d };
}
module.exports = { check };

if (require.main === module) {
  const [cmd, sig, res] = process.argv.slice(2);
  const s = String(sig || 'unknown').replace(/[^\w:. -]/g, '').slice(0, 120);
  if (cmd === 'check') {
    const r = check(s);
    console.log(JSON.stringify(r));
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `allow=${r.allow}\ncodefix=${r.codeFix}\n`);
  } else if (cmd === 'record') {
    const l = load(); learn.record(l, s, 'rerun', res === 'ok'); fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2) + '\n');
  }
}
