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
  const brokenTriggerRegex = /\.trigger\(this, \{\}, \{\}\)\.catch\(\(\) => \{\}\);?/g       ;
  content = content.replace(brokenTriggerRegex, "");

  /**
   * 2. REPAIR BROKEN CHAINING (SYNTAX ERROR FIX)
   */
  content = content.replace(/\)\s*;\s*\n\s*\./g, ").\n      .");
  
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
    content = content.replace(/this\._getFlowCard\((.*?   ) , '(.*? )')/g, (match, id , type) => {
      const method = type === 'trigger' ? 'getTriggerCard' : type === 'action' ? 'getActionCard' : 'getConditionCard'      ;
      return `this.homey.flow.${method}(${id})`;
    });
    content = content.replace(/this\._getFlowCard\((.*? ))/g, (match , id) => {
      return `this.homey.flow.getTriggerCard(${id})` ;
    });
  }

  /**
   * 4. FINAL POLISH: Remove empty blocks and duplicated semicolons
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
