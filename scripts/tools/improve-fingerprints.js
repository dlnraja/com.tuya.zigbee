'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Audit and improve driver fingerprints
 * Detects generic drivers that need more specific manufacturer IDs
 * 
 * Usage: node scripts/tools/improve-fingerprints.js
 */
async function improveFingerprints() {
  console.log('🔍 Auditing driver fingerprints...\n');
  
  const driversDir = path.join(__dirname, '../../drivers');
  const drivers = fs.readdirSync(driversDir);
  
  const issues = {
    generic: [],
    tooManyProductIds: [],
    noManufacturer: [],
    noProductId: [],
    good: []
  };
  
  for (const driverId of drivers) {
    const driverPath = path.join(driversDir, driverId, 'driver.compose.json');
    
    if (!fs.existsSync(driverPath)) continue;
    
    try {
      const driver = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
      
      const productIds = driver.productId || [];
      const manufacturers = driver.manufacturerName || [];
      
      // Check for issues
      if (productIds.includes('TS0002') && manufacturers.length === 0) {
        issues.generic.push({
          id: driverId,
          productIds,
          manufacturers
        });
      } else if (productIds.length > 10) {
        issues.tooManyProductIds.push({
          id: driverId,
          count: productIds.length
        });
      } else if (manufacturers.length === 0 && productIds.length > 0) {
        issues.noManufacturer.push({
          id: driverId,
          productIds
        });
      } else if (productIds.length === 0) {
        issues.noProductId.push(driverId);
      } else {
        issues.good.push(driverId);
      }
      
    } catch (err) {
      console.error(`❌ Error processing ${driverId}:`, err.message);
    }
  }
  
  // Report
  console.log(`📊 Fingerprint Audit Results:\n`);
  
  console.log(`✅ Good drivers: ${issues.good.length}`);
  console.log(`⚠️  Generic TS0002 drivers: ${issues.generic.length}`);
  console.log(`⚠️  Too many productIds (>10): ${issues.tooManyProductIds.length}`);
  console.log(`⚠️  No manufacturer: ${issues.noManufacturer.length}`);
  console.log(`⚠️  No productId: ${issues.noProductId.length}\n`);
  
  if (issues.generic.length > 0) {
    console.log(`🔴 CRITICAL: Generic TS0002 drivers (need specific manufacturerName):\n`);
    issues.generic.forEach(issue => {
      console.log(`   📦 ${issue.id}`);
      console.log(`      productId: ${JSON.stringify(issue.productIds)}`);
      console.log(`      ❌ manufacturerName: [] (EMPTY)`);
      console.log(`      💡 Solution: Add specific manufacturerName array\n`);
    });
  }
  
  if (issues.tooManyProductIds.length > 0) {
    console.log(`⚠️  Drivers with too many productIds (consider splitting):\n`);
    issues.tooManyProductIds.forEach(issue => {
      console.log(`   📦 ${issue.id} - ${issue.count} productIds`);
    });
    console.log();
  }
  
  if (issues.noManufacturer.length > 0) {
    console.log(`⚠️  Drivers missing manufacturerName:\n`);
    issues.noManufacturer.forEach(issue => {
      console.log(`   📦 ${issue.id}`);
      console.log(`      productId: ${JSON.stringify(issue.productIds)}`);
    });
    console.log();
  }
  
  // Generate improvement suggestions
  console.log(`📝 Improvement Recommendations:\n`);
  
  if (issues.generic.length > 0) {
    console.log(`1. Fix ${issues.generic.length} generic TS0002 drivers:`);
    console.log(`   - Add specific manufacturerName array from device pairing logs`);
    console.log(`   - Example: ["_TZ3000_4fjiwweb", "_TZ3000_ji4araar"]`);
    console.log();
  }
  
  if (issues.tooManyProductIds.length > 0) {
    console.log(`2. Review ${issues.tooManyProductIds.length} drivers with many productIds:`);
    console.log(`   - Consider splitting into category-specific drivers`);
    console.log(`   - Or add manufacturerName constraints`);
    console.log();
  }
  
  console.log(`3. ZCL Spec alignment:`);
  console.log(`   - Combine manufacturer + productId + modelId for specificity`);
  console.log(`   - Add cluster requirements in driver.json`);
  console.log(`   - Use ZCL cluster detection in pairing\n`);
  
  // Save report
  const reportPath = path.join(__dirname, '../../diagnostics/fingerprint-audit.json');
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2));
  console.log(`💾 Detailed report saved to: ${reportPath}\n`);
  
  return issues;
}

// Run if called directly
if (require.main === module) {
  improveFingerprints().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { improveFingerprints };
