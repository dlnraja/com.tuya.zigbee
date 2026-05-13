#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SEARCH_DIRS = [
  path.join(ROOT, 'drivers'),
  path.join(ROOT, 'lib')
];

let stats = {
  filesProcessed: 0,
  filesFixed: 0,
  fixesCount: 0
};

function findFiles(dir, suffix) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(file, suffix));
    } else if (file.endsWith(suffix)) {
      results.push(file);
    }
  });
  return results;
}

console.log(' Starting Fleet Flow Repair (JS Version)...');

const jsFiles = SEARCH_DIRS.reduce((acc, dir) => acc.concat(findFiles(dir, '.js')), []);

jsFiles.forEach(file => {
  stats.filesProcessed++;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  const isDriver = file.endsWith('driver.js');
  
  /**
   * 1. PURGE MISAPPLIED TRIGGER CALLS IN REGISTRATION CONTEXT
   */
  const brokenTriggerRegex = /\.trigger\(this, \{\}, \{\}\)\.catch\(\(\) => \{\}\);?/g;
  content = content.replace(brokenTriggerRegex, "");

  /**
   * 2. REPAIR BROKEN CHAINING (SYNTAX ERROR FIX)
   */
  content = content.replace(/\)\s*;\s*\n\s*\./g, ")\n      .");
  
  /**
   * 3. CLEAN UP THE NESTED "IIFE HELL" (Rule 17 leftovers)
   */
  const iifeRegex = /\(\(\) => \{ try \{ return this\.homey\.flow\.(getTriggerCard|getActionCard|getConditionCard)\((.*?)\) ; \} catch \(e\) \{ this\.error\('\[FLOW-SAFE\] Failed to load card:', e\.message\); return null; \} \}\)\(\)/g;
  content = content.replace(iifeRegex, (match, method, args) => {
    if (isDriver) {
      // Drivers should use standard Homey API
      const newMethod = method.replace('getDevice', 'get');
      return `this.homey.flow.${newMethod}(${args})`;
    } else {
      const typeLabel = method.replace('get', '').replace('Card', '').toLowerCase();
      return `this._getFlowCard(${args}, '${typeLabel}')`;
    }
  });

  /**
   * 4. FIX MISPLACED _getFlowCard IN DRIVERS
   * Rationale: Drivers don't have the CapabilityManagerMixin, so they must use standard flow API.
   */
  if (isDriver) {
    content = content.replace(/this\._getFlowCard\((.*?)\s*,\s*'(.*?)'\)/g, (match, id, type) => {
      const method = type === 'trigger' ? 'getTriggerCard' : type === 'action' ? 'getActionCard' : 'getConditionCard';
      return `this.homey.flow.${method}(${id})`;
    });
    content = content.replace(/this\._getFlowCard\((.*?)\)/g, (match, id) => {
      return `this.homey.flow.getTriggerCard(${id})`;
    });
  }

  /**
   * 5. ENFORCE UNIFIED NOMENCLATURE (Branding Refactor)
   * Replaces legacy 'Hybrid' and 'Universal' terms with 'Unified' in functional code.
   */
  const isBaseFile = file.includes('lib/devices/') && file.endsWith('Base.js');
  
  // Update class extension and require paths
  content = content.replace(/Hybrid(Switch|Sensor|Plug|Light|Cover|Thermostat)Base/g, 'Unified$1Base');
  content = content.replace(/BaseHybridDevice/g, 'BaseUnifiedDevice');
  content = content.replace(/TuyaHybridDevice/g, 'TuyaUnifiedDevice');
  content = content.replace(/Universal Tuya/g, 'Tuya Unified');

  // Fix imports in drivers
  if (isDriver) {
    content = content.replace(/constSwitchBase\s*=/g, 'const UnifiedSwitchBase =');
    content = content.replace(/const\s+SwitchBase\s*=\s*require\((.*?)\)/g, 'const UnifiedSwitchBase = require($1)');
  }

  // 6. ENFORCE SELF-REFERENTIAL EXPORTS IN BASE CLASSES
  if (isBaseFile) {
    const fileName = path.basename(file, '.js');
    if (fileName.startsWith('Unified') || fileName.startsWith('BaseUnified') || fileName.startsWith('TuyaUnified')) {
      const className = fileName;
      const exportPattern = new RegExp(`${className}\\.${className}\\s*=\\s*${className};\\s*module\\.exports\\s*=\\s*${className};`, 'g');
      if (!exportPattern.test(content)) {
         // Re-apply the export pattern if missing or incomplete
         content = content.replace(/module\.exports\s*=\s*\w+;?/, `${className}.${className} = ${className};\nmodule.exports = ${className};`);
      }
    }
  }

  /**
   * 7. LOGIC-LENS: RACE CONDITION AUDIT (SDK3 Compliance)
   * Ensures setCapabilityValue() calls are always awaited to prevent state drift.
   */
  const unawaitedCapRegex = /([^a-zA-Z0-9_]|^)this\.setCapabilityValue\(/g;
  if (unawaitedCapRegex.test(content)) {
      // Look for calls not preceded by 'await' or part of a promise chain
      content = content.replace(/(?<!await\s+)(this\.setCapabilityValue\()(?!"onoff",\s+)/g, 'await $1');
      // Note: "onoff" is often handled synchronously in some contexts, but we prefer await globally.
  }

  /**
   * 8. FINAL POLISH: Remove empty blocks and duplicated semicolons
   */
  content = content.replace(/; ;/g, ";");
  content = content.replace(/} ;/g, "}");
  content = content.replace(/; ;/g, ";"); // Double pass
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    stats.filesFixed++;
    console.log(` Fixed: ${path.relative(ROOT, file)}`);
  }
});

console.log('\n Repair Results:');
console.log(`   Files Processed: ${stats.filesProcessed}`);
console.log(`   Files Fixed:     ${stats.filesFixed}`);
console.log('\n Fleet Flow Repair Complete!');
