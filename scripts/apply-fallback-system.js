#!/usr/bin/env node
'use strict';

/**
 * APPLY FALLBACK SYSTEM TO ALL DRIVERS
 * 
 * Intègre le système de fallback intelligent dans tous les 183 drivers
 * Basé sur best practices IKEA TRÅDFRI, Xiaomi Mi Home, SONOFF
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🚀 APPLYING FALLBACK SYSTEM TO ALL DRIVERS\n');
console.log('='.repeat(70));

const stats = {
  processed: 0,
  modified: 0,
  skipped: 0,
  errors: 0
};

/**
 * Code template pour ajouter FallbackSystem
 */
const FALLBACK_IMPORT = `const FallbackSystem = require('../../lib/FallbackSystem');`;

const FALLBACK_INIT = `
    // Initialize Fallback System
    this.fallback = new FallbackSystem(this, {
      maxRetries: 3,
      baseDelay: 1000,
      verbosity: this.getSetting('debug_level') || 'INFO',
      trackPerformance: true
    });
    this.log('✅ FallbackSystem initialized');`;

const FALLBACK_READ_METHOD = `
  /**
   * Read attribute with intelligent fallback
   * Tries multiple strategies until success
   */
  async readAttributeSafe(cluster, attribute) {
    try {
      return await this.fallback.readAttributeWithFallback(cluster, attribute);
    } catch (err) {
      this.error(\`Failed to read \${cluster}.\${attribute} after all fallback strategies:\`, err);
      throw err;
    }
  }`;

const FALLBACK_REPORT_METHOD = `
  /**
   * Configure report with intelligent fallback
   */
  async configureReportSafe(config) {
    try {
      return await this.fallback.configureReportWithFallback(config);
    } catch (err) {
      this.error(\`Failed to configure report after all fallback strategies:\`, err);
      // Don't throw - use polling as ultimate fallback
      return { success: false, method: 'polling' };
    }
  }`;

const FALLBACK_IAS_METHOD = `
  /**
   * IAS Zone enrollment with fallback
   */
  async enrollIASZoneSafe() {
    try {
      return await this.fallback.iasEnrollWithFallback();
    } catch (err) {
      this.error('Failed to enroll IAS Zone after all fallback strategies:', err);
      throw err;
    }
  }`;

const FALLBACK_STATS_METHOD = `
  /**
   * Get fallback system statistics
   */
  getFallbackStats() {
    return this.fallback ? this.fallback.getStats() : null;
  }`;

/**
 * Process single driver
 */
function processDriver(driverName) {
  stats.processed++;
  
  const driverDir = path.join(DRIVERS_DIR, driverName);
  const deviceJs = path.join(driverDir, 'device.js');
  
  if (!fs.existsSync(deviceJs)) {
    console.log(`⚠️  [${driverName}] No device.js found`);
    stats.skipped++;
    return;
  }
  
  try {
    let content = fs.readFileSync(deviceJs, 'utf8');
    let modified = false;
    
    // Check if already has FallbackSystem
    if (content.includes('FallbackSystem')) {
      console.log(`⏭️  [${driverName}] Already has FallbackSystem`);
      stats.skipped++;
      return;
    }
    
    // 1. Add import if not present
    if (!content.includes("require('../../lib/FallbackSystem')")) {
      // Find last require statement
      const requireRegex = /const .+ = require\(.+\);/g;
      const matches = content.match(requireRegex);
      
      if (matches && matches.length > 0) {
        const lastRequire = matches[matches.length - 1];
        content = String(content).replace(lastRequire, `${lastRequire}\n${FALLBACK_IMPORT}`);
        modified = true;
      }
    }
    
    // 2. Add initialization in onNodeInit
    if (content.includes('async onNodeInit(')) {
      // Find onNodeInit and add after super.onNodeInit()
      const onNodeInitRegex = /(async onNodeInit\(\{[^}]*\}\)\s*\{[\s\S]*?super\.onNodeInit\(\{[^}]*\}\);)/;
      const match = content.match(onNodeInitRegex);
      
      if (match) {
        content = String(content).replace(match[1], `${match[1]}${FALLBACK_INIT}`);
        modified = true;
      }
    }
    
    // 3. Add helper methods before last closing brace
    const lastBraceIndex = content.lastIndexOf('}');
    if (lastBraceIndex > 0) {
      const before = content.substring(0, lastBraceIndex);
      const after = content.substring(lastBraceIndex);
      
      content = before + 
        '\n' + FALLBACK_READ_METHOD + 
        '\n' + FALLBACK_REPORT_METHOD + 
        '\n' + FALLBACK_IAS_METHOD + 
        '\n' + FALLBACK_STATS_METHOD + 
        '\n' + after;
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(deviceJs, content, 'utf8');
      console.log(`✅ [${driverName}] FallbackSystem added`);
      stats.modified++;
    }
    
  } catch (err) {
    console.error(`❌ [${driverName}] Error:`, err.message);
    stats.errors++;
  }
}

/**
 * Main execution
 */
function main() {
  if (!fs.existsSync(DRIVERS_DIR)) {
    console.error('❌ Drivers directory not found!');
    process.exit(1);
  }
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(name => {
      const stat = fs.statSync(path.join(DRIVERS_DIR, name));
      return stat.isDirectory();
    });
  
  console.log(`\n📁 Found ${drivers.length} drivers\n`);
  
  for (const driver of drivers) {
    processDriver(driver);
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY:\n');
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Modified:  ${stats.modified} ✅`);
  console.log(`   Skipped:   ${stats.skipped} ⏭️`);
  console.log(`   Errors:    ${stats.errors} ❌`);
  
  const successRate = ((stats.modified / stats.processed) * 100).toFixed(1);
  console.log(`\n   Success Rate: ${successRate}%`);
  
  if (stats.modified > 0) {
    console.log('\n✅ FallbackSystem successfully integrated!');
    console.log('\n📝 Next steps:');
    console.log('   1. Review changes: git diff');
    console.log('   2. Test with real device');
    console.log('   3. Commit: git add -A && git commit -m "feat: Integrate FallbackSystem"');
  }
  
  console.log('\n' + '='.repeat(70));
}

main();
