#!/usr/bin/env node
'use strict';

/**
 * P2437 — Cursor forfait guard: block Grok / paid / cloud Task burn.
 * stdin: subagentStart | preToolUse(Task) payload
 * stdout: { permission: allow|deny, user_message?, agent_message? }
 *
 * WHY: forfait inclus burns on Grok Task + cloud agents before Homey work finishes.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_CFG = path.join(ROOT, 'config', 'security', 'ai-plan-forfait.json');
const DEFAULT_STATE = path.join(ROOT, '.github', 'state', 'cursor-subagent-day.json');

function loadJson(fp, fallback) {
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJson(fp, obj) {
  try {
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(obj, null, 2));
  } catch {
    /* ignore */
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function forbiddenModel(model, forbidList) {
  const m = String(model || '').toLowerCase();
  if (!m || m === 'inherit' || m === 'default') return false;
  return forbidList.some((f) => m.includes(String(f).toLowerCase()));
}

/**
 * Pure decision + optional state mutation.
 * @param {object} input - hook payload
 * @param {object} [opts]
 * @returns {{ permission: 'allow'|'deny', user_message?: string, agent_message?: string }}
 */
function decidePermission(input, opts = {}) {
  const cfgPath = opts.cfgPath || process.env.AI_PLAN_FORFAIT_CFG || DEFAULT_CFG;
  const statePath = opts.statePath || process.env.CURSOR_SUBAGENT_STATE || DEFAULT_STATE;
  const cfg = opts.cfg || loadJson(cfgPath, {});
  const cursor = cfg.cursorIde || {};
  const forbid = cursor.forbidModels || ['grok', 'opus', 'o1', 'o3'];
  const maxDay = Number(cursor.maxSubagentsPerDay || 8);
  const maxParallel = Number(cursor.maxParallelSubagents || 1);
  const allowPaid = /^(1|true|yes)$/i.test(
    String(
      opts.allowPaid != null
        ? opts.allowPaid
        : process.env.AI_ALLOW_PAID || (cfg.defaults && cfg.defaults.AI_ALLOW_PAID) || 'false',
    ),
  );

  const model =
    input.model ||
    input.subagent_model ||
    (input.tool_input && (input.tool_input.model || input.tool_input.Model)) ||
    (input.input && input.input.model) ||
    '';
  const environment =
    input.environment ||
    (input.tool_input && input.tool_input.environment) ||
    (input.input && input.input.environment) ||
    '';
  const subagentType =
    input.subagent_type ||
    input.subagentType ||
    (input.tool_input && input.tool_input.subagent_type) ||
    (input.input && input.input.subagent_type) ||
    '';

  if (!allowPaid && forbiddenModel(model, forbid)) {
    return {
      permission: 'deny',
      user_message: `Blocked model "${model}" — forfait mode (no Grok/Opus burn). Use inherit / composer only.`,
      agent_message: 'P2437: deny expensive model. Prefer inherit; do the work yourself without Task+Grok.',
    };
  }

  if (cursor.forbidCloudAgents !== false && String(environment).toLowerCase() === 'cloud') {
    return {
      permission: 'deny',
      user_message: 'Cloud agents blocked on forfait. Stay local.',
      agent_message: 'P2437: cloud Task denied. Use local tools only.',
    };
  }

  const heavy = /^(generalPurpose|ci-investigator|bugbot|security-review|best-of-n-runner)$/i.test(
    String(subagentType),
  );
  if (cursor.forbidHeavySubagents !== false && heavy && !allowPaid) {
    return {
      permission: 'deny',
      user_message: `Heavy subagent "${subagentType}" blocked on forfait. Parent agent must work directly.`,
      agent_message: 'P2437: no generalPurpose/bugbot/security/best-of-n unless AI_ALLOW_PAID=true.',
    };
  }

  const st = loadJson(statePath, { date: today(), count: 0, inFlight: 0 });
  if (st.date !== today()) {
    st.date = today();
    st.count = 0;
    st.inFlight = 0;
  }

  if (st.inFlight >= maxParallel) {
    return {
      permission: 'deny',
      user_message: `Max parallel subagents (${maxParallel}) reached.`,
      agent_message: 'P2437: wait; do not spawn parallel Task agents.',
    };
  }

  if (st.count >= maxDay) {
    return {
      permission: 'deny',
      user_message: `Daily Cursor subagent cap (${maxDay}) reached. Soft-stop forfait.`,
      agent_message: 'P2437: daily subagent budget exhausted. Continue without Task.',
    };
  }

  if (opts.dryRun !== true) {
    st.count += 1;
    st.inFlight += 1;
    saveJson(statePath, st);
  }

  return {
    permission: 'allow',
    agent_message: `P2437: subagent allowed (${st.count}/${maxDay} today). Prefer explore+inherit only.`,
  };
}

function decrementInFlight(opts = {}) {
  const statePath = opts.statePath || process.env.CURSOR_SUBAGENT_STATE || DEFAULT_STATE;
  const st = loadJson(statePath, { date: today(), count: 0, inFlight: 0 });
  if (st.date !== today()) {
    st.date = today();
    st.count = 0;
    st.inFlight = 0;
  } else {
    st.inFlight = Math.max(0, Number(st.inFlight || 0) - 1);
  }
  saveJson(statePath, st);
  return st;
}

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function main() {
  const result = decidePermission(readStdin());
  process.stdout.write(JSON.stringify(result));
}

if (require.main === module) {
  main();
}

module.exports = {
  decidePermission,
  decrementInFlight,
  forbiddenModel,
  today,
};
