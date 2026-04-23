#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log(' FIX FLOW TRIGGERS REGISTRATION MANQUANTS\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const DRIVERS_TO_FIX = [
  {
    name: 'contact_sensor',
    triggers: ['contact_opened', 'contact_closed', 'contact_battery_low'],
    conditions: ['contact_is_open']
  },
  {
    name: 'water_leak_sensor',
    triggers: ['water_leak_detected', 'water_leak_dried', 'water_battery_low'],
    conditions: ['water_leak_is_detected']
  },
  {
    name: 'smoke_detector_advanced',
    triggers: ['smoke_detected', 'smoke_cleared', 'smoke_test_triggered', 'smoke_battery_low'],
    conditions: ['smoke_is_detected']
  }
];

function fixDriverFlowRegistration(driverConfig) {
  const driverFile = path.join(DRIVERS_DIR, driverConfig.name, 'driver.js');

  if (!fs.existsSync(driverFile)) {
    console.log(`     ${driverConfig.name}: driver.js non trouvÃ©`);
    return false;
  }

  const content = fs.readFileSync(driverFile, 'utf8');

  // VÃ©rifier si dÃ©jÃ enregistrÃ©
  if (content.includes('getTriggerCard') || content.includes('getConditionCard')) {
    console.log(`    ${driverConfig.name}: dÃ©jÃ enregistrÃ©`);
    return false;
  }

  // Backup
  const backupPath = `${driverFile}.backup-flow-fix-${Date.now()}`;
  fs.copyFileSync(driverFile, backupPath);

  // CrÃ©er nouveau contenu avec registration
  const lines = content.split('\n');
  const onInitIndex = lines.findIndex(l => l.includes('async onInit()') || l.includes('onInit()'));

  if (onInitIndex === -1) {
    console.log(`    ${driverConfig.name}: onInit() non trouvÃ©`);
    return false;
  }

  // Trouver la ligne aprÃ¨s onInit() {
  let insertIndex = onInitIndex + 1;
  while (insertIndex < lines.length && !lines[insertIndex].includes('{')) {
    insertIndex++;
  }
  insertIndex++; // AprÃ¨s le {

  // Construire code de registration
  const registrationCode = [];
  registrationCode.push('    ');
  registrationCode.push('    // Register flow triggers');

  driverConfig.triggers.forEach(triggerId => {
    registrationCode.push(`    this._${triggerId}Trigger = this.homey.flow.getTriggerCard('${triggerId}');`);
  });

  if (driverConfig.conditions.length > 0) {
    registrationCode.push('    ');
    registrationCode.push('    // Register flow conditions');

    driverConfig.conditions.forEach(conditionId => {
      registrationCode.push(`    this._${conditionId}Condition = this.homey.flow.getConditionCard('${conditionId}');`);

      // Ajouter runListener selon le type
      if (conditionId.includes('is_open') || conditionId.includes('is_detected')) {
        const capability = conditionId.includes('contact') ? 'alarm_contact' : conditionId.includes('water') ? 'alarm_water' : 'alarm_smoke'      ;
        registrationCode.push(`    this._${conditionId}Condition.registerRunListener(async (args) => {`);
        registrationCode.push(`      const { device } = args;`);
        registrationCode.push(`      return device.getCapabilityValue('${capability}') === true;`);
        registrationCode.push(`    });`);
      }
    });
  }

  registrationCode.push('    ');
  registrationCode.push(`    this.log('${driverConfig.name}: Flow cards registered');`);

  // InsÃ©rer le code
  lines.splice(insertIndex, 0, ...registrationCode);

  // Sauvegarder
  fs.writeFileSync(driverFile, lines.join('\n'), 'utf8');

  console.log(`    ${driverConfig.name}: Flow registration ajoutÃ©`);
  console.log(`      Triggers: ${driverConfig.triggers.length}, Conditions: ${driverConfig.conditions.length}`);

  return true;
}

// EXÃ‰CUTION
console.log(' Correction flow registrations...\n');

let fixed = 0;
DRIVERS_TO_FIX.forEach(config => {
  if (fixDriverFlowRegistration(config)) {
    fixed++;
  }
});

console.log('\n RÃ‰SULTAT:\n');
console.log(`   Drivers corrigÃ©s: ${fixed}/${DRIVERS_TO_FIX.length}\n`);

if (fixed > 0) {
  console.log(' FLOW REGISTRATIONS AJOUTÃ‰ES\n');
  console.log(' Ces drivers auront maintenant des flows fonctionnels:');
  DRIVERS_TO_FIX.forEach(c => {
    console.log(`   - ${c.name}`);
  });
  console.log();
}

process.exit(0);
