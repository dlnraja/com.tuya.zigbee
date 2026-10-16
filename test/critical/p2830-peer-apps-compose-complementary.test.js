'use strict';

/**
 * P2830 — Peer Homey apps compose → OUR drivers Contre quoi
 *
 * WHY: Rewrite peer fingerprints intelligently (C1), never invent pid,
 *      never wipe compose, never use stale Johan master stub.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2830 peer apps compose complementary rewrite', () => {
  it('script uses default branch + app.json + ComplementaryMerge only', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'tools/ci/p2830-peer-apps-compose-complementary.js'),
      'utf8',
    );
    assert.ok(src.includes('ComplementaryMerge'));
    assert.ok(src.includes('wouldDegradeCompose'));
    assert.ok(src.includes('resolveBranch'));
    assert.ok(src.includes('branch: \'default\''));
    assert.ok(src.includes('app.json'));
    assert.ok(src.includes('neverInventPid'));
    assert.ok(src.includes('forumPost: false'));
    assert.ok(src.includes('rewriteNotCopy'));
    assert.ok(src.includes('JohanBendz/com.tuya.zigbee'));
    assert.ok(src.includes('JohanBendz/com.lidl'));
  });

  it('P2572 refuses mfr-only cartesian new pids without force-medium', () => {
    const mega = fs.readFileSync(
      path.join(ROOT, 'tools/ci/p2572-johan-mega-complementary.js'),
      'utf8',
    );
    assert.ok(mega.includes('compose-mfr-new-pid'));
    assert.ok(mega.includes('--force-medium'));
    assert.ok(mega.includes('mfrs.length * pids.length <= 2'));
  });

  it('npm check:p2830 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts['check:p2830'], 'node --test test/critical/p2830-peer-apps-compose-complementary.test.js');
  });

  it('sacred couples survive peer rewrite (dimmer + IAS leak)', () => {
    const dim = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/wall_dimmer_tuya/driver.compose.json'), 'utf8'),
    ).zigbee;
    assert.ok((dim.manufacturerName || []).some((m) => /m1cvyneb/i.test(m)));
    assert.ok((dim.productId || []).some((p) => String(p).toUpperCase() === 'TS0601'));

    const leak = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/water_leak_sensor/driver.compose.json'), 'utf8'),
    ).zigbee;
    assert.ok((leak.manufacturerName || []).some((m) => /k4ej3ww2/i.test(m)));
    assert.ok((leak.productId || []).some((p) => String(p).toUpperCase() === 'TS0207'));
  });
});
