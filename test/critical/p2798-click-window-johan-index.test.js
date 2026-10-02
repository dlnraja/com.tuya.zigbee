'use strict';

/**
 * P2798 — #423/#424 (_TZ3000_rco1yzb1 / TS004F): optional click window (single/double/triple
 * from one-command-per-press firmware) + upstream maintainer triage index parser.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const { ClickAggregator, clampWindow, typeForCount } = require('../../lib/utils/ClickAggregator');
const { parseComment, mergeIndex } = require('../../scripts/scanners/johan-canonical-index');

function fakeHost() {
  const timers = [];
  return {
    timers,
    homey: {
      setTimeout(fn, ms) { const t = { fn, ms, on: true }; timers.push(t); return t; },
      clearTimeout(t) { if (t) {t.on = false;} },
    },
    flush() { for (const t of timers.splice(0)) {if (t.on) {t.fn();}} },
  };
}

describe('P2798 ClickAggregator', () => {
  it('window clamp and labels', () => {
    assert.equal(clampWindow(0), 0);
    assert.equal(clampWindow(undefined), 0);
    assert.equal(clampWindow(20), 150);
    assert.equal(clampWindow(9999), 2000);
    assert.equal(typeForCount(1), 'single');
    assert.equal(typeForCount(2), 'double');
    assert.equal(typeForCount(5), 'multi');
  });
  it('off = immediate single per press (unchanged behaviour)', () => {
    const h = fakeHost(); const out = [];
    const a = new ClickAggregator(h, (k, t) => out.push(t));
    a.press(1, 0); a.press(1, 0);
    assert.deepEqual(out, ['single', 'single']);
  });
  it('counts presses inside the window into one gesture', () => {
    const h = fakeHost(); const out = [];
    const a = new ClickAggregator(h, (k, t, n) => out.push(`${k}:${t}:${n}`));
    a.press(1, 600); h.flush();
    a.press(1, 600); a.press(1, 600); h.flush();
    a.press(1, 600); a.press(1, 600); a.press(1, 600); a.press(1, 600); h.flush();
    a.press(2, 600); h.flush();
    assert.deepEqual(out, ['1:single:1', '1:double:2', '1:multi:3', '2:single:1']);
    a.destroy();
  });
  it('button_wireless_4 wires the setting on the On/Off command path only', () => {
    const src = fs.readFileSync(path.join(root, 'drivers/button_wireless_4/device.js'), 'utf8');
    assert.match(src, /_clickWindowMs\(\)\) \{ this\._aggregateClick\(ep\); return; \}/);
    assert.match(src, /offPress === 'single' && this\._clickWindowMs\(\)/);
    assert.match(src, /!opts\.aggregated && this\._isDeduped/);
    const set = JSON.parse(fs.readFileSync(path.join(root, 'drivers/button_wireless_4/driver.compose.json'), 'utf8'))
      .settings.find((s) => s.id === 'click_window_ms');
    assert.equal(set.value, 0, 'off by default');
    for (const l of ['en', 'fr', 'nl', 'de']) {assert.ok(set.label[l] && set.hint[l]);}
  });
});

describe('P2798 maintainer triage index', () => {
  const body = `## Batch 89b — single Silvercrest TS004F canonical (2026-10-02)
This OPEN bug issue #423 and [enhancement #424] refer to **\`_TZ3000_rco1yzb1 / TS004F\`**.
**A. Existing bug (this issue #423):** one click producing no oneClick Flow; regression after firmware update.
**B. Separately outstanding enhancement from #424:** configurable interclick timeout and triple-click.
| \`_TZ3000_dziaict4 / TS0044\` | #941 original | Missing | Pairing/driver design |`;
  it('parses batch, identities, objectives and acceptance rows', () => {
    const p = parseComment(body);
    assert.equal(p.batch, '89b');
    assert.deepEqual(p.identities[0], ['_TZ3000_rco1yzb1', 'TS004F']);
    assert.ok(p.identities.some((x) => x[0] === '_TZ3000_dziaict4' && x[1] === 'TS0044'));
    assert.deepEqual(p.objectives.filter((o) => /^[AB]$/.test(o.key)).map((o) => o.key), ['A', 'B']);
    assert.ok(p.objectives.some((o) => o.key === 'row'));
    assert.equal(p.regression, true);
  });
  it('links duplicate sources to their canonical, keeps closed items', () => {
    const items = [{ n: 424, t: 'x', state: 'closed', state_reason: 'duplicate' }, { n: 423, t: 'y', state: 'open' }];
    const comments = [
      { id: 1, user: 'JohanBendz', issue: '424', created_at: '2026-10-02T12:02:12Z', body: '## Batch 89b — consolidated as duplicate WORK TRACKING, not feature completion. Tracked under STILL-OPEN canonical #423.' },
      { id: 2, user: 'someone', issue: '423', created_at: '2026-10-02T12:03:00Z', body: 'me too _TZ3000_aaaaaaaa / TS0001' },
    ];
    const idx = mergeIndex(null, items, comments);
    assert.equal(idx.issues[424].canonical, 423);
    assert.deepEqual(idx.issues[423].sources, [424]);
    assert.equal(idx.issues[424].state_reason, 'duplicate');
    assert.equal(idx.issues[424].duplicateTrackingOnly, true);
    assert.equal(idx.issues[423].identities.length, 0, 'only the maintainer is parsed');
  });
  it('committed index covers #423 with both objectives', () => {
    const idx = JSON.parse(fs.readFileSync(path.join(root, 'data/leads/johan-canonical-index.json'), 'utf8'));
    assert.ok(idx.summary.issues > 100);
    assert.deepEqual(idx.issues[423].sources, [424]);
    assert.ok(idx.issues[423].objectives.some((o) => o.key === 'B'));
  });
});
