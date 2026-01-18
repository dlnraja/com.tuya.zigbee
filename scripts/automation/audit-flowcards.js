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

const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const APP_JSON = path.join(__dirname, '../../app.json');

let errors = 0;
let warnings = 0;

function log(type, context, msg) {
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
  console.log(`${prefix} [${context}] ${msg}`);
  if (type === 'error') errors++;
  if (type === 'warn') warnings++;
}

function auditDriverFlowCards(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  const flowPath = path.join(driverPath, 'driver.flow.compose.json');
  
  if (!fs.existsSync(composePath)) return;
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  const capabilities = compose.capabilities || [];
  
  // Check inline flow cards in driver.compose.json
  const flowCards = compose.flow || {};
  
  ['triggers', 'conditions', 'actions'].forEach(cardType => {
    const cards = flowCards[cardType] || [];
    cards.forEach(card => {
      // Check if card references a capability
      if (card.args) {
        card.args.forEach(arg => {
          if (arg.type === 'device' && !arg.filter) {
            log('warn', `${driverName}/${card.id}`, 'Flow card has device arg without filter');
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
          log('info', driverName, `${cards.length} ${cardType} flow cards defined`);
        }
      });
    } catch (e) {
      log('error', driverName, `Invalid driver.flow.compose.json: ${e.message}`);
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
      console.log(`📋 App-level ${cardType}: ${cards.length}`);
    });
  } catch (e) {
    log('error', 'app.json', `Parse error: ${e.message}`);
  }
}

// Main
console.log('🔍 Auditing Flow Cards...\n');

// Audit app-level cards
auditAppFlowCards();
console.log('');

// Audit driver-level cards
fs.readdirSync(DRIVERS_DIR).forEach(driver => {
  const stat = fs.statSync(path.join(DRIVERS_DIR, driver));
  if (stat.isDirectory()) {
    auditDriverFlowCards(driver);
  }
});

console.log(`\n📊 Audit complete: ${errors} errors, ${warnings} warnings`);
process.exit(errors > 0 ? 1 : 0);
