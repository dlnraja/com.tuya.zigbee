#!/usr/bin/env node

/**
 * 🎯 MASTER VERIFICATION SUITE
 * 
 * Exécute TOUTES les vérifications en une fois
 * - Manufacturer IDs
 * - Images
 * - SDK3 compliance
 * - Structure drivers
 * - Capabilities
 * 
 * @version 2.1.46
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const VERIFICATION_SCRIPTS = [
  'scripts/verification/VERIFY_MANUFACTURER_IDS.js',
  'scripts/verification/VERIFY_IMAGES_COMPLETE.js',
  'scripts/verification/VERIFY_SDK3_COMPLIANCE.js',
  'scripts/verification/VERIFY_DRIVER_STRUCTURE.js'
];

const PARSING_SCRIPTS = [
  'scripts/parsing/PARSE_DRIVER_CAPABILITIES.js'
];

function exec(cmd) {
  console.log(`\n▶️  ${cmd}\n`);
  try {
    execSync(cmd, { 
      cwd: ROOT, 
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    return true;
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n🎯 MASTER VERIFICATION SUITE\n');
  console.log('='.repeat(70) + '\n');
  console.log('Exécution de toutes les vérifications...\n');
  
  const startTime = Date.now();
  const results = {
    verification: {},
    parsing: {},
    summary: {}
  };
  
  // 1️⃣ Vérifications
  console.log('\n1️⃣  VÉRIFICATIONS\n');
  for (const script of VERIFICATION_SCRIPTS) {
    const name = path.basename(script, '.js');
    console.log(`\n📋 ${name}\n`);
    results.verification[name] = exec(`node ${script}`);
  }
  
  // 2️⃣ Parsing
  console.log('\n2️⃣  PARSING & ANALYSE\n');
  for (const script of PARSING_SCRIPTS) {
    const name = path.basename(script, '.js');
    console.log(`\n📋 ${name}\n`);
    results.parsing[name] = exec(`node ${script}`);
  }
  
  // 3️⃣ Résumé
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  
  console.log('\n📊 RÉSUMÉ FINAL\n');
  console.log('='.repeat(70) + '\n');
  
  const verificationPassed = Object.values(results.verification).filter(Boolean).length;
  const verificationTotal = Object.values(results.verification).length;
  const parsingPassed = Object.values(results.parsing).filter(Boolean).length;
  const parsingTotal = Object.values(results.parsing).length;
  
  console.log('✅ VÉRIFICATIONS:\n');
  Object.entries(results.verification).forEach(([name, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${name}`);
  });
  
  console.log('\n📊 PARSING:\n');
  Object.entries(results.parsing).forEach(([name, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${name}`);
  });
  
  console.log(`\n⏱️  Durée totale: ${duration}s`);
  console.log(`📊 Vérifications: ${verificationPassed}/${verificationTotal} réussies`);
  console.log(`📊 Parsing: ${parsingPassed}/${parsingTotal} réussis`);
  
  results.summary = {
    duration,
    verificationPassed,
    verificationTotal,
    parsingPassed,
    parsingTotal,
    allPassed: verificationPassed === verificationTotal && parsingPassed === parsingTotal
  };
  
  // Sauvegarder résumé
  const summaryFile = path.join(ROOT, 'reports', 'master_verification_summary.json');
  fs.mkdirSync(path.dirname(summaryFile), { recursive: true });
  fs.writeFileSync(summaryFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Résumé: ${summaryFile}`);
  
  if (results.summary.allPassed) {
    console.log('\n🎉 TOUTES LES VÉRIFICATIONS SONT PASSÉES!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  CERTAINES VÉRIFICATIONS ONT ÉCHOUÉ - Consultez les rapports\n');
    process.exit(1);
  }
}

main().catch(console.error);
