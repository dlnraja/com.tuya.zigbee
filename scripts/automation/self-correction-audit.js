#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const STATE_DIR = path.join(ROOT, '.github/state');

async function main() {
  console.log('=== 🤖 AI Self-Correction Audit (v1.0) ===');
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
    console.log('  ✅ Syntax: OK');
  } catch (e) {
    auditReport.errors.push(`Homey Validation Failed: ${e.message}`);
    console.log('  ❌ Syntax: Failed');
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
      console.log('  ✅ BVB Coherence: OK');
    } else {
      auditReport.warnings.push(`BVB Logic compromised. Missing: ${Object.entries(checks).filter(([k,v]) => !v).map(([k]) => k).join(', ')}`);
      console.log('  ⚠️ BVB Coherence: Warning');
    }
  } catch (e) {
    auditReport.errors.push(`BVB Audit Error: ${e.message}`);
  }

  // 3. Driver Integrity & Orphan Check (Cloudless)
  try {
    console.log('Auditing Driver Integrity...');
    const drivers = fs.readdirSync(path.join(ROOT, 'drivers')).filter(d => fs.existsSync(path.join(ROOT, 'drivers', d, 'driver.compose.json')));
    
    for (const d of drivers) {
      const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', d, 'driver.compose.json'), 'utf8'));
      const devJs = path.join(ROOT, 'drivers', d, 'device.js');
      
      // Orphan Check
      if (!fs.existsSync(devJs)) {
        auditReport.errors.push(`Driver ${d} is missing device.js (Orphan)`);
        auditReport.noDegradation = false;
      }

      // PID/Mfr Pair Check for Tuya MCU
      const mfrs = compose.zigbee?.manufacturerName || [];
      const pids = compose.zigbee?.productId || [];
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

  // 4. Summarize to GitHub Summary
  const SUMMARY = process.env.GITHUB_STEP_SUMMARY || (process.platform === 'win32' ? 'NUL' : '/dev/null');
  let md = '### ⚙️ Self-Correction Audit Result\n';
  md += `| Check | Status |\n|--------|--------|\n`;
  md += `| Syntax | ${auditReport.syntaxOk ? '✅' : '❌'} |\n`;
  md += `| BVB Coherence | ${auditReport.bvbCoherenceOk ? '✅' : '⚠️'} |\n`;
  md += `| Performance/Regressions | ${auditReport.noDegradation ? '✅' : '⚠️'} |\n\n`;

  if (auditReport.errors.length) {
    md += '#### 🔴 Errors\n';
    for (const e of auditReport.errors) md += `- ${e}\n`;
  }
  if (auditReport.warnings.length) {
    md += '#### 🟡 Warnings\n';
    for (const w of auditReport.warnings) md += `- ${w}\n`;
  }

  fs.appendFileSync(SUMMARY, md + '\n');
  console.log('Audit complete.');
}

main().catch(console.error);
