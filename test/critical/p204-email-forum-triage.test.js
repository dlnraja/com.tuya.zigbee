'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

describe('P204 email/forum/github triage fixes', () => {
  it('clrdrnya is only on presence_sensor_radar and forbidden on mmwave', () => {
    const reg = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8')
    );
    const hit = (reg.cases || []).find((e) => e.id === 'presence-radar-clrdrnya');
    assert.ok(hit, 'misattribution case presence-radar-clrdrnya');
    assert.equal(hit.canonicalDriver, 'presence_sensor_radar');
    assert.ok(hit.forbiddenDrivers.includes('motion_sensor_radar_mmwave'));

    const presence = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8')
    );
    const mfrs = (presence.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.includes('_tze204_clrdrnya'));

    const mmwave = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/motion_sensor_radar_mmwave/driver.compose.json'), 'utf8')
    );
    const bad = (mmwave.zigbee?.manufacturerName || []).filter((m) =>
      String(m).toLowerCase().includes('clrdrnya')
    );
    assert.equal(bad.length, 0, 'clrdrnya must not be on motion_sensor_radar_mmwave');
  });

  it('apply-issue-439-fps soft-exits when state file is missing', () => {
    const r = spawnSync(process.execPath, ['tools/ci/apply-issue-439-fps.js'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60000,
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
  });

  it('apply-canonical-gaps-final soft-skips when cross-ref missing', () => {
    const report = path.join(ROOT, '.github/state/mfr-pid-cross-ref.json');
    const existed = fs.existsSync(report);
    let bak = null;
    if (existed) {
      bak = `${report}.p204bak`;
      fs.renameSync(report, bak);
    }
    try {
      const r = spawnSync(process.execPath, ['tools/ci/apply-canonical-gaps-final.js', '--dry'], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 30000,
      });
      assert.equal(r.status, 0, r.stderr || r.stdout);
      assert.match(String(r.stderr || r.stdout), /skip|not found/i);
    } finally {
      if (bak && fs.existsSync(bak)) fs.renameSync(bak, report);
    }
  });

  it('auto-publish no longer hard-fails on dirty tree before rebase', () => {
    const yml = fs.readFileSync(
      path.join(ROOT, '.github/workflows/auto-publish-on-push.yml'),
      'utf8'
    );
    assert.ok(!yml.includes('::error::Uncommitted tracked changes remain before rebase'));
    assert.ok(yml.includes('Uncommitted tracked changes remain before rebase; skipping metadata push'));
    assert.ok(!yml.includes('::error::Bot commit HEAD is not reachable'));
  });
});
