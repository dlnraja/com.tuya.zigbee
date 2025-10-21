#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * VALIDATE DRIVER IMAGES
 * Vérifie et corrige les problèmes d'images dans tous les drivers
 */

async function checkDriverImages() {
  const driversDir = path.join(__dirname, '../..', 'drivers');
  const folders = await fs.readdir(driversDir);
  
  const issues = {
    missing_small: [],
    missing_large: [],
    invalid_size: [],
    using_placeholder: [],
    total_ok: 0
  };
  
  console.log('🔍 VALIDATING DRIVER IMAGES\n');
  
  for (const folder of folders) {
    try {
      const driverPath = path.join(driversDir, folder);
      const stats = await fs.stat(driverPath);
      if (!stats.isDirectory()) continue;
      
      const assetsPath = path.join(driverPath, 'assets');
      const smallPath = path.join(assetsPath, 'small.png');
      const largePath = path.join(assetsPath, 'large.png');
      
      let hasIssues = false;
      
      // Check small.png
      try {
        const smallStats = await fs.stat(smallPath);
        
        // Check if it's the placeholder (very small size)
        if (smallStats.size < 1000) {
          issues.using_placeholder.push({ driver: folder, file: 'small.png', size: smallStats.size });
          hasIssues = true;
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          issues.missing_small.push(folder);
          hasIssues = true;
        }
      }
      
      // Check large.png
      try {
        const largeStats = await fs.stat(largePath);
        
        // Check if it's too small (probably placeholder)
        if (largeStats.size < 2000) {
          issues.using_placeholder.push({ driver: folder, file: 'large.png', size: largeStats.size });
          hasIssues = true;
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          issues.missing_large.push(folder);
          hasIssues = true;
        }
      }
      
      if (!hasIssues) {
        issues.total_ok++;
      }
      
    } catch (err) {
      // Skip non-directory items
    }
  }
  
  return issues;
}

async function generateReport(issues) {
  console.log('\n📊 VALIDATION REPORT\n');
  
  console.log(`✅ Drivers OK: ${issues.total_ok}`);
  console.log(`❌ Missing small.png: ${issues.missing_small.length}`);
  console.log(`❌ Missing large.png: ${issues.missing_large.length}`);
  console.log(`⚠️  Using placeholder images: ${issues.using_placeholder.length}`);
  
  if (issues.missing_small.length > 0) {
    console.log('\n\n🔴 MISSING small.png:\n');
    issues.missing_small.forEach(driver => {
      console.log(`  - ${driver}`);
    });
  }
  
  if (issues.missing_large.length > 0) {
    console.log('\n\n🔴 MISSING large.png:\n');
    issues.missing_large.forEach(driver => {
      console.log(`  - ${driver}`);
    });
  }
  
  if (issues.using_placeholder.length > 0) {
    console.log('\n\n⚠️  PLACEHOLDER IMAGES (too small):\n');
    issues.using_placeholder.forEach(item => {
      console.log(`  - ${item.driver}/${item.file} (${item.size} bytes)`);
    });
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, '../../reports/IMAGE_VALIDATION_REPORT.json');
  await fs.writeFile(reportPath, JSON.stringify(issues, null, 2));
  console.log(`\n\n📄 Full report: ${reportPath}`);
  
  return issues;
}

async function fixPlaceholderImages(issues) {
  if (issues.using_placeholder.length === 0) {
    console.log('\n✅ No placeholder images to fix');
    return;
  }
  
  console.log('\n🔧 FIXING PLACEHOLDER IMAGES\n');
  
  const templateSmall = path.join(__dirname, '../..', 'assets/icons/placeholder.svg');
  const templateLarge = path.join(__dirname, '../..', 'assets/icons/placeholder.svg');
  
  // Check if template exists
  try {
    await fs.access(templateSmall);
  } catch (err) {
    console.log('⚠️  Template placeholder not found, skipping auto-fix');
    return;
  }
  
  for (const item of issues.using_placeholder) {
    const driverPath = path.join(__dirname, '../..', 'drivers', item.driver);
    const assetsPath = path.join(driverPath, 'assets');
    const targetPath = path.join(assetsPath, item.file);
    
    try {
      // Copy template to driver
      await fs.copyFile(templateSmall, targetPath);
      console.log(`  ✅ Fixed: ${item.driver}/${item.file}`);
    } catch (err) {
      console.log(`  ❌ Error fixing ${item.driver}/${item.file}: ${err.message}`);
    }
  }
}

async function main() {
  const issues = await checkDriverImages();
  await generateReport(issues);
  
  // Auto-fix placeholders if needed
  if (issues.using_placeholder.length > 0) {
    console.log('\n\n🤔 Would you like to auto-fix placeholder images?');
    console.log('   (This will copy the default placeholder to all affected drivers)');
    // For automation, we'll just report
  }
  
  console.log('\n\n💡 RECOMMENDATIONS:\n');
  
  if (issues.missing_small.length > 0 || issues.missing_large.length > 0) {
    console.log('  1. Create missing images using:');
    console.log('     node scripts/automation/CREATE_DRIVER_IMAGES.js');
  }
  
  if (issues.using_placeholder.length > 0) {
    console.log('  2. Replace placeholder images with device-specific icons');
    console.log('     - Use Johan Bendz design standards');
    console.log('     - Small: 75x75px, Large: 500x500px');
    console.log('     - PNG format with transparent background');
  }
  
  const totalIssues = issues.missing_small.length + issues.missing_large.length + issues.using_placeholder.length;
  
  if (totalIssues === 0) {
    console.log('\n\n🎉 ALL IMAGES VALIDATED SUCCESSFULLY!');
  } else {
    console.log(`\n\n⚠️  Total issues found: ${totalIssues}`);
  }
}

main().catch(console.error);
