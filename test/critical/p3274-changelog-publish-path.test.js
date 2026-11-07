'use strict';
// The Bastien Test page repeated "Reliability fixes" because bastien-publish.yml
// set HOMEY_CHANGELOG to that string and the bump treated it as a real note.
// The publish scripts and workflows must refuse that filler. A filtered package
// must not claim a driver it does not ship. An older real note stays.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const ce = require(path.join(ROOT, 'scripts/automation/changelog-entry.js'));
const FILLER = 'Reliability fixes';

function run(cmd, args, cwd, env) {
  return execFileSync(cmd, args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8' });
}

describe('P3274 publish changelog path', () => {
  it('stock filler is a placeholder and a real hardware note is not', () => {
    for (const g of [FILLER, 'Reliability fixes.', 'Reliability improvements.', 'Bug fixes and improvements', 'Stability improvements and Homey test publication retry.']) {
      assert.equal(ce.isPlaceholder(g), true, g);
    }
    assert.equal(ce.isPlaceholder('Fixed: humidity shown 10 times too low on climate sensors (GH#581).'), false);
  });

  it('a filtered package drops drivers it does not ship; a full tree keeps them', () => {
    const subjects = [
      'fix(drivers/curtain_motor): curtain motor position after power loss',
      'fix(drivers/button_wireless_3): battery report from the button',
    ];
    const packed = ce.noteForPublish(subjects, { keepDriverIds: ['button_wireless_3'] });
    assert.match(packed.en, /button/i);
    assert.doesNotMatch(packed.en, /curtain/i);
    assert.equal(ce.isPlaceholder(packed.en), false);
    const full = ce.noteForPublish(subjects, {});
    assert.match(full.en, /curtain/i);
    const outside = ce.noteForPublish(['fix(drivers/curtain_motor): curtain motor position'], { keepDriverIds: ['button_wireless_3'] });
    assert.match(outside.en, /^Maintenance /);
    assert.doesNotMatch(outside.en, /curtain/i);
  });

  it('bump and ensure-next ignore Reliability fixes and keep an older real entry', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3274-'));
    fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ id: 'com.dlnraja.tuya.zigbee.bastien', version: '1.0.230' }));
    fs.writeFileSync(path.join(dir, '.homeychangelog.json'), JSON.stringify({
      '1.0.213': { en: 'Fixed: TS0043 battery tile and relay onoff.', fr: 'Corrigé : pile TS0043 et relais.' },
      '1.0.230': { en: 'Fixed: humidity shown 10 times too low on climate sensors (GH#581).' },
    }));
    fs.mkdirSync(path.join(dir, 'config/architecture'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'config/architecture/bastien-publish-fleet-ssot.json'), JSON.stringify({ keepDriverIds: ['button_wireless_3'] }));
    run('git', ['init', '-q'], dir);
    run('git', ['config', 'user.email', 't@t'], dir);
    run('git', ['config', 'user.name', 't'], dir);
    fs.writeFileSync(path.join(dir, 'readme.txt'), 'a\n');
    run('git', ['add', 'readme.txt'], dir);
    run('git', ['commit', '-qm', 'fix(drivers/button_wireless_3): battery report from the button'], dir);
    run(process.execPath, [path.join(ROOT, '.github/scripts/bump-homey-version.js'), 'patch'], dir, { HOMEY_CHANGELOG: FILLER });
    const bumped = JSON.parse(fs.readFileSync(path.join(dir, '.homeychangelog.json'), 'utf8'));
    assert.equal(bumped['1.0.213'].en, 'Fixed: TS0043 battery tile and relay onoff.');
    assert.equal(bumped['1.0.230'].en, 'Fixed: humidity shown 10 times too low on climate sensors (GH#581).');
    assert.equal(ce.isPlaceholder(bumped['1.0.231'].en), false);
    assert.notEqual(bumped['1.0.231'].en, FILLER);
    assert.match(bumped['1.0.231'].en, /button/i);
    assert.ok(bumped['1.0.231'].fr);
    run(process.execPath, [path.join(ROOT, '.github/scripts/ensure-next-changelog.js')], dir, { HOMEY_CHANGELOG: FILLER });
    const ensured = JSON.parse(fs.readFileSync(path.join(dir, '.homeychangelog.json'), 'utf8'));
    assert.notEqual(ensured['1.0.232'].en, FILLER);
    assert.equal(ce.isPlaceholder(ensured['1.0.232'].en), false);
    run(process.execPath, [path.join(ROOT, 'scripts/automation/changelog-publish-gate.js')], dir);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('publish workflows do not assign the stock filler', () => {
    const dir = path.join(ROOT, '.github/workflows');
    const bad = /HOMEY_CHANGELOG:\s*['"](?:Reliability fixes|Reliability improvements\.?|Bug fixes and improvements|Stability improvements and Homey test publication retry)\.?['"]/;
    for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.yml'))) {
      const src = fs.readFileSync(path.join(dir, name), 'utf8');
      assert.doesNotMatch(src, bad, name);
    }
    const stable = fs.readFileSync(path.join(dir, 'publish-stable.yml'), 'utf8');
    const auto = fs.readFileSync(path.join(dir, 'auto-publish-on-push.yml'), 'utf8');
    assert.match(stable, /changelog-publish-gate\.js/);
    assert.match(auto, /changelog-publish-gate\.js/);
  });
});
