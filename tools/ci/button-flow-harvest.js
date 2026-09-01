#!/usr/bin/env node
'use strict';

/**
 * button-flow-harvest.js (P2364)
 * Harvest all button/scene/knob/remote/SOS drivers — flows, cards, triggers.
 * Cross-checks FlowCardHeuristics resolution vs declared compose IDs.
 *
 * Usage:
 *   node tools/ci/button-flow-harvest.js
 *   node tools/ci/button-flow-harvest.js --apply-fixes
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const DATE = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.join(ROOT, 'reports', `button-flow-harvest-${DATE}`);
const APPLY = process.argv.includes('--apply-fixes');
const STRICT = process.argv.includes('--strict');

const BUTTON_ID_RE = /button|scene_switch|knob|remote|sos/i;
const IR_REMOTE_EXEMPT = new Set(['ir_remote', 'wifi_ir_remote']);
const PRESS_TYPES = ['single', 'double', 'long', 'hold', 'triple', 'release'];
/** Press types not declared on most remotes — runtime may skip or use app-level cards. */
const OPTIONAL_PRESS_TYPES = new Set(['hold', 'release', 'triple']);
const APP_BUTTON_TRIGGERS = [
  'button_pressed', 'button_double_press', 'button_long_press', 'button_triple_clicked',
  'button_multi_press', 'button_release', 'button_matrix', 'virtual_button_pressed',
  'remote_button_pressed', 'knob_rotated',
];

const {
  buildPhysicalFlowCandidates,
  resolveFlowCardId,
} = require('../../lib/flow/FlowCardHeuristics');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
}

function isButtonDriver(driverId, compose) {
  if (IR_REMOTE_EXEMPT.has(driverId)) return false;
  if (!compose) return false;
  if (compose.class === 'button') return true;
  return BUTTON_ID_RE.test(driverId);
}

function inferEffectiveGangCount(driverId, compose, flowPath) {
  let gangCount = inferGangCount(driverId, compose);
  if (compose?.class === 'socket' && fs.existsSync(flowPath)) {
    try {
      const flow = readJson(flowPath);
      const ids = (flow.triggers || []).map((t) => t.id).join(' ');
      // WHY(P2370): socket hybrids (plug/USB/valve) keep button.1+button.2 caps but
      // declare switch_1gang or physical_on/off — not Ngang multi-gang cards.
      if (/_switch_1gang_/i.test(ids)) gangCount = 1;
      else if (/physical_on|physical_off/i.test(ids) && !/_button_\d+gang_/i.test(ids)) gangCount = 1;
    } catch { /* ignore */ }
  }
  return gangCount;
}

function hasDeclaredNgangCards(declaredIds, driverId, gangCount) {
  const prefix = `${driverId.toLowerCase()}_button_${gangCount}gang_button_`;
  for (const id of declaredIds) {
    const lower = String(id).toLowerCase();
    if (lower.startsWith(prefix) || lower.includes('_button_1gang_button_')) return true;
  }
  return false;
}

function hasHashedButtonFlowCards(declaredIds) {
  for (const id of declaredIds) {
    if (/_button_(wireless|1gang)_?[a-f0-9]{4,6}$/i.test(id)) return true;
    if (/_button_\d+gang_but_[a-f0-9]{4,6}$/i.test(id)) return true;
  }
  return false;
}

function hasRuntimeButtonRouting(driverId) {
  const devicePath = path.join(DRIVERS_DIR, driverId, 'device.js');
  if (!fs.existsSync(devicePath)) return false;
  const src = fs.readFileSync(devicePath, 'utf8');
  return /registerButtonFlowCards|ButtonDevice|PhysicalButtonMixin|VirtualButtonMixin|triggerFlowCardHeuristic|buildPhysicalFlowCandidates/i.test(src);
}

function isOptionalPressMiss(pressType, declaredIds) {
  if (!OPTIONAL_PRESS_TYPES.has(pressType)) return false;
  const needle = pressType.toLowerCase();
  for (const id of declaredIds) {
    if (String(id).toLowerCase().includes(needle)) return false;
  }
  return true;
}

function countButtonCaps(caps) {
  const btn = (caps || []).filter((c) => /^button(\.|$)/.test(c));
  const numbered = btn.filter((c) => /^button\.\d+$/.test(c));
  return Math.max(numbered.length, btn.includes('button') ? 1 : 0, 0);
}

function inferGangCount(driverId, compose) {
  const m = driverId.match(/(\d+)(?:gang|ch|_gang)/i);
  if (m) return Number(m[1]);
  const ch = driverId.match(/6ch/i) ? 6 : 0;
  if (ch) return ch;
  return countButtonCaps(compose?.capabilities) || 1;
}

function loadAppFlowIds() {
  const app = readJson(path.join(ROOT, 'app.json'));
  const ids = new Set();
  for (const kind of ['triggers', 'conditions', 'actions']) {
    for (const t of app.flow?.[kind] || []) {
      if (t?.id) ids.add(t.id);
    }
  }
  return ids;
}

function loadAppFlowIdsByPrefix(driverId) {
  const app = readJson(path.join(ROOT, 'app.json'));
  const prefix = `${driverId}_`;
  const ids = new Set();
  for (const kind of ['triggers', 'conditions', 'actions']) {
    for (const t of app.flow?.[kind] || []) {
      if (t?.id && t.id.startsWith(prefix)) ids.add(t.id);
    }
  }
  return ids;
}

function inferRuntimePath(driverId, compose) {
  if (/scene_switch/i.test(driverId)) return 'ButtonDevice+PhysicalButtonMixin+0xFD';
  if (/sos|emergency/i.test(driverId)) return 'ButtonDevice+IAS+physical_on/off';
  if (/knob|rotary/i.test(driverId)) return 'ButtonDevice+multistate+knob_rotated';
  if (/remote|ir/i.test(driverId)) return 'PhysicalButtonMixin+ZCL OnOff/multistate';
  if (compose.class === 'button') return 'ButtonDevice+VirtualButtonMixin+PhysicalButtonMixin';
  if (compose.class === 'socket') return 'ButtonDevice+onoff.gang hybrid';
  return 'PhysicalButtonMixin';
}

function buildSacredCouples(compose) {
  const mfrs = [].concat(compose.zigbee?.manufacturerName || []).filter((m) => !/_hybrid_|needs_/i.test(m));
  const pids = [].concat(compose.zigbee?.productId || []);
  const out = [];
  for (const m of mfrs.slice(0, 8)) {
    for (const p of pids.slice(0, 4)) {
      out.push(`${m}+${p}`);
    }
  }
  return out.slice(0, 12);
}

function harvestDriver(driverId) {
  const base = path.join(DRIVERS_DIR, driverId);
  const composePath = path.join(base, 'driver.compose.json');
  const flowPath = path.join(base, 'driver.flow.compose.json');
  if (!fs.existsSync(composePath)) return null;

  const compose = readJson(composePath);
  if (!isButtonDriver(driverId, compose)) return null;

  const flow = fs.existsSync(flowPath) ? readJson(flowPath) : { triggers: [], conditions: [], actions: [] };
  const gangCount = inferEffectiveGangCount(driverId, compose, flowPath);
  const triggers = (flow.triggers || []).map((t) => t.id);
  const declared = new Set(triggers);
  const appDriverIds = loadAppFlowIdsByPrefix(driverId);
  const missingInApp = triggers.filter((id) => !appDriverIds.has(id));

  const heuristicGaps = [];
  const heuristicFalsePositives = [];
  const isButtonClass = compose.class === 'button' || /scene_switch|button_wireless|remote_button|smart_knob/.test(driverId);
  const isButtonDevice = compose.class === 'button'
    || /scene_switch|smart_knob/.test(driverId)
    || (compose.class !== 'socket' && /button_wireless|remote_button/.test(driverId));
  const declaredNgang = hasDeclaredNgangCards(declared, driverId, gangCount);
  const declaredHashed = hasHashedButtonFlowCards(declared);
  const runtimeRouted = hasRuntimeButtonRouting(driverId);
  if (isButtonClass && triggers.length > 0) {
    for (let gang = 1; gang <= Math.min(gangCount, 8); gang++) {
      for (const pressType of PRESS_TYPES) {
        const candidates = buildPhysicalFlowCandidates(driverId, gang, pressType, {
          gangCount,
          isButtonDevice,
        });
        const hit = resolveFlowCardId(candidates, declared);
        if (!hit && candidates.length) {
          const gap = { gang, pressType, tried: candidates.slice(0, 4) };
          const falsePositive = isOptionalPressMiss(pressType, declared)
            || (declaredNgang && !OPTIONAL_PRESS_TYPES.has(pressType))
            || declaredHashed
            || (runtimeRouted && compose.class === 'socket')
            || (runtimeRouted && compose.class === 'button' && /emergency|sos|knob|rotary/i.test(driverId));
          if (falsePositive) heuristicFalsePositives.push(gap);
          else heuristicGaps.push(gap);
        }
      }
    }
  }

  const issues = [];
  if (triggers.length === 0 && countButtonCaps(compose.capabilities) > 0 && !IR_REMOTE_EXEMPT.has(driverId)) {
    issues.push({ type: 'empty_flow_compose', severity: 'high' });
  }
  if (heuristicGaps.length > 0) {
    issues.push({ type: 'heuristic_miss', severity: 'medium', count: heuristicGaps.length, sample: heuristicGaps.slice(0, 3) });
  }
  if (heuristicFalsePositives.length > 0) {
    issues.push({
      type: 'heuristic_false_positive',
      severity: 'info',
      count: heuristicFalsePositives.length,
      sample: heuristicFalsePositives.slice(0, 3),
      reason: declaredHashed
        ? 'hashed Ngang cards — runtime ButtonDevice/FlowCardHeuristics resolves'
        : declaredNgang
          ? 'Ngang cards declared — CI tries generic patterns first; runtime resolves'
          : runtimeRouted
            ? 'socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on'
            : 'optional press type not declared',
    });
  }
  for (const t of flow.triggers || []) {
    if (t.titleFormatted && JSON.stringify(t.titleFormatted).includes('[[device]]')) {
      issues.push({ type: 'banned_device_token', severity: 'high', id: t.id });
    }
  }

  if (missingInApp.length > 0 && triggers.length > 0) {
    issues.push({ type: 'app_json_drift', severity: 'high', count: missingInApp.length, sample: missingInApp.slice(0, 5) });
  }

  return {
    driverId,
    class: compose.class,
    gangCount,
    runtimePath: inferRuntimePath(driverId, compose),
    sacredCouples: buildSacredCouples(compose),
    buttonCapabilities: (compose.capabilities || []).filter((c) => c.startsWith('button')),
    triggerCount: triggers.length,
    conditionCount: (flow.conditions || []).length,
    actionCount: (flow.actions || []).length,
    triggerIds: triggers,
    missingInAppJson: missingInApp.slice(0, 20),
    heuristicResolvable: heuristicGaps.length === 0,
    heuristicGaps: heuristicGaps.slice(0, 12),
    heuristicFalsePositives: heuristicFalsePositives.slice(0, 12),
    issues,
    productIds: compose.zigbee?.productId || [],
    mfrCount: (compose.zigbee?.manufacturerName || []).length,
  };
}

function applyFixes() {
  const fixes = [];

  // smart_knob — 1-gang ButtonDevice parity
  const bw1 = readJson(path.join(DRIVERS_DIR, 'button_wireless_1/driver.flow.compose.json'));
  const skFlow = JSON.parse(JSON.stringify(bw1).replace(/button_wireless_1/g, 'smart_knob'));
  writeJson(path.join(DRIVERS_DIR, 'smart_knob/driver.flow.compose.json'), skFlow);
  fixes.push({ driver: 'smart_knob', triggers: skFlow.triggers.length });

  // scene_switch_6ch — full 6gang parity from scene_switch_6
  const ss6 = fs.readFileSync(path.join(DRIVERS_DIR, 'scene_switch_6/driver.flow.compose.json'), 'utf8')
    .replace(/scene_switch_6/g, 'scene_switch_6ch');
  const ss6ch = JSON.parse(ss6);
  for (let i = 1; i <= 6; i++) {
    const legacyId = `scene_switch_6ch_button_${i}_pressed`;
    if (!ss6ch.triggers.some((t) => t.id === legacyId)) {
      ss6ch.triggers.push({
        id: legacyId,
        title: { en: `Button ${i} pressed (legacy)`, fr: `Bouton ${i} appuyé` },
        args: [],
        titleFormatted: { en: `Button ${i} pressed`, fr: `Bouton ${i} appuyé` },
      });
    }
  }
  writeJson(path.join(DRIVERS_DIR, 'scene_switch_6ch/driver.flow.compose.json'), ss6ch);
  fixes.push({ driver: 'scene_switch_6ch', triggers: ss6ch.triggers.length });

  // remote_button_wireless_smart — fix copied remote_button_wireless_1 prefix drift
  const rbsPath = path.join(DRIVERS_DIR, 'remote_button_wireless_smart/driver.flow.compose.json');
  if (fs.existsSync(rbsPath)) {
    const raw = fs.readFileSync(rbsPath, 'utf8').replace(/remote_button_wireless_1/g, 'remote_button_wireless_smart');
    writeJson(rbsPath, JSON.parse(raw));
    fixes.push({ driver: 'remote_button_wireless_smart', prefixFix: true });
  }

  const dedupeScript = path.join(ROOT, 'tools/ci/sync-appjson-flow-dedupe.js');
  if (fs.existsSync(dedupeScript)) {
    const { spawnSync } = require('child_process');
    const res = spawnSync(process.execPath, [dedupeScript, '--apply'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
    });
    fixes.push({ appJsonFlowDedupe: res.status === 0 });
  }

  return fixes;
}

function buildNeedAction(drivers, exemptDrivers) {
  const lines = [
    '# Button Flow Harvest — NEED_ACTION',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Exempt (not button-flow scope)',
    '',
  ];
  if (exemptDrivers.length) {
    for (const id of exemptDrivers) {
      lines.push(`- \`${id}\` — IR remote, 0 button triggers expected`);
    }
  } else {
    lines.push('- (none)');
  }
  lines.push('', '## Known false positives (runtime OK)', '');
  lines.push('CI harvest tries generic patterns first; `FlowCardHeuristics` + `ButtonDevice` resolve Ngang/hashed/socket cards at runtime.', '');

  const falsePos = drivers.filter((d) => d.issues.some((i) => i.type === 'heuristic_false_positive'));
  if (!falsePos.length) {
    lines.push('- (none)', '');
  } else {
    for (const d of falsePos) {
      const fp = d.issues.find((i) => i.type === 'heuristic_false_positive');
      lines.push(`- \`${d.driverId}\` (${d.class}) — ${fp.count} CI-only misses; ${fp.reason}`);
    }
    lines.push('');
  }

  lines.push('## Open issues', '');
  const flagged = drivers.filter((d) => d.issues.some((i) => i.severity === 'high' || i.type === 'heuristic_miss'));
  if (!flagged.length) {
    lines.push('No blocking issues — all button drivers OK for publish.');
    return lines.join('\n');
  }
  for (const d of flagged) {
    lines.push(`### ${d.driverId} (${d.class}, ${d.triggerCount} triggers)`);
    for (const issue of d.issues.filter((i) => i.severity === 'high' || i.type === 'heuristic_miss')) {
      lines.push(`- **${issue.type}** (${issue.severity})${issue.id ? `: \`${issue.id}\`` : ''}${issue.count ? ` — ${issue.count} hits` : ''}`);
      if (issue.sample && issue.type === 'heuristic_miss') {
        for (const s of issue.sample) {
          lines.push(`  - gang ${s.gang} ${s.pressType}: tried ${(s.tried || []).join(', ')}`);
        }
      } else if (issue.sample) {
        for (const s of issue.sample) {
          lines.push(`  - \`${s}\``);
        }
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

if (APPLY) {
  const fixes = applyFixes();
  console.log('[button-flow-harvest] --apply-fixes:', fixes);
}

const appIds = loadAppFlowIds();
const exemptDrivers = [...IR_REMOTE_EXEMPT].sort();
const drivers = [];
for (const name of fs.readdirSync(DRIVERS_DIR)) {
  const row = harvestDriver(name);
  if (row) drivers.push(row);
}
drivers.sort((a, b) => a.driverId.localeCompare(b.driverId));

const summary = {
  generatedAt: new Date().toISOString(),
  driverCount: drivers.length,
  exemptIrDrivers: exemptDrivers,
  totalTriggers: drivers.reduce((s, d) => s + d.triggerCount, 0),
  totalConditions: drivers.reduce((s, d) => s + d.conditionCount, 0),
  totalActions: drivers.reduce((s, d) => s + d.actionCount, 0),
  driversWithIssues: drivers.filter((d) => d.issues.some((i) => i.severity === 'high' || i.type === 'heuristic_miss')).length,
  highSeverityIssues: drivers.reduce((n, d) => n + d.issues.filter((i) => i.severity === 'high').length, 0),
  heuristicMissDrivers: drivers.filter((d) => d.heuristicGaps.length > 0).length,
  heuristicFalsePositiveDrivers: drivers.filter((d) => (d.heuristicFalsePositives || []).length > 0).length,
  appJsonDriftDrivers: drivers.filter((d) => d.missingInAppJson?.length > 0).length,
  appLevelButtonTriggers: APP_BUTTON_TRIGGERS.filter((id) => appIds.has(id)),
  appLevelButtonTriggersMissing: APP_BUTTON_TRIGGERS.filter((id) => !appIds.has(id)),
  topByTriggers: drivers
    .slice()
    .sort((a, b) => b.triggerCount - a.triggerCount)
    .slice(0, 15)
    .map((d) => ({ driverId: d.driverId, triggers: d.triggerCount })),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
writeJson(path.join(OUT_DIR, 'summary.json'), summary);
writeJson(path.join(OUT_DIR, 'drivers.json'), drivers);
fs.writeFileSync(path.join(OUT_DIR, 'NEED_ACTION.md'), buildNeedAction(drivers, exemptDrivers));

const md = [
  `# Button Flow Harvest — ${DATE}`,
  '',
  `| Metric | Value |`,
  `|--------|------:|`,
  `| Button-related drivers | ${summary.driverCount} |`,
  `| Total trigger cards | ${summary.totalTriggers} |`,
  `| Drivers with issues | ${summary.driversWithIssues} |`,
  '',
  '## Top drivers by trigger count',
  '',
  ...summary.topByTriggers.map((d) => `- \`${d.driverId}\`: ${d.triggers}`),
  '',
  '## App-level button triggers',
  '',
  ...APP_BUTTON_TRIGGERS.map((id) => `- ${appIds.has(id) ? '✓' : '✗'} \`${id}\``),
  '',
];
fs.writeFileSync(path.join(OUT_DIR, 'HARVEST.md'), md.join('\n'));

console.log(JSON.stringify(summary, null, 2));
const exitCode = STRICT && summary.highSeverityIssues > 0 ? 1 : 0;
process.exit(exitCode);
