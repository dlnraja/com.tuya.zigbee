'use strict';

/**
 * P2582 — Alibaba Open Code Review wiring + OCR findings on radar watchdog
 *
 * Contre quoi:
 * - project loses .opencodereview/rule.json / OCR SSOT / workflow_dispatch
 * - sticky watchdog clears when _lastDistanceAt never set (age=Infinity)
 * - watchdog interval not cleared on delete/uninit (timer leak)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2582 Open Code Review + radar watchdog OCR fixes', () => {
  it('project OCR rules + SSOT + docs + skill exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, '.opencodereview/rule.json')));
    assert.ok(fs.existsSync(path.join(ROOT, 'config/architecture/open-code-review-ssot.json')));
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/architecture/OPEN_CODE_REVIEW.md')));
    assert.ok(fs.existsSync(path.join(ROOT, '.agents/skills/open-code-review-homey/SKILL.md')));
    const rules = JSON.parse(fs.readFileSync(path.join(ROOT, '.opencodereview/rule.json'), 'utf8'));
    assert.ok(Array.isArray(rules.rules) && rules.rules.length >= 3);
    assert.ok(rules.rules.some((r) => /sacred couple|manufacturerName/i.test(r.rule)));
  });

  it('workflow_dispatch OCR is forfait-safe (no cron, AI_FORCE_LOCAL)', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/open-code-review.yml'), 'utf8');
    assert.ok(yml.includes('workflow_dispatch'));
    assert.ok(!/^\s*schedule:/m.test(yml));
    assert.ok(yml.includes('AI_FORCE_LOCAL'));
    assert.ok(yml.includes('ocr delegate preview'));
    assert.ok(yml.includes('check:p2582'));
  });

  it('radar watchdog refuses Infinity age and clears timer (OCR findings)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(src.includes('_clearStickyPresenceWatchdog'));
    assert.ok(src.includes('_presenceWatchdogTimer'));
    assert.ok(src.includes('if (!this._lastDistanceAt) return'));
    assert.ok(!/age\s*=\s*.*:\s*Infinity/.test(src));
    assert.ok(/onDeleted[\s\S]*_clearStickyPresenceWatchdog/.test(src));
    assert.ok(/onUninit[\s\S]*_clearStickyPresenceWatchdog/.test(src));
  });

  it('package.json wires review:ocr and check:p2582', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2582']);
    assert.ok(pkg.scripts['review:ocr']);
    assert.ok(pkg.scripts['review:ocr:rules']);
  });
});
