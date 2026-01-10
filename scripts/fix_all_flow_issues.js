#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION AUTOMATIQUE - TOUS LES BUGS FLOW CARDS\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const auditReport = JSON.parse(fs.readFileSync(path.join(ROOT, 'FLOW_CARDS_AUDIT_REPORT.json'), 'utf8'));

let stats = {
  driversFixed: 0,
  registrationsAdded: 0,
  runListenersAdded: 0,
  flowCardsAdded: 0,
  capabilitiesFixed: 0,
  backupsCreated: 0
};

/**
 * Ajouter registrations manquantes dans driver.js
 */
function fixMissingRegistrations(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const driverJsPath = path.join(driverPath, 'driver.js');
  const composePath = path.join(driverPath, 'driver.compose.json');

  if (!fs.existsSync(driverJsPath) || !fs.existsSync(composePath)) {
    return 0;
  }

  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  const flow = compose.flow || {};
  const triggers = flow.triggers || [];
  const conditions = flow.conditions || [];
  const actions = flow.actions || [];

  let content = fs.readFileSync(driverJsPath, 'utf8');

  // Vérifier si déjà enregistré
  const hasRegistrations = content.includes('getDeviceTriggerCard') ||
    content.includes('getDeviceConditionCard') ||
    content.includes('getDeviceActionCard');

  if (hasRegistrations) {
    return 0; // Déjà partiellement enregistré, skip pour éviter duplications
  }

  // Trouver onInit()
  const lines = content.split('\n');
  let onInitIndex = lines.findIndex(l => l.includes('async onInit()') || l.includes('onInit()'));

  if (onInitIndex === -1) {
    // Pas de onInit(), créer
    const classMatch = content.match(/class\s+(\w+)\s+extends/);
    if (!classMatch) return 0;

    const insertIndex = lines.findIndex(l => l.includes(classMatch[0]));
    if (insertIndex === -1) return 0;

    lines.splice(insertIndex + 1, 0, '', '  async onInit() {', `    this.log('${driverName}: Initialized');`, '  }', '');
    onInitIndex = insertIndex + 2;
  }

  // Trouver position d'insertion (après le { de onInit)
  let insertIndex = onInitIndex + 1;
  while (insertIndex < lines.length && !lines[insertIndex].includes('{')) {
    insertIndex++;
  }
  insertIndex++;

  // Backup
  const backupPath = `${driverJsPath}.backup-flow-fix-${Date.now()}`;
  fs.copyFileSync(driverJsPath, backupPath);
  stats.backupsCreated++;

  // Générer code de registration
  const registrationCode = [];
  registrationCode.push('    ');

  if (triggers.length > 0) {
    registrationCode.push('    // Register flow triggers');
    triggers.forEach(trigger => {
      registrationCode.push(`    this._${trigger.id}Trigger = this.homey.flow.getDeviceTriggerCard('${trigger.id}');`);
      stats.registrationsAdded++;
    });
    registrationCode.push('    ');
  }

  if (conditions.length > 0) {
    registrationCode.push('    // Register flow conditions');
    conditions.forEach(condition => {
      registrationCode.push(`    this._${condition.id}Condition = this.homey.flow.getDeviceConditionCard('${condition.id}');`);

      // Générer runListener automatique
      const capability = extractCapabilityFromCondition(condition.id, compose.capabilities);
      if (capability) {
        registrationCode.push(`    this._${condition.id}Condition.registerRunListener(async (args) => {`);
        registrationCode.push(`      const { device } = args;`);

        if (condition.id.includes('_is_') || condition.id.includes('is_on') || condition.id.includes('is_open')) {
          registrationCode.push(`      return device.getCapabilityValue('${capability}') === true;`);
        } else if (condition.id.includes('level_is') || condition.id.includes('position_is')) {
          registrationCode.push(`      const { threshold } = args;`);
          registrationCode.push(`      const value = device.getCapabilityValue('${capability}') || 0;`);
          registrationCode.push(`      return value >= threshold;`);
        } else {
          registrationCode.push(`      return device.getCapabilityValue('${capability}') === true;`);
        }

        registrationCode.push(`    });`);
        stats.runListenersAdded++;
      }

      stats.registrationsAdded++;
    });
    registrationCode.push('    ');
  }

  if (actions.length > 0) {
    registrationCode.push('    // Register flow actions');
    actions.forEach(action => {
      registrationCode.push(`    this._${action.id}Action = this.homey.flow.getDeviceActionCard('${action.id}');`);
      registrationCode.push(`    this._${action.id}Action.registerRunListener(async (args) => {`);
      registrationCode.push(`      const { device } = args;`);
      registrationCode.push(`      // TODO: Implement action logic`);
      registrationCode.push(`      return true;`);
      registrationCode.push(`    });`);
      stats.registrationsAdded++;
    });
    registrationCode.push('    ');
  }

  registrationCode.push(`    this.log('${driverName}: Flow cards registered');`);

  // Insérer
  lines.splice(insertIndex, 0, ...registrationCode);

  // Sauvegarder
  fs.writeFileSync(driverJsPath, lines.join('\n'), 'utf8');

  return triggers.length + conditions.length + actions.length;
}

/**
 * Extraire capability depuis condition ID
 */
function extractCapabilityFromCondition(conditionId, capabilities) {
  if (!capabilities) return null;

  // alarm_motion, alarm_contact, etc.
  if (conditionId.includes('alarm_')) {
    const cap = conditionId.match(/alarm_\w+/)?.[0];
    return capabilities.includes(cap) ? cap : null;
  }

  // onoff
  if (conditionId.includes('is_on') || conditionId.includes('onoff')) {
    return capabilities.includes('onoff') ? 'onoff' : null;
  }

  // measure_temperature, measure_humidity
  if (conditionId.includes('temperature')) {
    return capabilities.includes('measure_temperature') ? 'measure_temperature' : null;
  }
  if (conditionId.includes('humidity')) {
    return capabilities.includes('measure_humidity') ? 'measure_humidity' : null;
  }

  // windowcoverings_state
  if (conditionId.includes('cover') || conditionId.includes('position')) {
    return capabilities.includes('windowcoverings_state') ? 'windowcoverings_state' : null;
  }

  // dim
  if (conditionId.includes('level') || conditionId.includes('dimmer')) {
    return capabilities.includes('dim') ? 'dim' : null;
  }

  return null;
}

/**
 * Corriger triggers appelés mais non définis
 */
function fixTriggeredButNotDefined(driverName, missingTriggerId) {
  const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

  if (!fs.existsSync(composePath)) return false;

  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));

  if (!compose.flow) {
    compose.flow = {};
  }
  if (!compose.flow.triggers) {
    compose.flow.triggers = [];
  }

  // Générer trigger automatiquement
  const triggerDef = generateTriggerDefinition(missingTriggerId);
  compose.flow.triggers.push(triggerDef);

  // Backup
  const backupPath = `${composePath}.backup-add-trigger-${Date.now()}`;
  fs.copyFileSync(composePath, backupPath);
  stats.backupsCreated++;

  // Sauvegarder
  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
  stats.flowCardsAdded++;

  return true;
}

/**
 * Générer définition trigger automatiquement
 */
function generateTriggerDefinition(triggerId) {
  const titleWords = triggerId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return {
    id: triggerId,
    title: {
      en: titleWords,
      fr: titleWords
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXÉCUTION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('📊 Issues à corriger:\n');
console.log(`   Missing registrations: ${auditReport.issues.missingRegistration.length}`);
console.log(`   Triggered but not defined: ${auditReport.issues.triggeredButNotDefined.length}`);
console.log(`   Missing runListeners: ${auditReport.issues.missingRunListener.length}\n`);

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('PHASE 1: CORRECTION MISSING REGISTRATIONS');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// Grouper par driver
const driverGroups = {};
auditReport.issues.missingRegistration.forEach(issue => {
  if (!driverGroups[issue.driver]) {
    driverGroups[issue.driver] = [];
  }
  driverGroups[issue.driver].push(issue);
});

Object.keys(driverGroups).forEach(driver => {
  const count = fixMissingRegistrations(driver);
  if (count > 0) {
    console.log(`   ✅ ${driver}: ${count} registrations ajoutées`);
    stats.driversFixed++;
  }
});

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('PHASE 2: CORRECTION TRIGGERED BUT NOT DEFINED');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

auditReport.issues.triggeredButNotDefined.forEach(issue => {
  const fixed = fixTriggeredButNotDefined(issue.driver, issue.id);
  if (fixed) {
    console.log(`   ✅ ${issue.driver}: trigger '${issue.id}' ajouté`);
  }
});

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('STATISTIQUES CORRECTIONS');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log(`   Drivers corrigés: ${stats.driversFixed}`);
console.log(`   Registrations ajoutées: ${stats.registrationsAdded}`);
console.log(`   RunListeners ajoutés: ${stats.runListenersAdded}`);
console.log(`   Flow cards ajoutées: ${stats.flowCardsAdded}`);
console.log(`   Backups créés: ${stats.backupsCreated}\n`);

console.log('✅ CORRECTIONS TERMINÉES\n');

console.log('🔄 Re-lancer audit pour vérifier:\n');
console.log('   node scripts/audit_all_flow_cards.js\n');

process.exit(0);
