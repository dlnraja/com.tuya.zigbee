#!/usr/bin/env node

/**
 * Fix package.json for Homey SDK v3
 * Moves homey to devDependencies, ensures runtime deps
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing package.json...');

try {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  let changed = false;
  
  // Move homey to devDependencies if in dependencies
  if (package.dependencies && package.dependencies.homey) {
    if (!package.devDependencies) package.devDependencies = {};
    package.devDependencies.homey = package.dependencies.homey;
    delete package.dependencies.homey;
    changed = true;
    console.log('✅ Moved homey to devDependencies');
  }
  
  // Ensure runtime deps
  if (!package.dependencies) package.dependencies = {};
  
  const runtimeDeps = {
    'homey-meshdriver': '^2.0.4',
    'zigbee-clusters': '^2.4.2'
  };
  
  Object.entries(runtimeDeps).forEach(([dep, version]) => {
    if (!package.dependencies[dep]) {
      package.dependencies[dep] = version;
      changed = true;
      console.log(`✅ Added ${dep}@${version} to dependencies`);
    }
  });
  
  // Ensure private: true
  if (package.private !== true) {
    package.private = true;
    changed = true;
    console.log('✅ Set private: true');
  }
  
  // Ensure required scripts
  if (!package.scripts) package.scripts = {};
  
  const requiredScripts = {
    'run': 'homey app run',
    'remote': 'homey app run --remote',
    'ingest': 'node scripts/ingest-tuya-zips.js',
    'enrich': 'node scripts/enrich-drivers.js --apply',
    'assets': 'node scripts/assets-generate.js',
    'reindex': 'node scripts/reindex-drivers.js',
    'fixpkg': 'node scripts/fix-package.js',
    'mega': 'node scripts/mega-pipeline-ultimate.js'
  };
  
  Object.entries(requiredScripts).forEach(([name, cmd]) => {
    if (!package.scripts[name]) {
      package.scripts[name] = cmd;
      changed = true;
      console.log(`✅ Added script: ${name}`);
    }
  });
  
  if (changed) {
    fs.writeFileSync(packagePath, JSON.stringify(package, null, 2));
    console.log('✅ package.json updated successfully');
  } else {
    console.log('✅ package.json already correct');
  }
  
} catch (error) {
  console.error('❌ Error fixing package.json:', error.message);
  process.exit(1);
}
