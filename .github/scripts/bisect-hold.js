#!/usr/bin/env node
'use strict';
// WHY(P3034, 25/10/2026 Paris): while an Athom upload bisect runs on the master app
// (docs/knowledge/athom-bisect-state.json status=running), no scheduled/push/self-heal run may upload
// or promote master: it would add an uncontrolled sample and spoil the one-variable-per-trial rule.
// Trials are launched by a manual workflow_dispatch carrying an explicit bisect_trial input (upload allowed,
// promotion still held: trials are drafts only). An optional time-boxed window in the state file
// (untagged_window {trial, from, until}) lets the pre-planned routine trial (trial 0) run unchanged.
// Other apps (stable, Bastien) are never affected. Always exits 0; writes hold_upload / hold_promote / reason.
// P3036 (25/10/2026): the bisect is closed (status=done) -> this guard allows everything and the normal flow
// (P3036 publish gate, draft -> Test automatic, Live never automatic) applies. Setting status=running again
// re-arms drafts only + bisect_trial: that is how to rerun the bisect if Athom rejections come back.
const fs = require('fs');
const path = require('path');

const MASTER_APP = 'com.dlnraja.tuya.zigbee';
const STATE_REL = 'docs/knowledge/athom-bisect-state.json';

function readAppId(root) {
  for (const f of ['.homeycompose/app.json', 'app.json']) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
      if (j && typeof j.id === 'string' && j.id) {return j.id;}
    } catch (_e) { /* next */ }
  }
  return '';
}

function decide({ state, stateError, appId, eventName, bisectTrial, now }) {
  const allow = (reason) => ({ hold_upload: false, hold_promote: false, reason });
  if (appId && appId !== MASTER_APP) {return allow(`app ${appId} is not the bisected master app`);}
  if (stateError) {
    // Present but unreadable: fail closed (the file only exists to protect a running bisect).
    return { hold_upload: true, hold_promote: true, reason: `bisect state unreadable (${stateError})` };
  }
  if (!state) {return allow('no bisect state file');}
  if (String(state.status || '').toLowerCase() !== 'running') {return allow(`bisect status=${state.status || 'unset'}`);}
  if (state.app_id && state.app_id !== MASTER_APP) {return allow(`bisect targets ${state.app_id}`);}
  // P3034: trial 0 is a valid trial id ('0' or numeric 0 must not read as "no trial").
  const trial = (bisectTrial === undefined || bisectTrial === null || bisectTrial === false) ? '' : String(bisectTrial).trim();
  if (eventName === 'workflow_dispatch' && trial) {
    return { hold_upload: false, hold_promote: true, reason: `bisect trial ${trial} (manual dispatch): upload allowed, promotion held (drafts only)` };
  }
  const w = state.untagged_window;
  if (w && w.from && w.until) {
    const t = (now instanceof Date ? now : new Date()).getTime();
    const from = Date.parse(w.from);
    const until = Date.parse(w.until);
    if (Number.isFinite(from) && Number.isFinite(until) && t >= from && t <= until) {
      return allow(`bisect trial ${w.trial} window ${w.from}..${w.until} (planned routine run, unchanged)`);
    }
  }
  return { hold_upload: true, hold_promote: true, reason: `P3034 bisect running (trial ${state.current_trial}): ${eventName || 'run'} without bisect_trial must not upload/promote master` };
}

function main() {
  const root = process.env.GITHUB_WORKSPACE || process.cwd();
  const file = path.join(root, process.env.BISECT_STATE_PATH || STATE_REL);
  let state = null;
  let stateError = '';
  if (fs.existsSync(file)) {
    try { state = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { stateError = e.message; }
  }
  const d = decide({
    state, stateError,
    appId: process.env.APP_ID || readAppId(root),
    eventName: process.env.EVENT_NAME || process.env.GITHUB_EVENT_NAME || '',
    bisectTrial: process.env.BISECT_TRIAL || '',
    now: process.env.BISECT_NOW ? new Date(process.env.BISECT_NOW) : new Date(),
  });
  const line = `[bisect-hold] hold_upload=${d.hold_upload} hold_promote=${d.hold_promote} — ${d.reason}`;
  console.log(line);
  if (d.hold_upload || d.hold_promote) {console.log(`::notice title=P3034 bisect hold::${d.reason}`);}
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `hold_upload=${d.hold_upload}\nhold_promote=${d.hold_promote}\nreason=${d.reason.replace(/\n/g, ' ')}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const msg = d.hold_upload
      ? `### ⏸️ P3034 bisect hold\nAthom upload/promotion skipped: ${d.reason}. Auto-fix/commit steps still ran. Launch a trial with a manual dispatch and an explicit \`bisect_trial\` input.\n`
      : (d.hold_promote ? `### 🧪 P3034 bisect trial\n${d.reason}\n` : `P3034 bisect hold: none (${d.reason})\n`);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, msg);
  }
}

module.exports = { decide, MASTER_APP, STATE_REL };
if (require.main === module) {main();}
