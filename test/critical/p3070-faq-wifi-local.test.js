'use strict';

/**
 * P3070 — docs/user/FAQ_WIFI_LOCAL.md only promises what this branch ships.
 * WHY: the FAQ is ported to stable-v5 and bastien-home; bastien has no Repair view and no
 * User Code QR, so its copy must not send users to buttons that do not exist.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');

const ROOT = path.join(__dirname, '..', '..');
const FAQ = path.join(ROOT, 'docs/user/FAQ_WIFI_LOCAL.md');
const read = (p) => fs.readFileSync(p, 'utf8');
const pairAndRepairViews = () => {
  const out = [];
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    for (const sub of ['pair', 'repair']) {
      const dir = path.join(ROOT, 'drivers', d, sub);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) if (f.endsWith('.html')) out.push(read(path.join(dir, f)));
    }
  }
  return out.join('\n');
};

describe('P3070 Wi-Fi local FAQ matches the shipped code', () => {
  it('FAQ exists with credits', () => {
    const s = read(FAQ);
    assert.match(s, /CREDITS\.md/);
    assert.match(s, /tinytuya/);
    assert.ok(fs.existsSync(path.join(ROOT, 'CREDITS.md')));
  });

  it('every UI promise in the FAQ is present in the pair/repair views', () => {
    const s = read(FAQ);
    const views = pairAndRepairViews();
    if (/Fetch local key from linked account/.test(s)) assert.match(views, /Fetch local key from linked account/);
    if (/User Code/.test(s)) assert.match(views, /User Code/);
    if (/SmartLink QR/.test(s)) assert.match(views, /SmartLink QR/);
    if (/devices\.json/.test(s)) assert.match(views, /devices\.json/);
  });

  it('Offline Grace default in the FAQ equals the code default', () => {
    const m = read(FAQ).match(/Offline Grace \(seconds\)\*\* \(default (\d+)\)/);
    assert.ok(m, 'FAQ states the default');
    const src = read(path.join(ROOT, 'lib/tuya-local/wifiLanReliabilitySettings.js'));
    assert.match(src, new RegExp(`DEFAULT_OFFLINE_GRACE_SECONDS = ${m[1]};`));
  });
});
