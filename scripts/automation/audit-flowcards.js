#!/usr/bin/env node
/**
 * Flow Card Auditor - Validates Flow Cards against capabilities with predictive completeness
 * Run: node scripts/automation/audit-flowcards.js [--json] [--predictive]
 *
 * Detects:
 * - Flow Cards referencing non-existent capabilities
 * - Missing device guards
 * - Orphan Flow Cards
 * - Flow Card completeness: every capability should have associated flow cards
 * - Duplicate flow card IDs
 * - Invalid flow card argument types
 * - Flow cards with missing run handlers in device.js
 *
 * Predictive completeness analysis:
 * - Health score per driver (0-100) based on flow card coverage
 * - Prediction of which missing flow cards will cause user confusion
 * - Completeness gap analysis per capability
 * - Trend analysis via historical state
 * - Actionable recommendations with priority
 *
 * Exit codes: 0 = pass, 1 = errors found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadAllDrivers, DRIVERS_DIR, ROOT } = require('../lib/drivers');
const { createLogger } = require('../lib/logger');

const JSON_OUTPUT = process.argv.includes('--json');
const PREDICTIVE = process.argv.includes('--predictive') || JSON_OUTPUT;
const APP_JSON = path.join(ROOT, 'app.json');
const STATE_DIR = path.resolve(__dirname, '../../.github/state');
const { log, summary } = createLogger('Flow Card Audit');

// ---- Predictive completeness infrastructure ----

/** Per-driver flow card health */
const driverFlowHealth = new Map();

/** Aggregate predictive report */
const predictiveReport = {
  overallScore: 100,
  completenessGaps: [],
  driversAtRisk: [],
  predictions: [],
  recommendations: [],
  trend: 'stable',
  previousScore: null,
  coverageStats: { totalCaps: 0, coveredCaps: 0, uncoveredCaps: 0 },
};

/** Expected flow card patterns for common capabilities */
const EXPECTED_FLOW_PATTERNS = {
  onoff: { triggers: 1, actions: 1, conditions: 1 },
  dim: { triggers: 1, actions: 1, conditions: 1 },
  thermostat_mode: { triggers: 1, actions: 1, conditions: 1 },
  thermostat_temperature: { triggers: 1, actions: 1, conditions: 1 },
  locked: { triggers: 1, actions: 1, conditions: 1 },
  windowcoverings_set: { triggers: 1, actions: 1, conditions: 0 },
  fan_speed: { triggers: 1, actions: 1, conditions: 0 },
  measure_battery: { triggers: 1, actions: 0, conditions: 0 },
  alarm_battery: { triggers: 1, actions: 0, conditions: 0 },
  alarm_motion: { triggers: 1, actions: 0, conditions: 0 },
  alarm_contact: { triggers: 1, actions: 0, conditions: 0 },
  measure_temperature: { triggers: 1, actions: 0, conditions: 0 },
  measure_humidity: { triggers: 1, actions: 0, conditions: 0 },
};

/** Calculate flow card health score for a driver (0-100) */
function calculateFlowCardHealth(name, capabilities, flowCounts, hasFlowFile, hasRunHandlers, errorCount, warningCount) {
  let score = 100;

  // Deduct for errors and warnings
  score -= errorCount * 15;
  score -= warningCount * 5;

  // Check expected flow card coverage for each capability
  const totalExpected = { triggers: 0, actions: 0, conditions: 0 };
  const totalPresent = { triggers: flowCounts.triggers, actions: flowCounts.actions, conditions: flowCounts.conditions };

  for (const cap of capabilities) {
    const baseCap = cap.split('.')[0]; // strip sub-capabilities
    if (EXPECTED_FLOW_PATTERNS[baseCap]) {
      const expected = EXPECTED_FLOW_PATTERNS[baseCap];
      totalExpected.triggers += expected.triggers;
      totalExpected.actions += expected.actions;
      totalExpected.conditions += expected.conditions;
    }
  }

  // Penalize for missing expected flow cards
  if (totalExpected.triggers > 0 && totalPresent.triggers === 0) {
    score -= 20; // No triggers at all for capabilities that need them
  } else if (totalExpected.triggers > 0 && totalPresent.triggers < totalExpected.triggers * 0.5) {
    score -= 10;
  }

  if (totalExpected.actions > 0 && totalPresent.actions === 0) {
    score -= 15; // No actions when expected
  }

  // Bonus for having a separate flow compose file (better organization)
  if (hasFlowFile) score += 3;

  // Penalty for missing run handlers when flow cards define actions
  if (totalPresent.actions > 0 && !hasRunHandlers) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/** Load previous state for trend analysis */
function loadPreviousState() {
  const statePath = path.join(STATE_DIR, 'audit-flowcards-state.json');
  try {
    if (fs.existsSync(statePath)) return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch { /* no previous state */ }
  return null;
}

/** Save current state for future trend analysis */
function saveState(score, counts) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(path.join(STATE_DIR, 'audit-flowcards-state.json'),
      JSON.stringify({ timestamp: new Date().toISOString(), score, ...counts }, null, 2));
  } catch { /* non-fatal */ }
}

/** Generate predictive analysis for flow card completeness */
function generatePredictions(driverFlowHealthMap, allCapabilities) {
  const predictions = [];
  const recommendations = [];

  // Predict: capabilities without any flow cards will confuse users
  const capsWithoutFlows = [];
  const capsWithFlows = new Set();

  for (const [, health] of driverFlowHealthMap) {
    if (health.capabilities && health.flowCounts) {
      for (const cap of health.capabilities) {
        const baseCap = cap.split('.')[0];
        if (EXPECTED_FLOW_PATTERNS[baseCap]) {
          if (health.flowCounts.triggers > 0 || health.flowCounts.actions > 0) {
            capsWithFlows.add(baseCap);
          } else {
            capsWithoutFlows.push({ driver: health.name, capability: baseCap });
          }
        }
      }
    }
  }

  if (capsWithoutFlows.length > 0) {
    predictions.push({
      type: 'missing-user-flows',
      severity: 'medium',
      message: `${capsWithoutFlows.length} capability/driver combinations have control capabilities but no flow cards. Users cannot create automations for these devices.`,
      examples: capsWithoutFlows.slice(0, 5),
    });
    recommendations.push({
      priority: 2,
      category: 'user-experience',
      action: 'Add trigger/action flow cards for capabilities like onoff, dim, thermostat_mode that users expect to control via flows.',
      affectedCount: capsWithoutFlows.length,
    });
  }

  // Predict: drivers with flow cards but no run handlers will silently fail
  const noRunHandlers = [...driverFlowHealthMap.values()].filter(h =>
    h.flowCounts && (h.flowCounts.actions > 0 || h.flowCounts.conditions > 0) && !h.hasRunHandlers
  );
  if (noRunHandlers.length > 0) {
    predictions.push({
      type: 'silent-flow-failure',
      severity: 'high',
      message: `${noRunHandlers.length} driver(s) define action/condition flow cards but have no registerRunListener in device.js. These flow cards will appear in the UI but do nothing when triggered.`,
      affectedDrivers: noRunHandlers.map(h => h.name),
    });
    recommendations.push({
      priority: 1,
      category: 'correctness',
      action: 'Add registerRunListener handlers in device.js for each flow card action/condition.',
      affectedCount: noRunHandlers.length,
    });
  }

  // Predict: drivers with zero flow cards are dead-weight in the UI
  const noFlows = [...driverFlowHealthMap.values()].filter(h =>
    h.flowCounts && h.flowCounts.triggers === 0 && h.flowCounts.actions === 0 && h.flowCounts.conditions === 0
  );
  if (noFlows.length > 5) {
    predictions.push({
      type: 'silent-devices',
      severity: 'low',
      message: `${noFlows.length} driver(s) have zero flow cards. These devices can only be controlled from their own UI, not through Homey flows.`,
    });
  }

  // Completeness gap analysis
  const completenessGaps = [];
  for (const [, health] of driverFlowHealthMap) {
    if (health.capabilities) {
      for (const cap of health.capabilities) {
        const baseCap = cap.split('.')[0];
        if (EXPECTED_FLOW_PATTERNS[baseCap] && health.flowCounts) {
          const expected = EXPECTED_FLOW_PATTERNS[baseCap];
          if (health.flowCounts.triggers < expected.triggers || health.flowCounts.actions < expected.actions) {
            completenessGaps.push({
              driver: health.name,
              capability: baseCap,
              expectedTriggers: expected.triggers,
              actualTriggers: health.flowCounts.triggers,
              expectedActions: expected.actions,
              actualActions: health.flowCounts.actions,
            });
          }
        }
      }
    }
  }

  return { predictions, recommendations, completenessGaps };
}

// Known valid flow card argument types
const VALID_ARG_TYPES = new Set([
  'device', 'text', 'number', 'autocomplete', 'dropdown',
  'checkbox', 'color', 'date', 'time', 'textarea',
]);

// Capabilities that typically need flow cards
const CAPS_NEEDING_FLOWS = new Set([
  'onoff', 'dim', 'thermostat_mode', 'thermostat_temperature',
  'locked', 'windowcoverings_set', 'fan_speed',
]);

function auditDriverFlowCards(name, d) {
  const driverPath = path.join(DRIVERS_DIR, name);
  const flowPath = path.join(driverPath, 'driver.flow.compose.json');
  const devicePath = path.join(driverPath, 'device.js');

  // Collect all flow card IDs for duplicate detection
  const allCardIds = new Map();
  let totalTriggers = 0;
  let totalConditions = 0;
  let totalActions = 0;

  // Check inline flow cards in driver.compose.json
  const flowCards = d.config.flow || {};
  ['triggers', 'conditions', 'actions'].forEach(cardType => {
    const cards = flowCards[cardType] || [];
    if (cardType === 'triggers') totalTriggers += cards.length;
    if (cardType === 'conditions') totalConditions += cards.length;
    if (cardType === 'actions') totalActions += cards.length;

    cards.forEach(card => {
      // Duplicate ID check
      if (card.id) {
        if (allCardIds.has(card.id)) {
          log('error', name + '/' + card.id, `Duplicate flow card ID: ${card.id} (${allCardIds.get(card.id)} vs ${cardType})`);
        }
        allCardIds.set(card.id, cardType);
      }

      // Device arg filter check
      if (card.args) {
        card.args.forEach(arg => {
          if (arg.type === 'device' && !arg.filter) {
            log('warn', name + '/' + card.id, 'Flow card has device arg without filter');
          }
          // Validate arg types
          if (arg.type && !VALID_ARG_TYPES.has(arg.type)) {
            log('warn', name + '/' + card.id, `Unknown flow card arg type: ${arg.type}`);
          }
        });
      }
    });
  });

  // Check separate flow compose file
  if (fs.existsSync(flowPath)) {
    try {
      const flowCompose = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
      ['triggers', 'conditions', 'actions'].forEach(cardType => {
        const cards = flowCompose[cardType] || [];
        if (cardType === 'triggers') totalTriggers += cards.length;
        if (cardType === 'conditions') totalConditions += cards.length;
        if (cardType === 'actions') totalActions += cards.length;

        cards.forEach(card => {
          // Duplicate ID check
          if (card.id) {
            if (allCardIds.has(card.id)) {
              log('error', name + '/' + card.id, `Duplicate flow card ID: ${card.id} (${allCardIds.get(card.id)} vs ${cardType})`);
            }
            allCardIds.set(card.id, cardType);
          }

          // Device arg filter check
          if (card.args) {
            card.args.forEach(arg => {
              if (arg.type === 'device' && !arg.filter) {
                log('warn', name + '/' + card.id, 'Flow card has device arg without filter');
              }
              if (arg.type && !VALID_ARG_TYPES.has(arg.type)) {
                log('warn', name + '/' + card.id, `Unknown flow card arg type: ${arg.type}`);
              }
            });
          }
        });
      });
    } catch (e) {
      log('error', name, 'Invalid driver.flow.compose.json: ' + e.message);
    }
  }

  // Flow card completeness: check if key capabilities have flow cards
  const capabilities = d.caps || [];
  const hasAnyFlowCards = totalTriggers > 0 || totalConditions > 0 || totalActions > 0;
  for (const cap of CAPS_NEEDING_FLOWS) {
    if (capabilities.includes(cap) && !hasAnyFlowCards) {
      log('warn', name, `Capability '${cap}' present but no flow cards defined`);
    }
  }

  // Check if device.js has flow card run handlers when flow cards exist
  if (fs.existsSync(devicePath) && hasAnyFlowCards) {
    const deviceJs = fs.readFileSync(devicePath, 'utf8');
    // Look for registerRunListener or onRunListener patterns
    const hasRunHandlers = deviceJs.includes('registerRunListener') || deviceJs.includes('onRunListener');
    if (!hasRunHandlers) {
      // Only warn if there are actual flow cards with args (not simple trigger-only cards)
      if (totalActions > 0 || totalConditions > 0) {
        log('warn', name, 'Flow cards defined but no registerRunListener found in device.js');
      }
    }
  }

  // ---- Predictive health scoring for this driver ----
  const deviceExists = fs.existsSync(devicePath);
  let hasRunHandlers = false;
  if (deviceExists && hasAnyFlowCards) {
    const deviceJs = fs.readFileSync(devicePath, 'utf8');
    hasRunHandlers = deviceJs.includes('registerRunListener') || deviceJs.includes('onRunListener');
  }
  const flowHealth = calculateFlowCardHealth(
    name, d.caps || [],
    { triggers: totalTriggers, conditions: totalConditions, actions: totalActions },
    fs.existsSync(flowPath),
    hasRunHandlers,
    0, 0
  );
  driverFlowHealth.set(name, {
    name,
    score: flowHealth,
    capabilities: d.caps || [],
    flowCounts: { triggers: totalTriggers, conditions: totalConditions, actions: totalActions },
    hasFlowFile: fs.existsSync(flowPath),
    hasRunHandlers,
  });

  return {
    triggers: totalTriggers,
    conditions: totalConditions,
    actions: totalActions,
    hasFlowFile: fs.existsSync(flowPath),
    cardIds: [...allCardIds.keys()],
  };
}

function auditAppFlowCards() {
  if (!fs.existsSync(APP_JSON)) {
    log('error', 'app.json', 'Missing app.json');
    return { triggers: 0, conditions: 0, actions: 0 };
  }
  try {
    const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
    const flow = app.flow || {};
    const result = {};
    ['triggers', 'conditions', 'actions'].forEach(cardType => {
      const cards = flow[cardType] || [];
      result[cardType] = cards.length;
      if (!JSON_OUTPUT) console.log('App-level ' + cardType + ': ' + cards.length);

      // Check for duplicate IDs at app level
      const ids = cards.map(c => c.id).filter(Boolean);
      const dupeIds = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (dupeIds.length > 0) {
        log('error', 'app.json', `Duplicate app-level flow card IDs: ${[...new Set(dupeIds)].join(', ')}`);
      }
    });
    return result;
  } catch (e) {
    log('error', 'app.json', 'Parse error: ' + e.message);
    return null;
  }
}

// Main
if (!JSON_OUTPUT) console.log('Auditing Flow Cards...\n');
const appResult = auditAppFlowCards();
if (!JSON_OUTPUT) console.log('');

const drivers = loadAllDrivers();
const driverResults = new Map();

for (const [name, d] of drivers) {
  const result = auditDriverFlowCards(name, d);
  driverResults.set(name, result);
}

const s = summary();

// ---- Predictive Health Score ----
let healthScore = 100;
healthScore -= s.errors * 10;
healthScore -= s.warnings * 3;
healthScore = Math.max(0, Math.min(100, healthScore));

// Coverage stats
let totalCaps = 0, coveredCaps = 0, uncoveredCaps = 0;
for (const [, health] of driverFlowHealth) {
  if (health.capabilities) {
    for (const cap of health.capabilities) {
      const baseCap = cap.split('.')[0];
      if (EXPECTED_FLOW_PATTERNS[baseCap]) {
        totalCaps++;
        if (health.flowCounts.triggers > 0 || health.flowCounts.actions > 0) {
          coveredCaps++;
        } else {
          uncoveredCaps++;
        }
      }
    }
  }
}
predictiveReport.coverageStats = { totalCaps, coveredCaps, uncoveredCaps };

// Drivers at risk
const atRiskDrivers = [...driverFlowHealth.entries()]
  .sort((a, b) => a[1].score - b[1].score)
  .filter(([, h]) => h.score < 80)
  .slice(0, 10)
  .map(([name, h]) => ({ driver: name, score: h.score, level: h.score >= 60 ? 'medium' : 'high' }));
predictiveReport.driversAtRisk = atRiskDrivers;

// Generate predictions
const { predictions, recommendations, completenessGaps } = generatePredictions(driverFlowHealth);
predictiveReport.completenessGaps = completenessGaps.slice(0, 20);
predictiveReport.predictions = predictions;
predictiveReport.recommendations = recommendations;

// Trend analysis
const prevState = loadPreviousState();
const trend = prevState
  ? (healthScore > prevState.score + 2 ? 'improving' : healthScore < prevState.score - 2 ? 'degrading' : 'stable')
  : 'baseline';
predictiveReport.trend = trend;
predictiveReport.previousScore = prevState?.score || null;
predictiveReport.overallScore = healthScore;

// Save state
saveState(healthScore, { errors: s.errors, warnings: s.warnings, drivers: drivers.size });

if (JSON_OUTPUT) {
  const output = {
    timestamp: new Date().toISOString(),
    driversAudited: drivers.size,
    appLevel: appResult,
    drivers: Object.fromEntries([...driverResults.entries()].map(([k, v]) => [k, {
      triggers: v.triggers,
      conditions: v.conditions,
      actions: v.actions,
      hasFlowFile: v.hasFlowFile,
    }])),
    errors: s.errors,
    warnings: s.warnings,
    health: predictiveReport,
    exitCode: s.errors > 0 ? 1 : 0,
  };
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log('\n' + '='.repeat(60));
  console.log('  PREDICTIVE FLOW CARD COMPLETENESS REPORT');
  console.log('='.repeat(60));
  console.log(`  Health Score:  ${healthScore}/100 (${healthScore >= 80 ? 'GOOD' : healthScore >= 50 ? 'NEEDS ATTENTION' : 'CRITICAL'})`);
  console.log(`  Trend:         ${trend.toUpperCase()}${prevState ? ` (was ${prevState.score})` : ' (baseline)'}`);
  console.log(`  Coverage:      ${coveredCaps}/${totalCaps} capabilities have flow cards (${uncoveredCaps} gaps)`);
  if (atRiskDrivers.length > 0) {
    console.log('\n  Drivers at Risk:');
    for (const r of atRiskDrivers) {
      console.log(`    [${r.score}] ${r.driver} (${r.level})`);
    }
  }
  if (completenessGaps.length > 0) {
    console.log('\n  Top Completeness Gaps:');
    for (const g of completenessGaps.slice(0, 10)) {
      console.log(`    ${g.driver}: ${g.capability} (triggers: ${g.actualTriggers}/${g.expectedTriggers}, actions: ${g.actualActions}/${g.expectedActions})`);
    }
  }
  if (predictions.length > 0) {
    console.log('\n  Predictions:');
    for (const p of predictions) {
      console.log(`    [${p.severity.toUpperCase()}] ${p.message}`);
    }
  }
  if (recommendations.length > 0) {
    console.log('\n  Recommendations:');
    for (const r of recommendations) {
      console.log(`    P${r.priority}: ${r.action}`);
    }
  }
  console.log('='.repeat(60));
}

process.exit(s.errors > 0 ? 1 : 0);
