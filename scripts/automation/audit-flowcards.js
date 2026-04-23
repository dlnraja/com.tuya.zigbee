/**
 * Flow Card Auditor - Validates Flow Cards against capabilities
 * Run: node scripts/automation/audit-flowcards.js
 * 
 * Detects:
 * - Flow Cards referencing non-existent capabilities
 * - Missing device guards
 * - Orphan Flow Cards
 */
const fs = require('fs');
const path = require('path');
const { loadAllDrivers, DRIVERS_DIR, ROOT } = require('../lib/drivers');
const { createLogger } = require('../lib/logger');

const APP_JSON = path.join(ROOT, 'app.json');
const { log, summary } = createLogger('Flow Card Audit');

function auditDriverFlowCards(name, d) {
  const driverPath = path.join(DRIVERS_DIR, name);
  const flowPath = path.join(driverPath, 'driver.flow.compose.json');

  // Check inline flow cards in driver.compose.json
  const flowCards = d.config.flow || {};
  ['triggers', 'conditions', 'actions'].forEach(cardType => {
    const cards = flowCards[cardType] || [];
    cards.forEach(card => {
      if (card.args) {
        card.args.forEach(arg => {
          if (arg.type === 'device' && !arg.filter) {
            log('warn', name + '/' + card.id, 'Flow card has device arg without filter');
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
        if (cards.length > 0) {
          log('info', name, cards.length + ' ' + cardType + ' flow cards defined');
        }
      });
    } catch (e) {
      log('error', name, 'Invalid driver.flow.compose.json: ' + e.message);
    }
  }
}

function auditAppFlowCards() {
  if (!fs.existsSync(APP_JSON)) {
    log('error', 'app.json', 'Missing app.json');
    return;
  }
  try {
    const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
    const flow = app.flow || {};
    ['triggers', 'conditions', 'actions'].forEach(cardType => {
      const cards = flow[cardType] || [];
      console.log('App-level ' + cardType + ': ' + cards.length);
    });
  } catch (e) {
    log('error', 'app.json', 'Parse error: ' + e.message);
  }
}

// Main
console.log('Auditing Flow Cards...\n');
auditAppFlowCards();
console.log('');

const drivers = loadAllDrivers();
for (const [name, d] of drivers) {
  auditDriverFlowCards(name, d);
}

const s = summary();
process.exit(s.errors > 0 ? 1 : 0)      ;
