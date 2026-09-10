'use strict';

/**
 * P2437 — AI forfait Cursor hooks + plan guard (no regression / mocks / PoC)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '../..');
const {
  decidePermission,
  decrementInFlight,
  forbiddenModel,
} = require('../../.cursor/hooks/limit-subagent-ai');
const { buildReport } = require('../../tools/ci/ai-plan-guard');
const {
  createForfaitCfgMock,
  createTempStatePath,
  pocGrokTaskPayload,
  pocCloudAgentPayload,
  pocHeavySubagentPayload,
  pocExploreInheritPayload,
  pocNestedTaskToolInput,
  loadLiveForfaitCfg,
} = require('../mocks/cursor-ai-forfait');

describe('P2437 — forfait SSOT (live config)', () => {
  it('global cap is 120 and soft-stop 70', () => {
    const cfg = loadLiveForfaitCfg();
    assert.strictEqual(String(cfg.defaults.AI_GLOBAL_DAILY_CAP), '120');
    assert.strictEqual(String(cfg.defaults.AI_SOFT_STOP_PERCENT), '70');
    assert.strictEqual(cfg.defaults.AI_ALLOW_PAID, 'false');
  });

  it('grok and cursor-cloud caps are 0 and blocked unless paid', () => {
    const cfg = loadLiveForfaitCfg();
    assert.strictEqual(cfg.includedDailyCaps.grok, 0);
    assert.strictEqual(cfg.includedDailyCaps['cursor-cloud'], 0);
    assert.ok(cfg.blockedUnlessPaidFlag.includes('grok'));
    assert.ok(cfg.blockedUnlessPaidFlag.includes('cursor-cloud'));
  });

  it('cursorIde forbids grok/cloud/heavy and caps parallel=1', () => {
    const c = loadLiveForfaitCfg().cursorIde;
    assert.ok(c.forbidModels.some((m) => String(m).includes('grok')));
    assert.strictEqual(c.forbidCloudAgents, true);
    assert.strictEqual(c.forbidHeavySubagents, true);
    assert.strictEqual(c.maxParallelSubagents, 1);
    assert.ok(c.maxSubagentsPerDay <= 8);
  });

  it('hooks.json wires subagentStart + Task preToolUse', () => {
    const hooks = JSON.parse(fs.readFileSync(path.join(ROOT, '.cursor', 'hooks.json'), 'utf8'));
    assert.ok(Array.isArray(hooks.hooks.subagentStart));
    assert.ok(Array.isArray(hooks.hooks.preToolUse));
    assert.ok(hooks.hooks.preToolUse.some((h) => h.matcher === 'Task'));
  });
});

describe('P2437 — decidePermission mocks / PoC', () => {
  it('PoC: Grok Task is denied', () => {
    const cfg = createForfaitCfgMock();
    const r = decidePermission(pocGrokTaskPayload(), {
      cfg,
      statePath: createTempStatePath(),
      dryRun: true,
    });
    assert.strictEqual(r.permission, 'deny');
    assert.ok(/Grok|inherit/i.test(r.user_message || ''));
  });

  it('PoC: nested tool_input grok is denied', () => {
    const r = decidePermission(pocNestedTaskToolInput(), {
      cfg: createForfaitCfgMock(),
      statePath: createTempStatePath(),
      dryRun: true,
    });
    assert.strictEqual(r.permission, 'deny');
  });

  it('PoC: cloud environment is denied', () => {
    const r = decidePermission(pocCloudAgentPayload(), {
      cfg: createForfaitCfgMock(),
      statePath: createTempStatePath(),
      dryRun: true,
    });
    assert.strictEqual(r.permission, 'deny');
    assert.ok(/cloud/i.test(r.user_message || ''));
  });

  it('PoC: heavy generalPurpose is denied', () => {
    const r = decidePermission(pocHeavySubagentPayload(), {
      cfg: createForfaitCfgMock(),
      statePath: createTempStatePath(),
      dryRun: true,
    });
    assert.strictEqual(r.permission, 'deny');
  });

  it('PoC: explore+inherit is allowed', () => {
    const statePath = createTempStatePath();
    const r = decidePermission(pocExploreInheritPayload(), {
      cfg: createForfaitCfgMock(),
      statePath,
    });
    assert.strictEqual(r.permission, 'allow');
    const st = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.strictEqual(st.count, 1);
    assert.strictEqual(st.inFlight, 1);
  });

  it('parallel cap: second spawn denied while inFlight>=1', () => {
    const statePath = createTempStatePath();
    const cfg = createForfaitCfgMock();
    const a = decidePermission(pocExploreInheritPayload(), { cfg, statePath });
    assert.strictEqual(a.permission, 'allow');
    const b = decidePermission(pocExploreInheritPayload(), { cfg, statePath });
    assert.strictEqual(b.permission, 'deny');
    assert.ok(/parallel/i.test(b.user_message || ''));
  });

  it('decrementInFlight frees parallel slot', () => {
    const statePath = createTempStatePath();
    const cfg = createForfaitCfgMock();
    assert.strictEqual(decidePermission(pocExploreInheritPayload(), { cfg, statePath }).permission, 'allow');
    decrementInFlight({ statePath });
    assert.strictEqual(decidePermission(pocExploreInheritPayload(), { cfg, statePath }).permission, 'allow');
  });

  it('daily cap soft-stop after maxSubagentsPerDay', () => {
    const statePath = createTempStatePath();
    const cfg = createForfaitCfgMock({
      cursorIde: { maxSubagentsPerDay: 2, maxParallelSubagents: 5 },
    });
    assert.strictEqual(decidePermission(pocExploreInheritPayload(), { cfg, statePath }).permission, 'allow');
    decrementInFlight({ statePath });
    assert.strictEqual(decidePermission(pocExploreInheritPayload(), { cfg, statePath }).permission, 'allow');
    decrementInFlight({ statePath });
    const denied = decidePermission(pocExploreInheritPayload(), { cfg, statePath });
    assert.strictEqual(denied.permission, 'deny');
    assert.ok(/Daily|cap/i.test(denied.user_message || ''));
  });

  it('AI_ALLOW_PAID=true can allow grok (paid escape hatch)', () => {
    const r = decidePermission(pocGrokTaskPayload(), {
      cfg: createForfaitCfgMock(),
      statePath: createTempStatePath(),
      allowPaid: true,
      dryRun: true,
    });
    // still heavy? explore is fine — grok model alone allowed when paid
    assert.strictEqual(r.permission, 'allow');
  });
});

describe('P2437 — forbiddenModel helper', () => {
  it('inherit/default are never forbidden', () => {
    assert.strictEqual(forbiddenModel('inherit', ['grok']), false);
    assert.strictEqual(forbiddenModel('default', ['grok']), false);
    assert.strictEqual(forbiddenModel('', ['grok']), false);
  });

  it('cursor-grok substring matches', () => {
    assert.strictEqual(forbiddenModel('cursor-grok-4.6-xhigh-fast', ['grok']), true);
  });
});

describe('P2437 — ai-plan-guard buildReport', () => {
  it('reports globalCap 120 from forfait defaults', () => {
    const prev = process.env.AI_GLOBAL_DAILY_CAP;
    delete process.env.AI_GLOBAL_DAILY_CAP;
    try {
      const report = buildReport();
      assert.strictEqual(report.globalCap, 120);
      assert.strictEqual(report.mode, 'forfait');
      assert.strictEqual(report.allowPaid, false);
      const grok = report.providers.find((p) => p.name === 'grok');
      assert.ok(grok);
      assert.strictEqual(grok.cap, 0);
      assert.strictEqual(grok.blockedPaid, true);
    } finally {
      if (prev != null) process.env.AI_GLOBAL_DAILY_CAP = prev;
    }
  });
});

describe('P2437 — CLI hook PoC (stdin spawn, no regression)', () => {
  it('CLI denies grok via stdin JSON', () => {
    const statePath = createTempStatePath();
    const r = spawnSync(
      process.execPath,
      [path.join(ROOT, '.cursor', 'hooks', 'limit-subagent-ai.js')],
      {
        input: JSON.stringify(pocGrokTaskPayload()),
        encoding: 'utf8',
        env: {
          ...process.env,
          CURSOR_SUBAGENT_STATE: statePath,
          AI_ALLOW_PAID: 'false',
        },
      },
    );
    assert.strictEqual(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.permission, 'deny');
  });
});

describe('P2437 — workflow env caps aligned (no regression)', () => {
  const files = [
    'gmail-diagnostics.yml',
    'fetch-diags.yml',
    'auto-enrich-closed-loop.yml',
    'fleet-intelligent-enrich.yml',
    'project-resilience.yml',
  ];
  for (const f of files) {
    it(`${f} uses AI_GLOBAL_DAILY_CAP 120`, () => {
      const body = fs.readFileSync(path.join(ROOT, '.github', 'workflows', f), 'utf8');
      assert.ok(/AI_GLOBAL_DAILY_CAP:\s*['"]?120['"]?/.test(body), f);
      assert.ok(!/AI_GLOBAL_DAILY_CAP:\s*['"]?400['"]?/.test(body), f);
    });
  }
});
