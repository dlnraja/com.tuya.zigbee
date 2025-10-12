#!/usr/bin/env node
'use strict';

/**
 * ENRICH_ALL_DRIVERS.js
 * Enrichissement intelligent de tous les drivers
 * 
 * PRIORITÉS:
 * 1. User reports (forum, diagnostic logs) - POIDS 10
 * 2. GitHub issues / community - POIDS 8
 * 3. Device databases (Zigbee2MQTT, Blakadder) - POIDS 6
 * 4. Manufacturer docs - POIDS 4
 */

const fs = require('fs');
const path = require('path');
const { scrapeHomeyForum, analyzeDeviceReports } = require('./MEGA_SCRAPER_V2');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const REPORTS_DIR = path.join(__dirname, '../../docs/enrichment');

/**
 * Load current driver manifest
 */
function loadDriverManifest(driverPath) {
  const manifestPath = path.join(driverPath, 'driver.compose.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

/**
 * Check if driver needs enrichment
 */
function needsEnrichment(manifest) {
  if (!manifest) return false;
  
  const issues = [];
  
  // Check manufacturer IDs
  if (!manifest.id || !manifest.id.includes('_')) {
    issues.push('Missing specific manufacturer ID');
  }
  
  // Check zigbee config
  if (manifest.zigbee && manifest.zigbee.manufacturerName) {
    if (manifest.zigbee.manufacturerName.includes('_TZE284_')) {
      issues.push('Contains wildcard manufacturer ID');
    }
  }
  
  // Check endpoints
  if (!manifest.zigbee || !manifest.zigbee.endpoints) {
    issues.push('Missing endpoint configuration');
  }
  
  return {
    needs: issues.length > 0,
    issues
  };
}

/**
 * Enrich driver based on user report
 */
function enrichFromUserReport(driverName, userDevice, manifest) {
  console.log(`  🔧 Enriching ${driverName} from user report...`);
  
  const enrichments = [];
  
  // Apply fixes based on recommendations
  if (userDevice.recommendations) {
    for (const rec of userDevice.recommendations) {
      if (rec.status === 'implemented_v2.15.1') {
        console.log(`    ✅ ${rec.fix} (already implemented)`);
      } else {
        enrichments.push(rec);
        console.log(`    📝 TODO: ${rec.fix}`);
      }
    }
  }
  
  // Check if we need manufacturer ID
  if (userDevice.needsEnrichment) {
    enrichments.push({
      type: 'data_request',
      action: 'Request Zigbee interview data',
      user: userDevice.source,
      diagnosticCode: userDevice.diagnosticCode,
      priority: userDevice.priority
    });
  }
  
  return enrichments;
}

/**
 * Enrich driver from GitHub/database sources
 */
function enrichFromDatabase(driverName, githubDevice, manifest) {
  console.log(`  🔧 Enriching ${driverName} from database...`);
  
  const updates = {};
  
  // Update manufacturer ID if more specific
  if (githubDevice.manufacturerId && githubDevice.verified) {
    updates.manufacturerId = githubDevice.manufacturerId;
  }
  
  // Update model ID
  if (githubDevice.modelId) {
    updates.modelId = githubDevice.modelId;
  }
  
  // Update clusters
  if (githubDevice.clusters) {
    updates.clusters = githubDevice.clusters;
  }
  
  return updates;
}

/**
 * Generate enrichment plan
 */
function generateEnrichmentPlan(allEnrichments) {
  const plan = {
    timestamp: new Date().toISOString(),
    drivers: [],
    userRequests: [],
    autoUpdates: [],
    stats: {
      totalDrivers: 0,
      needsUserData: 0,
      canAutoEnrich: 0,
      alreadyFixed: 0
    }
  };
  
  for (const [driverName, enrichments] of Object.entries(allEnrichments)) {
    plan.stats.totalDrivers++;
    
    const driverPlan = {
      driver: driverName,
      priority: 0,
      actions: []
    };
    
    for (const enrich of enrichments) {
      if (enrich.type === 'data_request') {
        plan.stats.needsUserData++;
        driverPlan.priority = Math.max(driverPlan.priority, enrich.priority || 5);
        plan.userRequests.push({
          driver: driverName,
          user: enrich.user,
          diagnosticCode: enrich.diagnosticCode,
          priority: enrich.priority
        });
      } else if (enrich.type === 'code_fix' && enrich.status !== 'implemented_v2.15.1') {
        driverPlan.actions.push(enrich);
        plan.stats.canAutoEnrich++;
      } else if (enrich.status === 'implemented_v2.15.1') {
        plan.stats.alreadyFixed++;
      } else {
        driverPlan.actions.push(enrich);
        plan.autoUpdates.push({
          driver: driverName,
          ...enrich
        });
      }
    }
    
    if (driverPlan.actions.length > 0 || driverPlan.priority > 0) {
      plan.drivers.push(driverPlan);
    }
  }
  
  // Sort by priority
  plan.drivers.sort((a, b) => b.priority - a.priority);
  plan.userRequests.sort((a, b) => b.priority - a.priority);
  
  return plan;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 DRIVER ENRICHMENT SYSTEM');
  console.log('═'.repeat(60));
  console.log('Priorité: User Reports > GitHub > Databases > Docs');
  console.log('═'.repeat(60));
  
  try {
    // 1. Scrape forum for user reports
    console.log('\n📊 PHASE 1: Collecting user reports...');
    const forumData = await scrapeHomeyForum();
    const userDevices = await analyzeDeviceReports(forumData.deviceReports);
    
    // 2. Scan drivers
    console.log('\n📂 PHASE 2: Scanning drivers...');
    const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
      return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
    });
    console.log(`  Found ${drivers.length} drivers`);
    
    // 3. Analyze each driver
    console.log('\n🔍 PHASE 3: Analyzing drivers...');
    const allEnrichments = {};
    let needsEnrichCount = 0;
    
    for (const driver of drivers) {
      const driverPath = path.join(DRIVERS_DIR, driver);
      const manifest = loadDriverManifest(driverPath);
      
      if (!manifest) continue;
      
      const enrichCheck = needsEnrichment(manifest);
      if (enrichCheck.needs) {
        needsEnrichCount++;
        console.log(`  ⚠️  ${driver}: ${enrichCheck.issues.join(', ')}`);
      }
      
      // Check if this driver has user reports
      const userReport = userDevices.find(d => d.driver === driver);
      if (userReport) {
        console.log(`  🔥 ${driver}: PRIORITY (user report)`);
        allEnrichments[driver] = enrichFromUserReport(driver, userReport, manifest);
      }
    }
    
    console.log(`\n  Total needing enrichment: ${needsEnrichCount}/${drivers.length}`);
    
    // 4. Generate enrichment plan
    console.log('\n📋 PHASE 4: Generating enrichment plan...');
    const plan = generateEnrichmentPlan(allEnrichments);
    
    // 5. Save plan
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const planPath = path.join(REPORTS_DIR, `enrichment_plan_${Date.now()}.json`);
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    
    // 6. Generate user request list
    const requestsPath = path.join(REPORTS_DIR, 'user_data_requests.md');
    let requestsMd = '# 📧 User Data Requests\n\n';
    requestsMd += `Generated: ${new Date().toISOString()}\n\n`;
    requestsMd += '## High Priority Requests\n\n';
    
    for (const req of plan.userRequests) {
      requestsMd += `### ${req.driver}\n`;
      requestsMd += `- **User**: ${req.user}\n`;
      requestsMd += `- **Diagnostic Code**: \`${req.diagnosticCode}\`\n`;
      requestsMd += `- **Priority**: ${req.priority}/10\n`;
      requestsMd += `- **Action**: Request Zigbee interview data\n\n`;
    }
    
    fs.writeFileSync(requestsPath, requestsMd);
    
    // 7. Summary
    console.log('\n✅ ENRICHMENT ANALYSIS COMPLETE!');
    console.log('═'.repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`   Total Drivers: ${plan.stats.totalDrivers}`);
    console.log(`   Need User Data: ${plan.stats.needsUserData}`);
    console.log(`   Can Auto-Enrich: ${plan.stats.canAutoEnrich}`);
    console.log(`   Already Fixed: ${plan.stats.alreadyFixed}`);
    console.log('');
    console.log(`📄 Plan saved: ${planPath}`);
    console.log(`📧 Requests: ${requestsPath}`);
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Review enrichment plan');
    console.log('   2. Contact users for diagnostic data');
    console.log('   3. Apply auto-enrichments');
    console.log('   4. Test with v2.15.1');
    console.log('   5. Publish when ready (manual: pwsh scripts/automation/PUBLISH_TO_HOMEY.ps1)');
    
    return plan;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, enrichFromUserReport, generateEnrichmentPlan };
