'use strict';

/**
 * P2438 — Multi-source harvest + local solver + AI skip (no regression)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '../..');
const {
  solveIssueLocal,
  solveDiagTextLocal,
  KNOWN_OPEN_COUPLES,
  endpointClustersOk,
} = require('../../tools/ci/local-intelligent-solver');
const {
  OPEN_ISSUE_FIXTURES,
  DIAG_CRASH_FIXTURE,
  FORUM_SHADOW_FIXTURE,
  mockGmailDiagBundle,
} = require('../mocks/multi-source-harvest');
const { shouldSkipAI, budgetAllows } = require('../../.github/scripts/ai-helper');
const { simulateHomeyZigbeeMatch } = require('../mocks/homey-zigbee-match');

describe('P2438 — open GH issue couples (local solver)', () => {
  for (const issue of OPEN_ISSUE_FIXTURES) {
    it(`#${issue.number} resolves catalog OK without AI`, () => {
      const r = solveIssueLocal(issue);
      assert.strictEqual(r.shouldCallAI, false);
      assert.strictEqual(r.mode, 'local_no_ai');
      assert.ok(r.findings.length >= 1, JSON.stringify(r));
      assert.strictEqual(r.catalogOk, true, JSON.stringify(r.findings, null, 2));
      assert.ok(/UPDATE|re-pair|REPAIR/i.test(r.summary + JSON.stringify(r.findings)));
    });
  }

  it('KNOWN_OPEN_COUPLES all locked in compose + endpoints', () => {
    for (const k of KNOWN_OPEN_COUPLES) {
      const eps = endpointClustersOk(k.driver);
      assert.ok(eps.ok, `${k.driver}: ${eps.reason}`);
    }
  });
});

describe('P2438 — diag / forum / gmail mocks', () => {
  it('crash diag text routes blhvsaqf locally', () => {
    const r = solveDiagTextLocal(DIAG_CRASH_FIXTURE);
    assert.ok(r.fps.some((f) => /blhvsaqf/i.test(f)));
    assert.strictEqual(r.catalogOk, true);
  });

  it('forum shadow excerpt Moes → curtain_motor', () => {
    const r = solveIssueLocal({ number: 533, body: FORUM_SHADOW_FIXTURE.excerpt });
    assert.ok(r.findings.some((f) => f.expectedDriver === 'curtain_motor' || f.driver === 'curtain_motor'));
  });

  it('gmail diag bundle mock has mfrs', () => {
    const b = mockGmailDiagBundle();
    assert.ok(b.diagnostics.length >= 2);
    assert.ok(b.diagnostics[0].fps.mfr[0].startsWith('_TZ'));
  });
});

describe('P2438 — Homey match PoC still green for open issues', () => {
  it('switch_4gang ZCL interview matches (no EF00 required)', () => {
    const c = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/switch_4gang/driver.compose.json'), 'utf8'),
    );
    const r = simulateHomeyZigbeeMatch(c.zigbee.endpoints, {
      1: { inputClusters: [0, 4, 5, 6] },
      2: { inputClusters: [4, 5, 6] },
      3: { inputClusters: [4, 5, 6] },
      4: { inputClusters: [4, 5, 6] },
    });
    assert.strictEqual(r.ok, true, r.failures.join('; '));
  });

  it('curtain_motor Moes interview matches', () => {
    const c = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8'),
    );
    const r = simulateHomeyZigbeeMatch(c.zigbee.endpoints, {
      1: { inputClusters: [0, 4, 5, 61184] },
    });
    assert.strictEqual(r.ok, true, r.failures.join('; '));
  });
});

describe('P2438 — AI forfait skip (intelligent limit)', () => {
  it('AI_FORCE_LOCAL skips remote AI', () => {
    const prev = process.env.AI_FORCE_LOCAL;
    process.env.AI_FORCE_LOCAL = 'true';
    try {
      assert.strictEqual(shouldSkipAI(), true);
    } finally {
      if (prev == null) delete process.env.AI_FORCE_LOCAL;
      else process.env.AI_FORCE_LOCAL = prev;
    }
  });

  it('grok provider always blocked', () => {
    const prev = process.env.AI_ALLOW_PAID;
    process.env.AI_ALLOW_PAID = 'false';
    try {
      assert.strictEqual(budgetAllows('grok'), false);
      assert.strictEqual(budgetAllows('cursor-cloud'), false);
    } finally {
      if (prev == null) delete process.env.AI_ALLOW_PAID;
      else process.env.AI_ALLOW_PAID = prev;
    }
  });

  it('workflows wire AI_FORCE_LOCAL or forfait caps on AI bots', () => {
    const files = [
      'bug-report-auto-pr.yml',
      'auto-close-supported.yml',
      'smart-pr-merge.yml',
      'gmail-diagnostics.yml',
      'project-resilience.yml',
    ];
    for (const f of files) {
      const body = fs.readFileSync(path.join(ROOT, '.github', 'workflows', f), 'utf8');
      const ok =
        /AI_FORCE_LOCAL:\s*['"]?true['"]?/.test(body) ||
        /AI_GLOBAL_DAILY_CAP:\s*['"]?120['"]?/.test(body) ||
        /AI_PLAN_MODE:\s*forfait/.test(body);
      assert.ok(ok, f);
    }
  });
});

describe('P2438 — CI scripts present', () => {
  it('local-intelligent-solver.js exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/local-intelligent-solver.js')));
  });

  it('hooks + p2437 tests exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, '.cursor/hooks.json')));
    assert.ok(fs.existsSync(path.join(ROOT, 'test/critical/p2437-ai-forfait-cursor-hooks.test.js')));
  });
});
