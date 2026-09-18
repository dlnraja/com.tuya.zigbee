'use strict';

/**
 * P2582 / P2592 — Alibaba Open Code Review wiring + OCR findings on radar watchdog
 *
 * Contre quoi:
 * - project loses .opencodereview/rule.json / OCR SSOT / intelligent cron
 * - sticky watchdog clears when _lastDistanceAt never set (age=Infinity)
 * - watchdog interval not cleared on delete/uninit (timer leak)
 * - soft hooks / forfait LLM re-enabled by default
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2582/P2592 Open Code Review + radar watchdog OCR fixes', () => {
  it('project OCR rules + SSOT + docs + skill exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, '.opencodereview/rule.json')));
    assert.ok(fs.existsSync(path.join(ROOT, 'config/architecture/open-code-review-ssot.json')));
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/architecture/OPEN_CODE_REVIEW.md')));
    assert.ok(fs.existsSync(path.join(ROOT, '.agents/skills/open-code-review-homey/SKILL.md')));
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/ocr-intelligent-cron.js')));
    const rules = JSON.parse(fs.readFileSync(path.join(ROOT, '.opencodereview/rule.json'), 'utf8'));
    assert.ok(Array.isArray(rules.rules) && rules.rules.length >= 3);
    assert.ok(rules.rules.some((r) => /sacred couple|manufacturerName/i.test(r.rule)));
    const ssot = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/open-code-review-ssot.json'), 'utf8'));
    assert.equal(ssot.forbidRemoteLlmDefault, true);
    assert.ok(ssot.schedule?.cron);
    assert.ok(Array.isArray(ssot.intelligent?.softHooks) && ssot.intelligent.softHooks.length >= 4);
  });

  it('OCR workflow is forfait-safe with intelligent cron (no default LLM)', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/open-code-review.yml'), 'utf8');
    assert.ok(yml.includes('workflow_dispatch'));
    assert.ok(/schedule:/.test(yml));
    assert.ok(yml.includes('50 5 * * 1,4'));
    assert.ok(yml.includes('AI_FORCE_LOCAL'));
    assert.ok(yml.includes('ocr-intelligent-cron.js'));
    assert.ok(yml.includes('check:p2582'));
    assert.ok(!/full_llm_review.*true.*default/i.test(yml) || yml.includes("default: 'false'"));
  });

  it('soft hooks wire OCR intelligent into regular automations', () => {
    const hooks = [
      'code-quality.yml',
      'project-resilience.yml',
      'recurrent-orchestrator.yml',
      'auto-enrich-closed-loop.yml',
      'forum-poll.yml',
    ];
    for (const name of hooks) {
      const yml = fs.readFileSync(path.join(ROOT, '.github/workflows', name), 'utf8');
      assert.ok(
        yml.includes('ocr-intelligent-cron.js'),
        `${name} must soft-hook OCR intelligent`,
      );
      assert.ok(yml.includes('continue-on-error: true') || yml.includes('OCR_SOFT_WARN'));
    }
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

  it('package.json wires review:ocr / intelligent and check:p2582', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2582']);
    assert.ok(pkg.scripts['review:ocr']);
    assert.ok(pkg.scripts['review:ocr:rules']);
    assert.ok(pkg.scripts['review:ocr:intelligent']);
  });
});
