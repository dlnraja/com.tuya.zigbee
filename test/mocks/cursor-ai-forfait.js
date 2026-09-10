'use strict';

/**
 * P2437 — Cursor AI forfait mocks + PoC payloads (Task / subagentStart).
 * Completes coverage for hooks without burning real Grok quota.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.join(__dirname, '../..');

/** Minimal forfait cfg for isolated unit tests (no shared day state). */
function createForfaitCfgMock(overrides = {}) {
  return {
    _meta: { id: 'P2437-mock' },
    mode: 'forfait',
    defaults: {
      AI_PLAN_MODE: 'forfait',
      AI_ALLOW_PAID: 'false',
      AI_GLOBAL_DAILY_CAP: '120',
      AI_SOFT_STOP_PERCENT: '70',
      GMAIL_DIAG_AI_MAX: '0',
      preferLocalHeuristics: true,
    },
    cursorIde: {
      preferModel: 'inherit',
      forbidModels: ['grok', 'cursor-grok', 'opus', 'o1', 'o3'],
      forbidCloudAgents: true,
      forbidHeavySubagents: true,
      maxParallelSubagents: 1,
      maxSubagentsPerDay: 3,
      ...(overrides.cursorIde || {}),
    },
    includedDailyCaps: {
      grok: 0,
      'cursor-cloud': 0,
      gemini: 80,
      ...(overrides.includedDailyCaps || {}),
    },
    blockedUnlessPaidFlag: ['openai', 'deepseek', 'grok', 'cursor-cloud'],
    ...overrides,
  };
}

/** Temp state file for parallel/day-cap PoCs */
function createTempStatePath(prefix = 'p2437-subagent') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  return path.join(dir, 'cursor-subagent-day.json');
}

/** PoC: Grok Task spawn (must deny) */
function pocGrokTaskPayload() {
  return {
    tool_name: 'Task',
    model: 'cursor-grok-4.6-xhigh-fast',
    subagent_type: 'explore',
    environment: 'local',
  };
}

/** PoC: cloud agent (must deny) */
function pocCloudAgentPayload() {
  return {
    tool_input: {
      model: 'inherit',
      subagent_type: 'explore',
      environment: 'cloud',
    },
  };
}

/** PoC: heavy generalPurpose (must deny on forfait) */
function pocHeavySubagentPayload() {
  return {
    model: 'inherit',
    subagent_type: 'generalPurpose',
  };
}

/** PoC: allowed explore+inherit */
function pocExploreInheritPayload() {
  return {
    model: 'inherit',
    subagent_type: 'explore',
    environment: 'local',
  };
}

/** PoC: nested Task tool_input shape from Cursor hooks */
function pocNestedTaskToolInput(model = 'cursor-grok-4.6-xhigh-fast') {
  return {
    tool_input: {
      model,
      subagent_type: 'explore',
      environment: 'local',
    },
  };
}

function loadLiveForfaitCfg() {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'config', 'security', 'ai-plan-forfait.json'), 'utf8'),
  );
}

module.exports = {
  createForfaitCfgMock,
  createTempStatePath,
  pocGrokTaskPayload,
  pocCloudAgentPayload,
  pocHeavySubagentPayload,
  pocExploreInheritPayload,
  pocNestedTaskToolInput,
  loadLiveForfaitCfg,
  ROOT,
};
