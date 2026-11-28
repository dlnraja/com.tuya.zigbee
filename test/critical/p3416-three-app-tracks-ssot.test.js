'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');

const ROOT = path.resolve(__dirname, '../..');

describe('P3416 three-app tracks SSOT & branch identity isolation', () => {
  const ssot = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/dual-app-tracks.json'), 'utf8'));
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

  it('declares all 3 distinct tracks with unique App IDs, version lines, and specificities', () => {
    const { master, stable, bastien } = ssot.tracks;
    assert.strictEqual(master.appId, 'com.dlnraja.tuya.zigbee');
    assert.strictEqual(stable.appId, 'com.dlnraja.tuya.zigbee.stable');
    assert.strictEqual(bastien.appId, 'com.dlnraja.tuya.zigbee.bastien');
    assert.strictEqual(new Set([master.appId, stable.appId, bastien.appId]).size, 3);
    assert.strictEqual(new Set([master.versionLine, stable.versionLine, bastien.versionLine]).size, 3);
    for (const t of [master, stable, bastien]) {
      assert.ok(typeof t.specificity === 'string' && t.specificity.length > 20, `${t.branch} missing specificity`);
      assert.ok(Number.isInteger(t.driverCountSnapshot) && t.driverCountSnapshot > 0, `${t.branch} missing driverCountSnapshot`);
    }
    assert.strictEqual(bastien.publicSupportChannel, false);
    assert.strictEqual(ssot.publicRepliesPolicy.githubAndForumTargetBranch, 'master');
  });

  it('current branch app.json and package.json match exactly one SSOT track without identity blur', () => {
    assert.strictEqual(app.version, pkg.version, 'app.json and package.json versions must match');
    const matched = Object.values(ssot.tracks).find((t) => t.appId === app.id);
    assert.ok(matched, `unknown app.id ${app.id} not in dual-app-tracks.json`);
    const prefix = matched.versionLine.replace(/x$/, '');
    assert.ok(app.version.startsWith(prefix), `${app.id} version ${app.version} must start with ${prefix}`);
    assert.strictEqual(app.name && app.name.en, matched.storeName, `${app.id} storeName mismatch`);
  });
});
