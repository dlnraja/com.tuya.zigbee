'use strict';
// P3232: Daily Digest trimmed to the jobs whose digest-leads artifacts market-couples-intake consumes
// (homey, forum, inspiration) in ONE weekday slot; labs/weekly/selfcheck (issue-only reports duplicated
// by the Grok Bot routines and CI self-check) removed. Guards the producer/consumer contract.
const { describe, it } = require('../_support/dual-runner'); // P3020
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const root = path.resolve(__dirname, '../..');
const wf = yaml.load(fs.readFileSync(path.join(root, '.github/workflows/daily-digest.yml'), 'utf8'));
const intake = fs.readFileSync(path.join(root, '.github/workflows/market-couples-intake.yml'), 'utf8');

describe('P3232 daily-digest lead harvest', () => {
  it('keeps exactly the lead-producing jobs and each uploads digest-leads-*', () => {
    assert.deepStrictEqual(Object.keys(wf.jobs).sort(), ['forum', 'homey', 'inspiration']);
    for (const [id, job] of Object.entries(wf.jobs)) {
      const up = job.steps.find((s) => String(s.uses || '').startsWith('actions/upload-artifact'));
      assert.ok(up && String(up.with.name).startsWith(`digest-leads-${id}`), `${id} must upload digest-leads-${id}`);
    }
  });
  it('runs one weekday slot (CEST/CET pair only) so intake\'s last-12-runs window holds real artifacts', () => {
    const crons = (wf.on || wf[true]).schedule.map((s) => s.cron);
    assert.ok(crons.length <= 2, `crons: ${crons}`);
  });
  it('market-couples-intake still downloads the digest-leads artifacts', () => {
    assert.ok(/-w daily-digest\.yml/.test(intake) && intake.includes("digest-leads-*"));
  });
});
