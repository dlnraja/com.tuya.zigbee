#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log(' AUDIT EXHAUSTIF FLOW CARDS - TOUS DRIVERS\n');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const issues = {
  missingRegistration: [],
  missingRunListener: [],
  triggeredButNotDefined: [],
  definedButNeverTriggered: [],
  missingTokens: [],
  incorrectCapability: []
};

let stats = {
  driversScanned: 0,
  totalTriggers: 0,
  totalConditions: 0,
  totalActions: 0,
  totalIssues: 0
};

/**
 * Scanner un driver complet
 */
function scanDriver(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  const driverJsPath = path.join(driverPath, 'driver.js');
  const deviceJsPath = path.join(driverPath, 'device.js');

  if (!fs.existsSync(composePath)) {
    return null;
  }

  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const driverJs = fs.existsSync(driverJsPath) ? fs.readFileSync(driverJsPath , 'utf8') : ''      ;
    const deviceJs = fs.existsSync(deviceJsPath) ? fs.readFileSync(deviceJsPath , 'utf8') : ''      ;

    const flow = compose.flow || {};
    const triggers = flow.triggers || [];
    const conditions = flow.conditions || [];
    const actions = flow.actions || [];

    stats.totalTriggers += triggers.length;
    stats.totalConditions += conditions.length;
    stats.totalActions += actions.length;

    const result = {
      driver: driverName,
      triggers: triggers.length,
      conditions: conditions.length,
      actions: actions.length,
      issues: []
    };

    // 
    // CHECK 1: Flow cards dÃ©finis mais non enregistrÃ©s dans driver.js
    // 

    triggers.forEach(trigger => {
      const registrationPattern = `getTriggerCard('${trigger.id}')`;
      if (driverJs && !driverJs.includes(registrationPattern)) {
        result.issues.push({
          type: 'MISSING_REGISTRATION',
          severity: 'CRITICAL',
          card: 'trigger',
          id: trigger.id,
          message: `Trigger '${trigger.id}' dÃ©fini mais NON enregistrÃ© dans driver.js`
        });
        issues.missingRegistration.push({ driver: driverName, type: 'trigger', id: trigger.id });
      }
    });

    conditions.forEach(condition => {
      const registrationPattern = `getConditionCard('${condition.id}')`;
      if (driverJs && !driverJs.includes(registrationPattern)) {
        result.issues.push({
          type: 'MISSING_REGISTRATION',
          severity: 'CRITICAL',
          card: 'condition',
          id: condition.id,
          message: `Condition '${condition.id}' dÃ©finie mais NON enregistrÃ©e dans driver.js`
        });
        issues.missingRegistration.push({ driver: driverName, type: 'condition', id: condition.id });
      }

      // Check runListener
      const runListenerPattern = `registerRunListener`;
      if (driverJs && driverJs.includes(registrationPattern) && !driverJs.includes(runListenerPattern)) {
        result.issues.push({
          type: 'MISSING_RUNLISTENER',
          severity: 'CRITICAL',
          card: 'condition',
          id: condition.id,
          message: `Condition '${condition.id}' enregistrÃ©e mais SANS runListener`
        });
        issues.missingRunListener.push({ driver: driverName, id: condition.id });
      }
    });

    actions.forEach(action => {
      const registrationPattern = `getActionCard('${action.id}')`;
      if (driverJs && !driverJs.includes(registrationPattern)) {
        result.issues.push({
          type: 'MISSING_REGISTRATION',
          severity: 'HIGH',
          card: 'action',
          id: action.id,
          message: `Action '${action.id}' dÃ©finie mais NON enregistrÃ©e dans driver.js`
        });
        issues.missingRegistration.push({ driver: driverName, type: 'action', id: action.id });
      }
    });

    // 
    // CHECK 2: Triggers appelÃ©s dans device.js mais non dÃ©finis
    // 

    const triggerMatches = deviceJs.match(/getTriggerCard\('([^']+)'\)/g);
    if (triggerMatches) {
      triggerMatches.forEach(match => {
        const triggerId = match.match(/'([^']+)'/)[1];
        const isDefined = triggers.some(t => t.id === triggerId);
        if (!isDefined) {
          result.issues.push({
            type: 'TRIGGERED_NOT_DEFINED',
            severity: 'CRITICAL',
            card: 'trigger',
            id: triggerId,
            message: `Trigger '${triggerId}' appelÃ© dans device.js mais NON dÃ©fini dans driver.compose.json`
          });
          issues.triggeredButNotDefined.push({ driver: driverName, id: triggerId });
        }
      });
    }

    // 
    // CHECK 3: Triggers dÃ©finis mais jamais appelÃ©s
    // 

    triggers.forEach(trigger => {
      const triggerPattern = `getTriggerCard('${trigger.id}')`;
      if (deviceJs && !deviceJs.includes(triggerPattern)) {
        result.issues.push({
          type: 'DEFINED_NOT_TRIGGERED',
          severity: 'WARNING',
          card: 'trigger',
          id: trigger.id,
          message: `Trigger '${trigger.id}' dÃ©fini mais JAMAIS appelÃ© dans device.js`
        });
        issues.definedButNeverTriggered.push({ driver: driverName, id: trigger.id });
      }
    });

    // 
    // CHECK 4: Tokens manquants dans triggers
    // 

    triggers.forEach(trigger => {
      // Certains triggers devraient avoir des tokens (changed, threshold, etc.)
      if (trigger.id.includes('changed') || trigger.id.includes('threshold')) {
        if (!trigger.tokens || trigger.tokens.length === 0) {
          result.issues.push({
            type: 'MISSING_TOKENS',
            severity: 'MEDIUM',
            card: 'trigger',
            id: trigger.id,
            message: `Trigger '${trigger.id}' devrait avoir des tokens`
          });
          issues.missingTokens.push({ driver: driverName, id: trigger.id });
        }
      }
    });

    // 
    // CHECK 5: Capability checks dans conditions
    // 

    conditions.forEach(condition => {
      const capabilities = compose.capabilities || [];

      // Extraire capability depuis condition ID (alarm_motion, alarm_contact, etc.)
      let expectedCap = null;
      if (condition.id.includes('alarm_')) {
        expectedCap = condition.id.match(/alarm_\w+/)?.[0]       ;
      } else if (condition.id.includes('onoff')) {
        expectedCap = 'onoff';
      } else if (condition.id.includes('measure_')) {
        expectedCap = condition.id.match(/measure_\w+/)?.[0]      ;
      }

      if (expectedCap && !capabilities.includes(expectedCap)) {
        result.issues.push({
          type: 'INCORRECT_CAPABILITY',
          severity: 'HIGH',
          card: 'condition',
          id: condition.id,
          message: `Condition '${condition.id}' rÃ©fÃ©rence capability '${expectedCap}' non prÃ©sente dans driver`,
          expectedCap
        });
        issues.incorrectCapability.push({ driver: driverName, id: condition.id, capability: expectedCap });
      }
    });

    stats.totalIssues += result.issues.length;

    return result;

  } catch (e) {
    console.error(`    ${driverName}:`, e.message);
    return null;
  }
}

/**
 * Scanner tous les drivers
 */
function scanAllDrivers() {
  console.log(' Scan de tous les drivers...\n');

  const drivers = fs.readdirSync(DRIVERS_DIR).filter(item => {
    return fs.statSync(path.join(DRIVERS_DIR, item)).isDirectory();
  });

  const results = [];

  drivers.forEach(driver => {
    const result = scanDriver(driver);
    if (result) {
      stats.driversScanned++;

      if (result.issues.length > 0) {
        console.log(`     ${driver}: ${result.issues.length} issues`);
        result.issues.forEach(issue => {
          const emoji = issue.severity === 'CRITICAL' ? '' : issue.severity === 'HIGH' ? '' : ''      ;
          console.log(`      ${emoji} ${issue.type}: ${issue.message}`);
        });
        results.push(result);
      }
    }
  });

  return results;
}

// EXÃ‰CUTION
console.log('');
console.log('AUDIT FLOW CARDS - TOUS DRIVERS');
console.log('\n');

const results = scanAllDrivers();

console.log('\n\n');
console.log('STATISTIQUES GLOBALES');
console.log('\n');

console.log(`   Drivers scannÃ©s: ${stats.driversScanned}`);
console.log(`   Total triggers dÃ©finis: ${stats.totalTriggers}`);
console.log(`   Total conditions dÃ©finies: ${stats.totalConditions}`);
console.log(`   Total actions dÃ©finies: ${stats.totalActions}`);
console.log(`   Total issues dÃ©tectÃ©es: ${stats.totalIssues}\n`);

console.log('');
console.log('ISSUES PAR CATÃ‰GORIE');
console.log('\n');

console.log(` CRITICAL - MISSING REGISTRATION: ${issues.missingRegistration.length}`);
if (issues.missingRegistration.length > 0) {
  issues.missingRegistration.forEach(issue => {
    console.log(`   - ${issue.driver}: ${issue.type} '${issue.id}'`);
  });
}

console.log(`\n CRITICAL - MISSING RUNLISTENER: ${issues.missingRunListener.length}`);
if (issues.missingRunListener.length > 0) {
  issues.missingRunListener.forEach(issue => {
    console.log(`   - ${issue.driver}: condition '${issue.id}'`);
  });
}

console.log(`\n CRITICAL - TRIGGERED BUT NOT DEFINED: ${issues.triggeredButNotDefined.length}`);
if (issues.triggeredButNotDefined.length > 0) {
  issues.triggeredButNotDefined.forEach(issue => {
    console.log(`   - ${issue.driver}: trigger '${issue.id}'`);
  });
}

console.log(`\n WARNING - DEFINED BUT NEVER TRIGGERED: ${issues.definedButNeverTriggered.length}`);
if (issues.definedButNeverTriggered.length > 0) {
  console.log(`   (Showing first 10)`);
  issues.definedButNeverTriggered.slice(0, 10).forEach(issue => {
    console.log(`   - ${issue.driver}: trigger '${issue.id}'`);
  });
}

console.log(`\n HIGH - INCORRECT CAPABILITY: ${issues.incorrectCapability.length}`);
if (issues.incorrectCapability.length > 0) {
  issues.incorrectCapability.forEach(issue => {
    console.log(`   - ${issue.driver}: condition '${issue.id}'  '${issue.capability}'`);
  });
}

console.log(`\n MEDIUM - MISSING TOKENS: ${issues.missingTokens.length}`);
if (issues.missingTokens.length > 0) {
  issues.missingTokens.slice(0, 10).forEach(issue => {
    console.log(`   - ${issue.driver}: trigger '${issue.id}'`);
  });
}

// Sauvegarder rapport
const reportFile = path.join(ROOT, 'FLOW_CARDS_AUDIT_REPORT.json');
fs.writeFileSync(reportFile, JSON.stringify({
  timestamp: new Date().toISOString(),
  stats,
  issues,
  results
}, null, 2), 'utf8');

console.log(`\n\n Rapport sauvegardÃ©: ${reportFile}\n`);

console.log('');
console.log('PROCHAINES Ã‰TAPES');
console.log('\n');

const criticalCount = issues.missingRegistration.length + issues.missingRunListener.length + issues.triggeredButNotDefined.length;

if (criticalCount > 0) {
  console.log(`  ${criticalCount} ISSUES CRITIQUES nÃ©cessitent correction IMMÃ‰DIATE\n`);
  console.log('ExÃ©cuter: node scripts/fix_all_flow_issues.js\n');
  process.exit(1);
} else {
  console.log(' Aucune issue critique dÃ©tectÃ©e\n');
  process.exit(0);
}
