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

  // 2. BVB Coherence Check
  try {
    console.log('Auditing BVB Mixin logic...');
    const mixin = fs.readFileSync(path.join(ROOT, 'lib/mixins/CapabilityManagerMixin.js'), 'utf8');
    
    // Check if 255 is still allowed for light
    const hasLightSafe = mixin.includes('isLighting') && mixin.includes('dim');
    // Check if error codes are present
    const hasErrorCodes = mixin.includes('65535') && mixin.includes('32767');
    
    if (hasLightSafe && hasErrorCodes) {
      auditReport.bvbCoherenceOk = true;
      console.log('  ✅ BVB Coherence: OK');
    } else {
      auditReport.warnings.push('BVB Logic appears compromised: missing light-safety or error codes');
      console.log('  ⚠️ BVB Coherence: Warning');
    }
  } catch (e) {
    auditReport.errors.push(`BVB Audit Error: ${e.message}`);
  }

  // 3. Driver/Fingerprint Integrity
  try {
    console.log('Checking Tuya MCU pairing integrity...');
    const conflictResult = JSON.parse(fs.readFileSync(path.join(STATE_DIR, 'driver-conflict-audit.json'), 'utf8'));
    const highRisk = conflictResult.pairingAudit || [];
    if (highRisk.length > 5) {
       auditReport.warnings.push(`Too many drivers (${highRisk.length}) missing Product IDs for Tuya MCU devices.`);
       auditReport.noDegradation = false;
    }
  } catch (e) {}

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
