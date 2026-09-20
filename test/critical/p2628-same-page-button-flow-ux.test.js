'use strict';

/**
 * P2628 — Same-page Flow UX for X-gang remotes/walls Contre quoi
 * - Device trigger runListener must NOT require args.device
 * - Main Ngang cards expose button dropdown (all buttons one Flow page)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2628 same-page button Flow UX', () => {
  it('FlowCardHelper allows device triggers without args.device', () => {
    const { shouldRunForDeviceAndButton } = require('../../lib/FlowCardHelper');
    assert.equal(shouldRunForDeviceAndButton({}, { button: '1' }), true);
    assert.equal(shouldRunForDeviceAndButton({ button: '1' }, { button: '1' }), true);
    assert.equal(shouldRunForDeviceAndButton({ button: '2' }, { button: '1' }), false);
    assert.equal(shouldRunForDeviceAndButton({ button: '3' }, { button: '3' }), true);
  });

  it('button_wireless_3 main cards have Button 1-3 dropdown on one page', () => {
    const f = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.flow.compose.json'),
      'utf8',
    ));
    const t = f.triggers.find((x) => x.id === 'button_wireless_3_button_3gang_button_pressed');
    assert.ok(t);
    assert.ok(t.highlight);
    const dd = (t.args || []).find((a) => a.type === 'dropdown' && a.name === 'button');
    assert.ok(dd, 'missing button dropdown');
    const ids = (dd.values || []).map((v) => v.id);
    assert.deepEqual(ids, ['1', '2', '3']);
    assert.ok(String(t.titleFormatted?.fr || '').includes('[[button]]'));
  });

  it('wall_remote_3_gang exposes unified dropdown press card first', () => {
    const f = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/wall_remote_3_gang/driver.flow.compose.json'),
      'utf8',
    ));
    const first = f.triggers[0];
    assert.equal(first.id, 'wall_remote_3_gang_button_3gang_button_pressed');
    assert.ok((first.args || []).some((a) => a.type === 'dropdown'));
  });

  it('registers short remote_button_wireless_wall btn_* IDs', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/FlowCardHelper.js'), 'utf8');
    assert.ok(src.includes('remote_button_wireless_wall_btn1_pressed'));
  });

  it('npm check:p2628 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2628']);
  });
});
