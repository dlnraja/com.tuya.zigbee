#!/usr/bin/env node
const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const BVB_FILE = path.join(ROOT, 'lib/mixins/CapabilityManagerMixin.js');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function extractBVB() {
  if (!fs.existsSync(BVB_FILE)) return null;
  const content = fs.readFileSync(BVB_FILE, 'utf8');
  const match = content.match(/const BVB_CONSTRAINTS = ({[\s\S]+? }) : null;/);
  if (!match ) return null;
  try {
    // Basic parser for the JS object (not JSON)
    const raw = match[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"').replace(/,\s*}/g, '}');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function auditCoverage(constraints) {
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.existsSync(path.join(DRIVERS_DIR, d, 'driver.compose.json')));
  const coverage = {
    protected: new Set(),
    unprotected: new Set(),
    totalCaps: new Set()
  };

  for (const d of drivers) {
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(DRIVERS_DIR, d, 'driver.compose.json'), 'utf8'));
      const caps = manifest.capabilities || [];
      for (const cap of caps) {
        coverage.totalCaps.add(cap);
        const base = cap.split('.')[0];
        if (constraints[cap] || constraints[base]) {
          coverage.protected.add(cap);
        } else {
          coverage.unprotected.add(cap);
        }
      }
    } catch (e) {}
  }

  return {
    protected: [...coverage.protected].sort(),
    unprotected: [...coverage.unprotected].sort(),
    percentage: Math.round(((coverage.protected.size / coverage.totalCaps.size)) * 100)
  };
}

async function main() {
  console.log('=== BVB Protection Audit (v6.1.4) ===');
  const constraints = extractBVB();
  if (!constraints) {
    console.error('Failed to extract BVB constraints from mixin.');
    process.exit(1);
  }

  const report = auditCoverage(constraints);
  console.log(`Coverage: ${report.percentage}% (${report.protected.length}/${report.protected.length + report.unprotected.length} capabilities)`);
  
  let md = '###  BVB Protection Health\n';
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Protected Capabilities | ${report.protected.length} |\n`;
  md += `| Unprotected | ${report.unprotected.length} |\n`;
  md += `| Safety Coverage | ${report.percentage}% |\n\n`;

  md += '####  Unprotected Critical Targets\n';
  const critical = ['measure_voltage', 'measure_current', 'measure_power', 'meter_power', 'measure_luminance'];
  for (const c of critical) {
    if (report.unprotected.includes(c)) {
      md += `- ${c} (High Priority)\n`;
    }
  }

  const SUMMARY = process.env.GITHUB_STEP_SUMMARY || (process.platform === 'win32' ? 'NUL' : '/dev/null')      ;
  fs.appendFileSync(SUMMARY, md + '\n');
  console.log('Report appended to GITHUB_STEP_SUMMARY');
}

main().catch(console.error);
