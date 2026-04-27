#!/usr/bin/env node
'use strict';

const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');


const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const EXT_DATA = path.join(ROOT, '.github', 'state', 'external-sources-data.json');
const INTEL_DATA = path.join(ROOT, '.github', 'state', 'device-functionality.json');

async function main() {
  console.log('  NEXUS AWAKENING MASTER CHALLENGER - ACTIVATED');
  console.log('==========================================');

  const report = {
    timestamp: new Date().toISOString(),
    drivers: {},
    gaps: [],
    violations: [],
    innovationOpportunities: []
  };

  // 1. Load External Intelligence
  let extIntel = { allDevices: [] };
  try {
    if (fs.existsSync(EXT_DATA)) extIntel = JSON.parse(fs.readFileSync(EXT_DATA, 'utf8'));
    else if (fs.existsSync(INTEL_DATA)) extIntel = JSON.parse(fs.readFileSync(INTEL_DATA, 'utf8'));
  } catch (e) {
    console.error(' Failed to load external intelligence context.');
  }

  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());

  for (const drvId of drivers) {
    const composePath = path.join(DRIVERS_DIR, drvId, 'driver.compose.json');
    const devicePath = path.join(DRIVERS_DIR, drvId, 'device.js');
    if (!fs.existsSync(composePath)) continue;

    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Load flows from separate file if it exists (Rule 15 compatibility)
    const flowPath = path.join(DRIVERS_DIR, drvId, 'driver.flow.compose.json');
    let flowData = compose.flow || {};
    if (fs.existsSync(flowPath)) {
       try {
         const extraFlows = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
         flowData = { ...flowData, ...extraFlows };
       } catch (e) {
         console.error(` Failed to parse flow file for ${drvId}`);
       }
    }
    
    const mfrs = compose.zigbee?.manufacturerName || []       ;
    const caps = compose.capabilities || [];
    
    let deviceJs = '';
    if (fs.existsSync(devicePath)) deviceJs = fs.readFileSync(devicePath, 'utf8');

    // A. INTELLIGENCE CROSS-REFERENCE (Capability Gaps)
    for (const mfr of mfrs) {
      const extMatch = extIntel.allDevices?.find(d => d.fp === mfr)       ;
      if (extMatch ) {
         const extDPs = extMatch.dps || [];
         const localDPsMatch = deviceJs.match(/dp[:\s=]*(\d+)/g) || [];
         const localDPs = localDPsMatch.map(m => parseInt(m.match(/\d+/)[0]));

         const missingDPs = extDPs.filter(dp => !localDPs.includes(dp));
         if (missingDPs.length > 0) {
           report.gaps.push({
             driver: drvId,
             mfr: mfr,
             type: 'MISSING_DATAPOINTS',
             details: `Z2M/ZHA found DPs [${missingDPs.join(', ')}] not handled locally.`
           });
         }
      }
    }

    // B. ARCHITECTURAL CHALLENGE (Hybrid/Unified Coverage)
    const isModernSource = deviceJs.includes('BaseHybridDevice') || deviceJs.includes('Hybrid') || 
                           deviceJs.includes('UnifiedSensorBase') || deviceJs.includes('BaseUnifiedDevice');
    if (drvId.includes('sensor') && drvId.includes('radar') && !isModernSource) {
       report.violations.push({
         driver: drvId,
         violation: 'NON_MODERN_RADAR',
         severity: 'HIGH',
         fix: 'Migrate to UnifiedSensorBase or HybridSensorBase for improved stability.'
       });
    }

    // C. FLOW LINKAGE CHALLENGE (Multi-Gang - Zigbee Only)
    if (drvId.includes('gang') && drvId.includes('switch') && !drvId.includes('wifi')) {
       const gangMatch = drvId.match(/(\d+)gang/);
       if (gangMatch) {
          const expectedGangs = parseInt(gangMatch[1]);
          for (let g = 2; g <= expectedGangs; g++) {
             const flowId = `${drvId}_physical_gang${g}_on`;
             if (!JSON.stringify(flowData).includes(flowId)) {
                report.violations.push({
                  driver: drvId,
                  violation: 'UNLINKED_GANG_FLOW',
                  details: `Gang ${g} missing physical toggle flow trigger: ${flowId}`
                });
             }
          }
       }
    }

    // D. SDK 3 CHALLENGE (Deprecated Methods)
    const deprecated = ['onMeshInit', 'getDevice', 'getDriver', 'this.homey.manager'];
    for (const dep of deprecated) {
      if (deviceJs.includes(dep)) {
        if (dep === 'getDevice' && (deviceJs.includes('drivers.getDevice') || deviceJs.includes('getDriver().getDevice'))) {
           report.violations.push({
             driver: drvId,
             violation: 'SDK_DEPRECATION',
             details: `Found legacy method: ${dep}`
           });
        }
      }
    }

    // E. INNOVATION OPPORTUNITY (Power Monitoring)
    if (drvId.includes('switch') || drvId.includes('plug')) {
       if (!caps.includes('measure_power') && deviceJs.includes(CLUSTERS.TUYA_EF00)) {
          const hasPowerIntel = mfrs.some(m => extIntel.allDevices?.find(d => d.fp === m && (d.caps?.includes('power' ) || d.dps?.includes(6))))      ;
          if (hasPowerIntel) {
            report.innovationOpportunities.push({
              driver: drvId,
              type: 'HIDDEN_POWER_MONITORING',
              details: 'External data suggests some models in this driver support power measurement (DP 6 or 17).'
            });
          }
       }
    }
  }

  // 2. Final Report
  console.log(`\n Audit complete for ${drivers.length} drivers.`);
  console.log(` Violations/Defects: ${report.violations.length}`);
  console.log(`  Capability Gaps: ${report.gaps.length}`);
  console.log(` Innovation Opps: ${report.innovationOpportunities.length}`);

  const reportPath = path.join(ROOT, 'docs/reports/NEXUS_AWAKENING_CHALLENGE_REPORT.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Create Human-Readable summary
  let md = `#  Autonomous Engine Reimplementation Challenge Report\n\n`;
  md += `**Date:** ${report.timestamp}\n\n`;
  md += `##  Strict Architectural Violations (${report.violations.length})\n`;
  report.violations.forEach(v => md += `- **${v.driver}**: ${v.violation} (${v.details || v.fix})\n`);
  
  md += `\n##  Capability Gaps vs Industrial Sources (${report.gaps.length})\n`;
  report.gaps.slice(0, 20).forEach(g => md += `- **${g.driver}**: ${g.details}\n`);

  md += `\n##  Innovation Opportunities (${report.innovationOpportunities.length})\n`;
  report.innovationOpportunities.forEach(o => md += `- **${o.driver}**: ${o.details}\n`);

  fs.writeFileSync(path.join(ROOT, 'docs/reports/NEXUS_AWAKENING_SUMMARY.md'), md);
  console.log(`\n Reports saved to docs/reports/`);
}

main().catch(console.error);
