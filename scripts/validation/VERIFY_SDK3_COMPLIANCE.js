#!/usr/bin/env node

/**
 * ✅ VERIFY SDK3 COMPLIANCE
 * Vérifie conformité Homey SDK3
 * @version 2.1.46
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function verifyDriver(name) {
  const composePath = path.join(DRIVERS_DIR, name, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    return { driver: name, error: 'Missing driver.compose.json' };
  }
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
  const issues = [];
  
  // Vérifications SDK3
  if (!compose.name) issues.push('Missing name');
  if (!compose.class) issues.push('Missing class');
  if (!compose.capabilities) issues.push('Missing capabilities');
  if (!compose.zigbee) issues.push('Missing zigbee config');
  if (compose.zigbee && !compose.zigbee.manufacturerName) issues.push('Missing manufacturerName');
  
  return { driver: name, issues, valid: issues.length === 0 };
}

async function main() {
  console.log('\n✅ VERIFY SDK3 COMPLIANCE\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  
  const results = drivers.map(verifyDriver);
  const invalid = results.filter(r => !r.valid);
  
  console.log(`📁 Drivers: ${drivers.length}`);
  console.log(`✅ Valides: ${results.length - invalid.length}`);
  console.log(`❌ Invalides: ${invalid.length}`);
  
  if (invalid.length > 0) {
    console.log('\n❌ PROBLÈMES:\n');
    invalid.forEach(r => {
      console.log(`${r.driver}:`);
      (r.issues || [r.error]).forEach(i => console.log(`  - ${i}`));
    });
  }
  
  const outputFile = path.join(ROOT, 'reports', 'sdk3_compliance.json');
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Rapport: ${outputFile}\n`);
  
  process.exit(invalid.length > 0 ? 1 : 0);
}

main().catch(console.error);
