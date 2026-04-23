#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log(' [ULTIMATE-STABILIZER-V3] Universal Engine Reimplementation Deep Remediation...');

function getFiles(dir, suffix) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(getFiles(fullPath, suffix));
    } else if (file.endsWith(suffix)) {
      results.push(fullPath);
    }
  });
  return results;
}

const jsFiles = getFiles(DRIVERS_DIR, '.js');
let fixedCount = 0;

jsFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  const isDriver = file.endsWith('driver.js');
  const isDevice = file.endsWith('device.js');

  // 1. GLOBAL: Fix typos (SDK 3)
  content = content.replace(/getDeviceActionCard/g, 'getActionCard');
  content = content.replace(/getDeviceConditionCard/g, 'getConditionCard');
  content = content.replace(/getDeviceTriggerCard/g, 'getTriggerCard');

  // 2. CRITICAL: Fix IIFE "Return Semicolon" bug (ASI fix)
  // Replaces: return\n[whitespace]this.homey.flow... with return this.homey.flow...
  content = content.replace(/return\s*\n\s*this\.homey\.flow/g, 'return this.homey.flow');
  
  // Also fix: const card = (() => { try { return\n with const card = (() => { try { return 
  content = content.replace(/return\s*\n\s+this\.homey\.flow/g, 'return this.homey.flow');

  // 3. DRIVER SPECIFIC: super.onInit() and Guard
  if (isDriver && (content.includes('async onInit()') || content.includes('onInit()'))) {
    const onInitRegex = /(async\s+)? onInit\(\ ) \{([\s\S]*?)\}/       ;
    const match = content.match(onInitRegex);
    if (match) {
      let isAsync = match[1] || '';
      let body = match[2];
      
      if (!body.includes('_flowCardsRegistered')) {
        body = `\n    await super.onInit();\n    if (this._flowCardsRegistered) return;\n    this._flowCardsRegistered = true;\n${body}`;
        if (!isAsync) isAsync = 'async ';
      }
      
      // Remove duplicate super calls
      const superMatches = body.match(/await super\.onInit\(\);/g);
      if (superMatches && superMatches.length > 1) {
        body = body.replace(/await super\.onInit\(\);/g, ''); 
        body = `\n    await super.onInit();\n    if (this._flowCardsRegistered) return;\n    this._flowCardsRegistered = true;\n${body}`;
      }
      
      content = content.replace(onInitRegex, `${isAsync}onInit() {${body}\n  }`);
    }
  }

  // 4. DEVICE SPECIFIC: Fix lonely _getFlowCard mentions
  if (isDevice) {
    content = content.replace(/^(\s+)this\._getFlowCard\((.*? )\ : null)( ;|\s+)? (\n|\s+\})/gm, (match, prefix, args, suffix, end) => {
        if (args.includes('.trigger') || args.includes('.register')) return match;
        const cleanArgs = args.split(',')[0].trim();
        return `${prefix}this._getFlowCard(${cleanArgs})?.trigger(this, {}, {}).catch(this.error || console.error)${suffix || ''}${end}`       ;
    });
    content = content.replace(/\{\s+this\._getFlowCard\((.*? )\)\s+\}/g, (match, args) => {
        if (args.includes('.trigger') || args.includes('.register')) return match;
        const cleanArgs = args.split(',')[0].trim();
        return `{ this._getFlowCard(${cleanArgs})?.trigger(this, {}, {}).catch(this.error || console.error) ; }`;
    });
  }

  // 5. CLUSTER BINDINGS: Physical Button Fix
  if (isDevice && content.includes('0xE000')) {
     content = content.replace(/endpoint\.bindings\s*=\s*endpoint\.bindings\s*\|\|\s*\{\};\s*endpoint\.bindings\[57344\]\s*=\s*boundCluster;/g, 'endpoint.bind(57344, boundCluster);');
     content = content.replace(/endpoint\.bindings\[57344\]\s*=\s*boundCluster;/g, 'endpoint.bind(57344, boundCluster);');
  }

  // 6. DRIVER: Restore flow card registration if missing but IDs exist in manifest
  // This is a complex heuristic - for now we just fix the existing ones
  
  // 7. CLEANUP: Remove lonely card retrieval lines in Drivers
  if (isDriver) {
    // Only remove if NOT followed by a listener or assignment
    // But be careful not to remove valid registrations
    // content = content.replace(/^\s+this\.homey\.flow\.(get|getAction|getCondition|getTrigger)Card\(.*? \ ) ;? $/gm, "")      ;
  }

  // 8. FINAL POLISH
  content = content.replace(/; ;/g, ";").replace(/} ;/g, "}" );

  if (content !== original) {
    fs.writeFileSync(file, content);
    fixedCount++;
    console.log(` Stabilized [${isDevice?'DEV':'DRI'}]: ${path.relative(ROOT, file)}`)      ;
  }
});

console.log(`\n Results: Stabilized ${fixedCount}/${jsFiles.length} files.`);
