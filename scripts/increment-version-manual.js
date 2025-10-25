#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Manual Version Increment to v4.9.14
 * Fixes: version already published error
 */

console.log('\n🔢 MANUAL VERSION INCREMENT\n');

// Read app.json
const appJsonPath = path.join(process.cwd(), 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const oldVersion = appJson.version;
const newVersion = '4.9.14';

console.log(`Current version: v${oldVersion}`);
console.log(`New version: v${newVersion}`);

// Update version
appJson.version = newVersion;

// Save app.json
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');

console.log(`\n✅ Updated app.json to v${newVersion}`);

// Update changelog
const changelogPath = path.join(process.cwd(), '.homeychangelog.json');
if (fs.existsSync(changelogPath)) {
  const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
  
  if (!changelog[newVersion]) {
    changelog[newVersion] = {
      "en": "SDK3 Complete Compliance - All deprecated APIs removed. Wall touch drivers fixed. 171 drivers validated. Zero errors.",
      "fr": "Conformité SDK3 complète - Toutes les APIs obsolètes supprimées. Drivers wall touch corrigés. 171 drivers validés. Zéro erreur."
    };
    
    fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2), 'utf8');
    console.log(`✅ Updated .homeychangelog.json with v${newVersion}`);
  }
}

console.log('\n✅ VERSION INCREMENT COMPLETE');
console.log('\nNext steps:');
console.log('  git add .');
console.log('  git commit -m "chore: Increment version to v4.9.14"');
console.log('  git push origin master\n');
