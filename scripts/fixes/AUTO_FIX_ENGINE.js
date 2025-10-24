#!/usr/bin/env node
/**
 * AUTO FIX ENGINE
 * Applique automatiquement les corrections basées sur le rapport d'audit
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKUP_DIR = path.join(ROOT, '.audit-backups', new Date().toISOString().replace(/:/g, '-'));

function backup(file) {
  const backupPath = path.join(BACKUP_DIR, path.relative(ROOT, file));
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(file, backupPath);
}

function readFile(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    return null;
  }
}

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

/**
 * FIX 1: Conversion sûre pour .replace()
 */
function fixReplaceConversions() {
  console.log('\n🔧 Fixing unsafe .replace() calls...');
  
  const files = require('child_process')
    .execSync('git ls-files "*.js"', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map(f => path.join(ROOT, f));

  let fixedCount = 0;

  for (const file of files) {
    const content = readFile(file);
    if (!content) continue;

    // Pattern: variable.replace(...) -> String(variable).replace(...)
    // But NOT: String.replace, this.replace, "string".replace
    const pattern = /\b(?!String|this)([a-zA-Z_]\w*)\.replace\s*\(/g;
    
    let modified = content;
    let hasChanges = false;

    // Appliquer la conversion
    modified = content.replace(pattern, (match, varName) => {
      // Vérifier si déjà wrapped
      const beforeMatch = content.substring(Math.max(0, content.indexOf(match) - 10), content.indexOf(match));
      if (beforeMatch.includes('String(')) {
        return match; // Déjà corrigé
      }
      
      hasChanges = true;
      return `String(${varName}).replace(`;
    });

    if (hasChanges) {
      backup(file);
      fs.writeFileSync(file, modified, 'utf8');
      fixedCount++;
      console.log(`  ✅ Fixed: ${path.relative(ROOT, file)}`);
    }
  }

  console.log(`  Total fixed: ${fixedCount} files`);
}

/**
 * FIX 2: Ajouter parseFloat() pour setCapabilityValue numérique
 */
function fixSetCapabilityValueTypes() {
  console.log('\n🔧 Fixing setCapabilityValue type conversions...');
  
  const files = require('child_process')
    .execSync('git ls-files "drivers/**/device.js" "lib/**/*.js"', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map(f => path.join(ROOT, f));

  let fixedCount = 0;

  for (const file of files) {
    let content = readFile(file);
    if (!content) continue;

    let hasChanges = false;

    // Pattern: setCapabilityValue('measure_*', value) où value n'est pas déjà parseFloat
    const lines = content.split('\n');
    const newLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Detect setCapabilityValue for numeric capabilities
      const match = line.match(/setCapabilityValue\s*\(\s*['"]((measure_|meter_)[^'"]+)['"]\s*,\s*([^)]+)\)/);
      
      if (match) {
        const capability = match[1];
        const value = match[3].trim();
        
        // Si la valeur n'est pas déjà wrapped avec parseFloat/Number/parseInt
        if (!/^(parseFloat|Number|parseInt)\s*\(/.test(value) && !/^\d+(\.\d+)?$/.test(value)) {
          // Wrapper avec parseFloat et validation
          const indent = line.match(/^\s*/)[0];
          const varName = value.split(/[\.(\s]/)[0];
          
          // Ajouter validation avant setCapabilityValue
          newLines.push(`${indent}const ${varName}Value = parseFloat(${value});`);
          newLines.push(`${indent}if (!Number.isNaN(${varName}Value)) {`);
          line = line.replace(value, `${varName}Value`);
          newLines.push(line);
          newLines.push(`${indent}} else {`);
          newLines.push(`${indent}  this.error('Invalid ${capability} value:', ${value});`);
          newLines.push(`${indent}}`);
          
          hasChanges = true;
          continue;
        }
      }
      
      newLines.push(line);
    }

    if (hasChanges) {
      backup(file);
      fs.writeFileSync(file, newLines.join('\n'), 'utf8');
      fixedCount++;
      console.log(`  ✅ Fixed: ${path.relative(ROOT, file)}`);
    }
  }

  console.log(`  Total fixed: ${fixedCount} files`);
}

/**
 * FIX 3: Ajouter event listener detach
 */
function fixEventListeners() {
  console.log('\n🔧 Fixing multiple event listeners...');
  
  const files = require('child_process')
    .execSync('git ls-files "drivers/**/device.js"', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map(f => path.join(ROOT, f));

  let fixedCount = 0;

  for (const file of files) {
    let content = readFile(file);
    if (!content) continue;

    let hasChanges = false;

    // Trouver les .on('report', ...) et ajouter detach avant
    const reportPattern = /(\s+)(this\.zclNode|node|device)\.on\s*\(\s*['"]report['"]\s*,/g;
    
    content = content.replace(reportPattern, (match, indent, target) => {
      // Ajouter removeListener avant on
      hasChanges = true;
      return `${indent}// Remove previous listener to avoid duplicates\n` +
             `${indent}if (this._reportListener) {\n` +
             `${indent}  ${target}.removeListener('report', this._reportListener);\n` +
             `${indent}}\n` +
             `${indent}this._reportListener = (msg) => { /* handler */ };\n` +
             `${indent}${target}.on('report', this._reportListener`;
    });

    if (hasChanges) {
      backup(file);
      fs.writeFileSync(file, content, 'utf8');
      fixedCount++;
      console.log(`  ✅ Fixed: ${path.relative(ROOT, file)}`);
    }
  }

  console.log(`  Total fixed: ${fixedCount} files`);
}

/**
 * FIX 4: Ajouter .catch() aux promises
 */
function fixUnhandledPromises() {
  console.log('\n🔧 Adding .catch() to unhandled promises...');
  
  const files = require('child_process')
    .execSync('git ls-files "drivers/**/*.js" "lib/**/*.js"', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map(f => path.join(ROOT, f));

  let fixedCount = 0;

  for (const file of files) {
    let content = readFile(file);
    if (!content) continue;

    let hasChanges = false;

    // Pattern: await something() sans .catch()
    // Chercher les await qui ne sont pas suivis de .catch dans les 50 caractères suivants
    const lines = content.split('\n');
    const newLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Si ligne contient await et pas de .catch sur cette ligne ou la suivante
      if (line.includes('await ') && !line.includes('.catch')) {
        const nextLine = lines[i + 1] || '';
        if (!nextLine.trim().startsWith('.catch')) {
          // Identifier la fin de l'expression await
          if (line.trim().endsWith(';')) {
            line = line.replace(/;$/, '.catch(err => this.error(err));');
            hasChanges = true;
          }
        }
      }
      
      newLines.push(line);
    }

    if (hasChanges) {
      backup(file);
      fs.writeFileSync(file, newLines.join('\n'), 'utf8');
      fixedCount++;
      console.log(`  ✅ Fixed: ${path.relative(ROOT, file)}`);
    }
  }

  console.log(`  Total fixed: ${fixedCount} files`);
}

/**
 * FIX 5: Corriger les manufacturer IDs en double
 */
function fixDuplicateManufacturerIDs() {
  console.log('\n🔧 Fixing duplicate manufacturer IDs...');
  
  const auditReport = readJSON(path.join(ROOT, 'reports', 'ULTIMATE_AUDIT_REPORT.json'));
  if (!auditReport) {
    console.log('  ⚠ Audit report not found, run audit first');
    return;
  }

  const duplicates = auditReport.high.filter(issue => issue.category === 'manufacturer_ids' && issue.id);
  
  console.log(`  Found ${duplicates.length} duplicate ID issues`);

  for (const issue of duplicates) {
    if (!issue.drivers || issue.drivers.length < 2) continue;

    // Stratégie: garder l'ID dans le driver le plus spécifique, retirer des autres
    const drivers = issue.drivers.sort(); // Tri alphabétique
    const keepDriver = drivers[0]; // Garder dans le premier
    const removeFromDrivers = drivers.slice(1);

    console.log(`  ID: ${issue.id}`);
    console.log(`    Keep in: ${keepDriver}`);
    console.log(`    Remove from: ${removeFromDrivers.join(', ')}`);

    for (const driverName of removeFromDrivers) {
      const driverPath = path.join(ROOT, 'drivers', driverName);
      const composeFile = path.join(driverPath, 'driver.compose.json');
      
      if (!fs.existsSync(composeFile)) continue;

      const compose = readJSON(composeFile);
      if (!compose || !compose.zigbee) continue;

      let modified = false;

      // Retirer de manufacturerName
      if (compose.zigbee.manufacturerName) {
        const mfg = Array.isArray(compose.zigbee.manufacturerName) 
          ? compose.zigbee.manufacturerName 
          : [compose.zigbee.manufacturerName];
        
        const filtered = mfg.filter(id => id !== issue.id);
        if (filtered.length !== mfg.length) {
          compose.zigbee.manufacturerName = filtered;
          modified = true;
        }
      }

      // Retirer de productId
      if (compose.zigbee.productId) {
        const prod = Array.isArray(compose.zigbee.productId) 
          ? compose.zigbee.productId 
          : [compose.zigbee.productId];
        
        const filtered = prod.filter(id => id !== issue.id);
        if (filtered.length !== prod.length) {
          compose.zigbee.productId = filtered;
          modified = true;
        }
      }

      if (modified) {
        backup(composeFile);
        fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n', 'utf8');
        console.log(`    ✅ Removed from ${driverName}`);
      }
    }
  }
}

/**
 * FIX 6: Ajouter endpoints manquants pour multi-gang
 */
function fixMissingEndpoints() {
  console.log('\n🔧 Fixing missing endpoints for multi-gang devices...');
  
  const auditReport = readJSON(path.join(ROOT, 'reports', 'ULTIMATE_AUDIT_REPORT.json'));
  if (!auditReport) {
    console.log('  ⚠ Audit report not found');
    return;
  }

  const endpointIssues = auditReport.high.filter(issue => issue.category === 'endpoints');
  
  for (const issue of endpointIssues) {
    if (!issue.driver || !issue.expected) continue;

    const driverPath = path.join(ROOT, 'drivers', issue.driver);
    const composeFile = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) continue;

    const compose = readJSON(composeFile);
    if (!compose || !compose.zigbee) continue;

    // Créer les endpoints manquants
    if (!compose.zigbee.endpoints) compose.zigbee.endpoints = {};

    const gangCount = issue.expected;
    let modified = false;

    for (let i = 1; i <= gangCount; i++) {
      const epKey = String(i);
      if (!compose.zigbee.endpoints[epKey]) {
        // Ajouter endpoint avec clusters de base
        compose.zigbee.endpoints[epKey] = {
          clusters: [0, 3, 4, 5, 6], // basic, identify, groups, scenes, onOff
          bindings: [6] // onOff binding
        };
        modified = true;
      }
    }

    if (modified) {
      backup(composeFile);
      fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n', 'utf8');
      console.log(`  ✅ Fixed endpoints for ${issue.driver}`);
    }
  }
}

function generateFixReport() {
  const report = {
    date: new Date().toISOString(),
    backupLocation: BACKUP_DIR,
    fixesApplied: [
      'Unsafe .replace() conversions',
      'setCapabilityValue type safety',
      'Event listener detachment',
      'Unhandled promise rejections',
      'Duplicate manufacturer IDs',
      'Missing endpoints for multi-gang'
    ],
    note: 'All modified files have been backed up'
  };

  const reportPath = path.join(ROOT, 'reports', 'AUTO_FIX_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  console.log(`\n📊 Fix report saved to: ${reportPath}`);
  console.log(`📦 Backups saved to: ${BACKUP_DIR}`);
}

function main() {
  console.log('🚀 AUTO FIX ENGINE - Starting...\n');
  console.log(`Backup directory: ${BACKUP_DIR}\n`);

  try {
    fixReplaceConversions();
    fixSetCapabilityValueTypes();
    fixEventListeners();
    fixUnhandledPromises();
    fixDuplicateManufacturerIDs();
    fixMissingEndpoints();
    
    generateFixReport();
    
    console.log('\n✅ Auto-fix complete!');
    console.log('\n⚠️  IMPORTANT:');
    console.log('   1. Review changes with: git diff');
    console.log('   2. Test with: homey app validate --level publish');
    console.log('   3. Restore from backup if needed');
  } catch (error) {
    console.error('\n❌ Auto-fix failed:', error);
    console.log(`\n📦 Restore from: ${BACKUP_DIR}`);
    process.exit(1);
  }
}

main();
