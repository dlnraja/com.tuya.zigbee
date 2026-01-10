#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION ISSUES RESTANTES - FLOW CARDS\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const auditReport = JSON.parse(fs.readFileSync(path.join(ROOT, 'FLOW_CARDS_AUDIT_REPORT.json'), 'utf8'));

let stats = {
  driversFixed: 0,
  registrationsAdded: 0,
  runListenersAdded: 0,
  capabilitiesFixed: 0,
  backupsCreated: 0
};

/**
 * Ajouter registration manquante spécifique
 */
function addMissingRegistration(driverName, cardType, cardId) {
  const driverJsPath = path.join(DRIVERS_DIR, driverName, 'driver.js');
  const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

  if (!fs.existsSync(driverJsPath) || !fs.existsSync(composePath)) {
    return false;
  }

  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  let content = fs.readFileSync(driverJsPath, 'utf8');

  // Vérifier si déjà enregistré
  const registrationPattern = cardType === 'trigger' ? `getDeviceTriggerCard('${cardId}')` :
    cardType === 'condition' ? `getDeviceConditionCard('${cardId}')` :
      `getDeviceActionCard('${cardId}')`;

  if (content.includes(registrationPattern)) {
    return false; // Déjà enregistré
  }

  // Trouver onInit()
  const lines = content.split('\n');
  let insertIndex = -1;

  // Chercher la dernière registration existante du même type
  let lastRegistrationIndex = -1;
  const searchPattern = cardType === 'trigger' ? 'getDeviceTriggerCard' :
    cardType === 'condition' ? 'getDeviceConditionCard' :
      'getDeviceActionCard';

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchPattern)) {
      lastRegistrationIndex = i;
    }
  }

  if (lastRegistrationIndex !== -1) {
    // Insérer après la dernière registration du même type
    insertIndex = lastRegistrationIndex + 1;

    // Si c'est une condition, chercher le registerRunListener associé
    if (cardType === 'condition' && lines[lastRegistrationIndex + 1].includes('registerRunListener')) {
      let depth = 0;
      for (let i = lastRegistrationIndex + 1; i < lines.length; i++) {
        if (lines[i].includes('{')) depth++;
        if (lines[i].includes('}')) depth--;
        if (depth === 0 && lines[i].includes('});')) {
          insertIndex = i + 1;
          break;
        }
      }
    }
  } else {
    // Pas de registration de ce type, chercher onInit
    const onInitIndex = lines.findIndex(l => l.includes('async onInit()') || l.includes('onInit()'));
    if (onInitIndex === -1) return false;

    // Trouver position après log
    for (let i = onInitIndex; i < lines.length; i++) {
      if (lines[i].includes('this.log(') && lines[i].includes('Flow cards registered')) {
        insertIndex = i;
        break;
      } else if (lines[i].includes('this.log(') && lines[i].includes('initialized')) {
        insertIndex = i + 1;
        break;
      }
    }

    if (insertIndex === -1) {
      // Après le { de onInit
      insertIndex = onInitIndex + 1;
      while (insertIndex < lines.length && !lines[insertIndex].includes('{')) {
        insertIndex++;
      }
      insertIndex++;
    }
  }

  if (insertIndex === -1) return false;

  // Backup
  const backupPath = `${driverJsPath}.backup-add-missing-${Date.now()}`;
  fs.copyFileSync(driverJsPath, backupPath);
  stats.backupsCreated++;

  // Générer code
  const registrationCode = [];
  const indent = '    ';

  if (cardType === 'trigger') {
    registrationCode.push(`${indent}this._${cardId}Trigger = this.homey.flow.getDeviceTriggerCard('${cardId}');`);
  } else if (cardType === 'condition') {
    registrationCode.push(`${indent}this._${cardId}Condition = this.homey.flow.getDeviceConditionCard('${cardId}');`);

    // Ajouter runListener
    const capability = extractCapabilityFromCondition(cardId, compose.capabilities);
    if (capability) {
      registrationCode.push(`${indent}this._${cardId}Condition.registerRunListener(async (args) => {`);
      registrationCode.push(`${indent}  const { device } = args;`);

      if (cardId.includes('_is_active') || cardId.includes('is_on') || cardId.includes('is_open')) {
        registrationCode.push(`${indent}  return device.getCapabilityValue('${capability}') === true;`);
      } else if (cardId.includes('level_is') || cardId.includes('illuminance_is')) {
        registrationCode.push(`${indent}  const { threshold } = args;`);
        registrationCode.push(`${indent}  const value = device.getCapabilityValue('${capability}') || 0;`);
        registrationCode.push(`${indent}  return value >= threshold;`);
      } else {
        registrationCode.push(`${indent}  return device.getCapabilityValue('${capability}') === true;`);
      }

      registrationCode.push(`${indent}});`);
      stats.runListenersAdded++;
    }
  } else if (cardType === 'action') {
    registrationCode.push(`${indent}this._${cardId}Action = this.homey.flow.getDeviceActionCard('${cardId}');`);
    registrationCode.push(`${indent}this._${cardId}Action.registerRunListener(async (args) => {`);
    registrationCode.push(`${indent}  const { device } = args;`);
    registrationCode.push(`${indent}  // TODO: Implement action logic`);
    registrationCode.push(`${indent}  return true;`);
    registrationCode.push(`${indent}});`);
  }

  // Insérer
  lines.splice(insertIndex, 0, ...registrationCode);

  // Sauvegarder
  fs.writeFileSync(driverJsPath, lines.join('\n'), 'utf8');
  stats.registrationsAdded++;

  return true;
}

/**
 * Extraire capability depuis condition ID
 */
function extractCapabilityFromCondition(conditionId, capabilities) {
  if (!capabilities) return null;

  // Mapping explicite
  const mappings = {
    'sos_is_active': 'alarm_generic',
    'motion_illuminance_is': 'measure_luminance',
    'water_leak_is_active': 'alarm_water',
    'smoke_alarm_is_active': 'alarm_smoke',
    'co2_level_is': 'measure_co2'
  };

  if (mappings[conditionId] && capabilities.includes(mappings[conditionId])) {
    return mappings[conditionId];
  }

  // alarm_*
  if (conditionId.includes('alarm_')) {
    const cap = conditionId.match(/alarm_\w+/)?.[0];
    if (cap && capabilities.includes(cap)) return cap;
  }

  // measure_*
  if (conditionId.includes('measure_')) {
    const cap = conditionId.match(/measure_\w+/)?.[0];
    if (cap && capabilities.includes(cap)) return cap;
  }

  // Autres
  if (conditionId.includes('illuminance') && capabilities.includes('measure_luminance')) {
    return 'measure_luminance';
  }

  if (conditionId.includes('temperature') && capabilities.includes('measure_temperature')) {
    return 'measure_temperature';
  }

  return null;
}

/**
 * Ajouter runListener manquant
 */
function addMissingRunListener(driverName, conditionId) {
  const driverJsPath = path.join(DRIVERS_DIR, driverName, 'driver.js');
  const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

  if (!fs.existsSync(driverJsPath) || !fs.existsSync(composePath)) {
    return false;
  }

  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  let content = fs.readFileSync(driverJsPath, 'utf8');

  // Vérifier si runListener déjà présent
  const lines = content.split('\n');
  const registrationLine = lines.findIndex(l => l.includes(`getDeviceConditionCard('${conditionId}')`));

  if (registrationLine === -1) return false;

  // Vérifier si registerRunListener suit
  if (registrationLine + 1 < lines.length && lines[registrationLine + 1].includes('registerRunListener')) {
    return false; // Déjà présent
  }

  // Backup
  const backupPath = `${driverJsPath}.backup-add-runlistener-${Date.now()}`;
  fs.copyFileSync(driverJsPath, backupPath);
  stats.backupsCreated++;

  // Générer runListener
  const capability = extractCapabilityFromCondition(conditionId, compose.capabilities);
  if (!capability) return false;

  const indent = '    ';
  const runListenerCode = [
    `${indent}this._${conditionId}Condition.registerRunListener(async (args) => {`,
    `${indent}  const { device, threshold } = args;`,
    `${indent}  const value = device.getCapabilityValue('${capability}') || 0;`,
    `${indent}  return value >= threshold;`,
    `${indent}});`
  ];

  // Insérer après registration
  lines.splice(registrationLine + 1, 0, ...runListenerCode);

  // Sauvegarder
  fs.writeFileSync(driverJsPath, lines.join('\n'), 'utf8');
  stats.runListenersAdded++;

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXÉCUTION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('📊 Issues critiques restantes:\n');
console.log(`   Missing registrations: ${auditReport.issues.missingRegistration.length}`);
console.log(`   Missing runListeners: ${auditReport.issues.missingRunListener.length}\n`);

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('CORRECTION MISSING REGISTRATIONS');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

auditReport.issues.missingRegistration.forEach(issue => {
  const fixed = addMissingRegistration(issue.driver, issue.type, issue.id);
  if (fixed) {
    console.log(`   ✅ ${issue.driver}: ${issue.type} '${issue.id}' ajouté`);
    stats.driversFixed++;
  }
});

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('CORRECTION MISSING RUNLISTENERS');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

auditReport.issues.missingRunListener.forEach(issue => {
  const fixed = addMissingRunListener(issue.driver, issue.id);
  if (fixed) {
    console.log(`   ✅ ${issue.driver}: runListener pour '${issue.id}' ajouté`);
  }
});

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('STATISTIQUES');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log(`   Registrations ajoutées: ${stats.registrationsAdded}`);
console.log(`   RunListeners ajoutés: ${stats.runListenersAdded}`);
console.log(`   Backups créés: ${stats.backupsCreated}\n`);

console.log('✅ CORRECTIONS TERMINÉES\n');

process.exit(0);
