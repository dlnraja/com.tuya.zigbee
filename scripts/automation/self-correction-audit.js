#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const STATE_DIR = path.join(ROOT, '.github/state');

async function main() {
  console.log('===  AI Self-Correction Audit (v1.0) ===');
  const auditReport = {
    timestamp: new Date().toISOString(),
    syntaxOk: false,
    bvbCoherenceOk: false,
    noDegradation: true,
    warnings: [],
    errors: []
  };

  // 1. Syntax Check (Homey Validation)
  try {
    console.log('Checking app syntax...');
    execSync('npx homey app validate', { cwd: ROOT, stdio: 'pipe' });
    auditReport.syntaxOk = true;
    console.log('   Syntax: OK');
  } catch (e) {
    auditReport.errors.push(`Homey Validation Failed: ${e.message}`);
    console.log('   Syntax: Failed');
  }

  // 2. BVB Coherence Check (Static Regex Audit)
  try {
    console.log('Auditing BVB Mixin logic...');
    const mixin = fs.readFileSync(path.join(ROOT, 'lib/mixins/CapabilityManagerMixin.js'), 'utf8');
    
    const checks = {
      lightSafe: mixin.includes('isLighting') && mixin.includes('dim'),
      errorCodes: [65535, 32767, -32768, -1].every(c => mixin.includes(String(c))),
      safeSetUsed: mixin.includes('_safeSetCapability'),
      radarGhost: mixin.includes('RADAR GHOST PROTECTION')
    };
    
    if (Object.values(checks).every(v => v)) {
      auditReport.bvbCoherenceOk = true;
      console.log('   BVB Coherence: OK');
    } else {
      auditReport.warnings.push(`BVB Logic compromised. Missing: ${Object.entries(checks).filter(([k,v]) => !v).map(([k]) => k).join(', ')}`);
      console.log('   BVB Coherence: Warning');
    }
  } catch (e) {
    auditReport.errors.push(`BVB Audit Error: ${e.message}`);
  }

  // 3. Driver Integrity & WiFi Cloudless Check (Cloudless Logic)
  try {
    console.log('Auditing Driver Integrity & WiFi Cloudless settings...');
    const drivers = fs.readdirSync(path.join(ROOT, 'drivers')).filter(d => fs.existsSync(path.join(ROOT, 'drivers', d, 'driver.compose.json')));
    
    for (const d of drivers) {
      const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', d, 'driver.compose.json'), 'utf8'));
      const devJs = path.join(ROOT, 'drivers', d, 'device.js');
      
      // Orphan Check
      if (!fs.existsSync(devJs)) {
        auditReport.errors.push(`Driver ${d} is missing device.js (Orphan)`);
        auditReport.noDegradation = false;
      }

      // v6.3.4: WiFi Cloudless Goal Audit
      if (d.startsWith('wifi_')) {
        const settings = compose.settings || [];
        const hasLocalKey = settings.some(s => s.id === 'localKey' || (s.children && s.children.some(c => c.id === 'localKey')));
        const hasDevId = settings.some(s => s.id === 'devId' || (s.children && s.children.some(c => c.id === 'devId')));
        
        if (!hasLocalKey || !hasDevId) {
          auditReport.warnings.push(`WiFi Driver ${d}: Missing localKey/devId settings for Cloudless Goal.`);
        }
        
        // Check for local connectivity marker
        if (compose.platforms && !compose.platforms.includes('local')) {
           auditReport.warnings.push(`WiFi Driver ${d}: 'local' platform missing in manifest.`);
        }
      }

      // PID/Mfr Pair Check for Tuya MCU
      const mfrs = compose.zigbee?.manufacturerName || []      ;
      const pids = compose.zigbee?.productId || []      ;
      if (mfrs.some(m => m.startsWith('_TZE')) && pids.length === 0) {
        auditReport.warnings.push(`Driver ${d}: Tuya MCU (_TZE) missing productId triggers.`);
      }

      // DP Duplication Check (if device.js exists)
      if (fs.existsSync(devJs)) {
        const content = fs.readFileSync(devJs, 'utf8');
        const dps = (content.match(/^\s*(\d+):/gm) || []).map(m => m.trim().replace(':', ''));
        const dups = dps.filter((item, index) => dps.indexOf(item) !== index);
        if (dups.length > 0) {
          auditReport.warnings.push(`Driver ${d}: Duplicate DP definitions found: ${[...new Set(dups)].join(', ')}`);
        }
      }
    }
  } catch (e) {
    auditReport.errors.push(`Driver Audit Error: ${e.message}`);
  }

  // 4. Thinking Reimplementation Engine (Rules 21-28) Compliance Audit
  try {
    console.log('Auditing Thinking Reimplementation Engine (Rules 21-28) Compliance...');
    
    // A. Rule 21: Flow Card Interoperability (app.json)
    const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const forbidden = ['driver_id=switch_2gang', 'driver_id=switch_3gang', 'driver_id=switch_4gang'];
    ['triggers', 'conditions', 'actions'].forEach(section => {
      (appJson.flow?.[section] || []).forEach(card => {
        if (card.filter && forbidden.some(f => card.filter.includes(f))) {
          auditReport.warnings.push(`Rule 21 Violation: Flow card ${card.id} uses forbidden ${card.filter}. Must use capability filters.`);
          auditReport.noDegradation = false;
        }
      });
    });

    // B. Rule 27: SDK 3+ Dot-Notation Hierarchy
    const drivers = fs.readdirSync(path.join(ROOT, 'drivers')).filter(d => fs.existsSync(path.join(ROOT, 'drivers', d, 'driver.compose.json')));
    for (const d of drivers) {
      const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', d, 'driver.compose.json'), 'utf8'));
      const caps = compose.capabilities || [];
      if (caps.some(c => c.includes('_') && (c.includes('gang') || c.includes('onoff')))) {
        auditReport.warnings.push(`Rule 27 Violation: Driver ${d} uses legacy underscore notation (${caps.find(c => c.includes('_'))}). Use dot.notation.`);
      }
    }

    // C. Rule 28: Composite Identity (Variation Manager)
    const variationMgr = fs.readFileSync(path.join(ROOT, 'lib/ManufacturerVariationManager.js'), 'utf8');
    if (!variationMgr.includes('productId') || !variationMgr.includes('equalsCI(productId')) {
      auditReport.warnings.push(`Rule 28 Violation: ManufacturerVariationManager might be missing Composite Identity (productId) logic.`);
    }

    console.log('   Thinking Reimplementation Engine Compliance: Completed with audits.');
  } catch (e) {
    auditReport.errors.push(`Autonomous Engine Reimplementation Audit Error: ${e.message}`);
  }

  // 4. Summarize to GitHub Summary
  const SUMMARY = process.env.GITHUB_STEP_SUMMARY || (process.platform === 'win32' ? 'NUL' : '/dev/null')      ;
  let md = '###  Self-Correction Audit Result\n';
  md += `| Check | Status |\n|--------|--------|\n`;
  md += `| Syntax | ${auditReport.syntaxOk ? '' : ''} |\n`      ;
  md += `| BVB Coherence | ${auditReport.bvbCoherenceOk ? '' : ''} |\n`      ;
  md += `| Performance/Regressions | ${auditReport.noDegradation ? '' : ''} |\n\n`      ;

  if (auditReport.errors.length) {
    md += '####  Errors\n';
    for (const e of auditReport.errors) md += `- ${e}\n`;
  }
  if (auditReport.warnings.length) {
    md += '####  Warnings\n';
    for (const w of auditReport.warnings) md += `- ${w}\n`;
  }

  fs.appendFileSync(SUMMARY, md + '\n');
  console.log('Audit complete.');
}

main().catch(console.error);
