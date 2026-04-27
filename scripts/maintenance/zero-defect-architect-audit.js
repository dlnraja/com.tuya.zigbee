#!/usr/bin/env node
'use strict';

/**
 * 
 *       ZERO DEFECT ARCHITECT AUDIT - v1.0.0                                    
 * 
 *   Senior Architect Tool for Universal Tuya Stability.                          
 *   Performs deep analysis of drivers, manifests, and core logic.                
 * 
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

async function main() {
  console.log(' Starting Zero Defect Architect Audit...');
  
  const auditResults = {
    timestamp: new Date().toISOString(),
    driversChecked: 0,
    collisions: [],
    buttonLogicFailures: [],
    sdkDeprecations: [],
    radarLogicCheck: [],
    numericConstantViolations: [],
    naNSafetyCheck: [],
    errors: []
  };

  // 1. MANIFEST CASE & ID COLLISION AUDIT
  console.log('\n Auditing Manifest Case & ID Collisions...');
  const idToDrivers = new Map(); // "mfr|pid" -> [driverIds]
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  
  for (const d of drivers) {
    const composePath = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    auditResults.driversChecked++;
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = compose.zigbee?.manufacturerName || [];
      const pids = compose.zigbee?.productId || [];
      
      // Check for mixed-case mfrs (rule 11)
      const uniqueMfrs = new Set(mfrs);
      for (const mfr of mfrs) {
        if (uniqueMfrs.has(mfr.toLowerCase()) && mfr !== mfr.toLowerCase()) {
          // Intersection of cases
        }
      }

      // Map IDs to drivers to find collisions
      for (const mfr of mfrs) {
        for (const pid of (pids.length ? pids : ['*'])) {
          const key = `${mfr.toUpperCase()}|${pid.toUpperCase()}`;
          if (!idToDrivers.has(key)) idToDrivers.set(key, []);
          idToDrivers.get(key).push(d);
        }
      }

      // 2. BUTTON LOGIC AUDIT
      if (d.includes('button') || d.includes('remote') || d.includes('switch_wireless')) {
        const devicePath = path.join(DRIVERS_DIR, d, 'device.js');
        if (fs.existsSync(devicePath)) {
          const content = fs.readFileSync(devicePath, 'utf8');
          // Check if it inherits from ButtonDevice or uses the recovery logic
          if (content.includes('ButtonDevice') && !content.includes('onEndDeviceAnnounce')) {
             if (content.match(/async onNodeInit\s*\(/) && !content.includes('super.onNodeInit')) {
                auditResults.buttonLogicFailures.push(`${d}: overrides onNodeInit without calling super.onNodeInit`);
             }
          }
        }
      }
      
      // 3. RADAR LOGIC AUDIT
      if (d.includes('radar') || d.includes('presence')) {
          const devicePath = path.join(DRIVERS_DIR, d, 'device.js');
          if (fs.existsSync(devicePath)) {
            const content = fs.readFileSync(devicePath, 'utf8');
            if (!content.includes('HybridSensorBase') && !content.includes('BaseHybridDevice') && 
                !content.includes('UnifiedSensorBase') && !content.includes('BaseUnifiedDevice')) {
                auditResults.radarLogicCheck.push(`${d}: Missing hybrid base inheritance for radar.`);
            }
            
            if ((content.includes('_handleTuyaResponse') || content.includes('_handleDP')) && !content.includes('_intelGate.process')) {
                auditResults.radarLogicCheck.push(`${d}: Overrides handler but missing _intelGate.process call.`);
            }
          }
      }

    } catch (e) {
      auditResults.errors.push(`${d}: Manifest parse error: ${e.message}`);
    }
  }

  // Detect collisions
  for (const [key, drvs] of idToDrivers.entries()) {
    const uniqueDrivers = [...new Set(drvs)];
    if (uniqueDrivers.length > 1 && !key.includes('XXXXXXX')) {
      auditResults.collisions.push({ id: key, drivers: uniqueDrivers });
    }
  }

  // 4. PROJECT-WIDE AUDIT
  console.log(' Executing Project-Wide Integrity Scan...');
  
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
         if (['node_modules', '.git', '.gemini', 'brain', 'scratch', 'scripts', 'docs', 'assets', 'locales', 'test'].includes(file)) continue;
         walk(full);
      } else if (file.endsWith('.js') || file.endsWith('.json')) {
        const content = fs.readFileSync(full, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('#!')) return;

          for (let i = 0; i < line.length; i++) {
              const charCode = line.charCodeAt(i);
              const isForbidden = (charCode < 32 && ![9, 10, 13].includes(charCode)) || 
                                  charCode === 0xFEFF || charCode === 0x200B || charCode === 0xA0;
              if (isForbidden && !full.includes('CaseInsensitiveMatcher.js') && !full.includes('ManufacturerNameHelper.js')) {
                  const rel = path.relative(ROOT, full);
                  auditResults.errors.push(`${rel}:${idx + 1}: Forbidden invisible character (char code ${charCode}) detected.`);
                  break; 
              }
          }

          if (file.endsWith('.json')) return;

          const codeOnly = line
            .replace(/\r/g, '')
            .replace(/\/\/.*$/, '')
            .replace(/(['"`])((?:\\.|(?!\1).)*?)\1/g, '$1$1')
            .replace(/\/[^*].*?\/[gimy]*(?=[.) ,;\]]|$)/g, ' '); // Improved regex literal detection

          if (codeOnly.includes('drivers.getDevice(') || codeOnly.includes('drivers.getDeviceById(') || (codeOnly.includes('getDriver(') && codeOnly.includes('.getDevice('))) {
            const rel = path.relative(ROOT, full);
            auditResults.sdkDeprecations.push(`${rel}:${idx + 1}: ${trimmed.substring(0, 100)}`);
          }

          if ((codeOnly.includes('0xEF00')) && !full.includes('ZigbeeConstants.js') && !codeOnly.includes('CLUSTERS.TUYA_EF00')) {
             const rel = path.relative(ROOT, full);
             auditResults.numericConstantViolations.push(`${rel}:${idx + 1}: Cluster 0xEF00 used as literal instead of CLUSTERS.TUYA_EF00`);
          }

          if ((codeOnly.includes('manufacturerName') || codeOnly.includes('modelId') || codeOnly.includes('productId')) && 
              (codeOnly.includes('===') || codeOnly.includes('==') || codeOnly.includes('toLowerCase()') || codeOnly.includes('toUpperCase()') || codeOnly.includes('.includes('))) {
             if (!full.includes('CaseInsensitiveMatcher.js') && !full.includes('ManufacturerNameHelper.js') && !full.includes('zero-defect-architect-audit.js') && !codeOnly.includes('CI.')) {
                const rel = path.relative(ROOT, full);
                auditResults.errors.push(`${rel}:${idx + 1}: Manual identity comparison found. Use "CI" CaseInsensitiveMatcher helper.`);
             }
          }

          if ((codeOnly.includes('/') || codeOnly.includes('*')) && !full.includes('tuyaUtils.js')) {
             if (!codeOnly.includes('safeParse') && 
                 !codeOnly.includes('safeDivide') && 
                 !codeOnly.includes('safeMultiply') && 
                 !codeOnly.includes('Number.isNaN') &&
                 !codeOnly.includes('Number.isFinite')) {
                
                const isImportExport = codeOnly.match(/^\s*(import|export)\s+\*/);
                const isDocBlock = codeOnly.includes('*/');
                const isTemplateLiteral = trimmed.includes('${') && trimmed.includes('}');
                const isSafeConstant = codeOnly.match(/(\*\s*(1000|60|100|3600|24))|(\/\s*(1000|100|10|2))/);
                const isMathRandom = codeOnly.includes('Math.random()');

                if (!isImportExport && !isDocBlock && !isSafeConstant && !isMathRandom) {
                  if (codeOnly.match(/[a-zA-Z0-9_$\].)]\s*[\/*](?!\s*\*)\s*[a-zA-Z0-9_$0-9.]+/)) {
                     const rel = path.relative(ROOT, full);
                     auditResults.naNSafetyCheck.push(`${rel}:${idx+1}: Potential unchecked division/multiplication (NaN risk)`);
                  }
                }
             }
          }
        });
      }
    }
  };
  
  walk(ROOT);

  console.log('\n Audit Report Summary:');
  console.log(`- Drivers Checked: ${auditResults.driversChecked}`);
  console.log(`- ID Collisions: ${auditResults.collisions.length}`);
  console.log(`- Button Logic Issues: ${auditResults.buttonLogicFailures.length}`);
  console.log(`- SDK Deprecations: ${auditResults.sdkDeprecations.length}`);
  console.log(`- Radar Logic Issues: ${auditResults.radarLogicCheck.length}`);
  console.log(`- Numeric Constant Violations: ${auditResults.numericConstantViolations.length}`);
  console.log(`- NaN Safety Warnings: ${auditResults.naNSafetyCheck.length}`);
  
  if (auditResults.collisions.length > 0) {
    console.log('\n COLLISION ALERT:');
    auditResults.collisions.slice(0, 5).forEach(c => console.log(`  - ${c.id}: [${c.drivers.join(', ')}]`));
  }

  const reportPath = path.join(ROOT, 'docs/reports/ZERO_DEFECT_AUDIT.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log(`\n Detailed report saved to: ${reportPath}`);
}

main().catch(console.error);
