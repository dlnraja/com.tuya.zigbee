'use strict';

/**
 * P2547 — Contre quoi: external SDK3 inspiration SSOT + P216 collector + Sdk3ZclSafe.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

describe('P2547 external app + SDK3 inspiration', () => {
  it('SSOT + docs + runtime + rule exist', () => {
    for (const rel of [
      'config/architecture/external-app-sdk3-inspiration-ssot.json',
      'docs/architecture/EXTERNAL_APP_SDK3_INSPIRATION_SSOT.md',
      'lib/utils/Sdk3ZclSafe.js',
      '.cursor/rules/sdk3-external-inspiration-always.mdc',
      'tools/ci/p2547-external-sdk3-inspiration-gate.js',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), rel);
    }
  });

  it('SSOT locks doctrine + Johan coverage + SDK3 rules', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/external-app-sdk3-inspiration-ssot.json'), 'utf8')
    );
    assert.equal(ssot._meta.patch, 'P2547');
    assert.equal(ssot._meta.dualApp, 'BOTH');
    assert.equal(ssot.doctrine.noInventPid, true);
    assert.equal(ssot.doctrine.noForumPost, true);
    assert.ok(ssot.externalApps.some((a) => a.repo === 'JohanBendz/com.tuya.zigbee'));
    assert.ok(ssot.externalApps.some((a) => a.repo === 'Drenso/com.tuya2'));
    assert.ok(ssot.externalApps.some((a) => a.repo === 'athombv/node-homey-zigbeedriver'));
    assert.ok(ssot.officialSdk3.rules.some((r) => r.id === 'defer-zcl-on-init'));
    assert.ok(ssot.officialSdk3.rules.some((r) => r.id === 'p216-battery'));
    assert.ok(ssot.johanOpenIssuesCoverage2026_09_17.covered.length >= 8);
    assert.ok(ssot.officialSdk3.preferMarkdown === true);
  });

  it('Sdk3ZclSafe catchZcl swallows rejection', async () => {
    const { catchZcl, INIT_COMMUNICATION_DELAY_MS } = require('../../lib/utils/Sdk3ZclSafe');
    assert.ok(INIT_COMMUNICATION_DELAY_MS >= 1000);
    const logs = [];
    const device = { error: (m) => logs.push(m) };
    const out = await catchZcl(Promise.reject(new Error('boom')), device, 'test');
    assert.equal(out, undefined);
    assert.ok(logs.some((m) => /boom/.test(m)));
  });

  it('data-collector uses normalizeZclBatteryPercent (no blind /2)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/utils/data-collector.js'), 'utf8');
    assert.match(src, /normalizeZclBatteryPercent/);
    assert.doesNotMatch(src, /Math\.round\(\s*value\s*\/\s*2\s*\)/);
  });

  it('gate exits 0', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/ci/p2547-external-sdk3-inspiration-gate.js')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
  });
});
