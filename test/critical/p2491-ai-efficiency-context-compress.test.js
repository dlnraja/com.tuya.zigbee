'use strict';

/**
 * P2491 — AI efficiency / context compress Contre quoi
 * - Default remote AI OFF (AI_ALLOW_REMOTE unset)
 * - Slim LOADED_RULES via project-smart-map (not 50KB+ dump)
 * - compress strips secrets, keeps mfr+pid
 * - ensemble/map-reduce off by default
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '../..');

describe('P2491 AI efficiency SSOT files', () => {
  it('smart map + compress ssot + forfait exist', () => {
    for (const rel of [
      'config/architecture/project-smart-map.json',
      'config/security/ai-context-compress-ssot.json',
      'config/security/ai-plan-forfait.json',
      'tools/ci/ai-context-compress.js',
      'docs/architecture/AI_EFFICIENCY_SSOT.md',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), rel);
    }
  });

  it('forfait defaults force local / deny remote / lower caps', () => {
    const f = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/security/ai-plan-forfait.json'), 'utf8'));
    assert.strictEqual(f.defaults.AI_FORCE_LOCAL, 'true');
    assert.strictEqual(f.defaults.AI_ALLOW_REMOTE, 'false');
    assert.strictEqual(f.defaults.AI_ENSEMBLE, 'false');
    assert.ok(Number(f.defaults.AI_GLOBAL_DAILY_CAP) <= 80);
    assert.ok(Number(f.defaults.AI_SOFT_STOP_PERCENT) <= 60);
    assert.ok(Number(f.includedDailyCaps.gemini) <= 40);
    assert.strictEqual(f.includedDailyCaps.grok, 0);
  });
});

describe('P2491 compress + slim rules', () => {
  it('compressUserText keeps couple and drops secrets', () => {
    const {
      compressUserText,
      buildSlimSystemPrompt,
      remoteAiAllowed,
      ensembleAllowed,
    } = require('../../tools/ci/ai-context-compress');
    const out = compressUserText(
      [
        'Authorization: Bearer SECRET',
        'networkKey: aabb',
        'Error capability_id_not_available_on_device',
        '_TZ3000_mrpevh8p TS0041',
        'noise '.repeat(2000),
      ].join('\n'),
      { maxChars: 900 },
    );
    assert.ok(/mrpevh8p/i.test(out));
    assert.ok(/TS0041/.test(out));
    assert.ok(!/Bearer SECRET/i.test(out));
    assert.ok(!/networkKey: aabb/i.test(out));
    const sys = buildSlimSystemPrompt('short core', { maxChars: 2500 });
    assert.ok(sys.length < 4500);
    assert.ok(/smart map|P2491|identity/i.test(sys));
    assert.strictEqual(remoteAiAllowed({}), false);
    assert.strictEqual(ensembleAllowed(), false);
  });

  it('project-rules LOADED_RULES is slim without AI_FULL_CONTEXT', () => {
    delete process.env.AI_FULL_CONTEXT;
    // Clear require cache so env is re-read
    const prPath = require.resolve('../../.github/scripts/project-rules');
    delete require.cache[prPath];
    const { LOADED_RULES } = require('../../.github/scripts/project-rules');
    assert.ok(LOADED_RULES.length < 8000, `LOADED_RULES too big: ${LOADED_RULES.length}`);
    assert.ok(/project-smart-map|smart-map|identity/i.test(LOADED_RULES));
  });

  it('shouldSkipAI true by default; false only with allow remote', async () => {
    const ahPath = require.resolve('../../.github/scripts/ai-helper');
    delete require.cache[ahPath];
    delete process.env.AI_ALLOW_REMOTE;
    process.env.AI_FORCE_LOCAL = 'true';
    const { shouldSkipAI } = require('../../.github/scripts/ai-helper');
    assert.strictEqual(shouldSkipAI({}), true);
    assert.strictEqual(shouldSkipAI({ forceAI: true }), false);
  });
});

describe('P2491 workflow env / cron hints', () => {
  it('key workflows set AI_FORCE_LOCAL or compress ssot cronHints present', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/security/ai-context-compress-ssot.json'), 'utf8'),
    );
    assert.ok(ssot.cronHints.l99Inbox);
    assert.ok(ssot.cronHints.autoEnrich);
    const wf = [
      '.github/workflows/driver-maintenance.yml',
      '.github/workflows/monthly-scan.yml',
      '.github/workflows/l99-inbox-intelligence.yml',
      '.github/workflows/forum-poll.yml',
      '.github/workflows/auto-enrich-closed-loop.yml',
    ];
    for (const rel of wf) {
      const t = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.ok(/AI_FORCE_LOCAL:\s*['\"]?true/i.test(t), `${rel} missing AI_FORCE_LOCAL`);
    }
  });
});
