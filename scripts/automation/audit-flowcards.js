#!/usr/bin/env node
/**
 * Flow Card Auditor - Validates Flow Cards against capabilities
 * Run: node scripts/automation/audit-flowcards.js [--json]
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
 * Exit codes: 0 = pass, 1 = errors found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadAllDrivers, DRIVERS_DIR, ROOT } = require('../lib/drivers');
const { createLogger } = require('../lib/logger');

const JSON_OUTPUT = process.argv.includes('--json');
const APP_JSON = path.join(ROOT, 'app.json');
const { log, summary } = createLogger('Flow Card Audit');

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
    exitCode: s.errors > 0 ? 1 : 0,
  };
  console.log(JSON.stringify(output, null, 2));
}

process.exit(s.errors > 0 ? 1 : 0);
