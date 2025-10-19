#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * ANALYZE IMAGE CONTENT
 * Détecte les images dupliquées ou génériques inappropriées
 */

async function getImageHash(filePath) {
  try {
    const content = await fs.readFile(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (err) {
    return null;
  }
}

async function analyzeImages() {
  const driversDir = path.join(__dirname, '../..', 'drivers');
  const folders = await fs.readdir(driversDir);
  
  const imageHashes = {
    small: new Map(),
    large: new Map()
  };
  
  const issues = {
    duplicate_images: [],
    generic_placeholders: [],
    mismatched_devices: []
  };
  
  console.log('🔍 ANALYZING IMAGE CONTENT\n');
  console.log('Calculating image hashes...\n');
  
  // First pass: collect all hashes
  for (const folder of folders) {
    try {
      const driverPath = path.join(driversDir, folder);
      const stats = await fs.stat(driverPath);
      if (!stats.isDirectory()) continue;
      
      const smallPath = path.join(driverPath, 'assets/small.png');
      const largePath = path.join(driverPath, 'assets/large.png');
      
      const smallHash = await getImageHash(smallPath);
      const largeHash = await getImageHash(largePath);
      
      if (smallHash) {
        if (!imageHashes.small.has(smallHash)) {
          imageHashes.small.set(smallHash, []);
        }
        imageHashes.small.get(smallHash).push(folder);
      }
      
      if (largeHash) {
        if (!imageHashes.large.has(largeHash)) {
          imageHashes.large.set(largeHash, []);
        }
        imageHashes.large.get(largeHash).push(folder);
      }
      
    } catch (err) {
      // Skip errors
    }
  }
  
  // Second pass: identify duplicates
  console.log('Analyzing duplicates...\n');
  
  imageHashes.small.forEach((drivers, hash) => {
    if (drivers.length > 1) {
      issues.duplicate_images.push({
        type: 'small',
        hash: hash,
        count: drivers.length,
        drivers: drivers
      });
    }
  });
  
  imageHashes.large.forEach((drivers, hash) => {
    if (drivers.length > 1) {
      issues.duplicate_images.push({
        type: 'large',
        hash: hash,
        count: drivers.length,
        drivers: drivers
      });
    }
  });
  
  return { issues, imageHashes };
}

async function categorizeDrivers() {
  const driversDir = path.join(__dirname, '../..', 'drivers');
  const folders = await fs.readdir(driversDir);
  
  const categories = {
    motion: [],
    switch: [],
    plug: [],
    light: [],
    climate: [],
    contact: [],
    curtain: [],
    lock: [],
    other: []
  };
  
  for (const folder of folders) {
    if (folder.includes('motion') || folder.includes('pir')) {
      categories.motion.push(folder);
    } else if (folder.includes('switch') || folder.includes('gang')) {
      categories.switch.push(folder);
    } else if (folder.includes('plug') || folder.includes('socket')) {
      categories.plug.push(folder);
    } else if (folder.includes('bulb') || folder.includes('light') || folder.includes('dimmer')) {
      categories.light.push(folder);
    } else if (folder.includes('temp') || folder.includes('climate') || folder.includes('thermostat')) {
      categories.climate.push(folder);
    } else if (folder.includes('contact') || folder.includes('door') || folder.includes('window')) {
      categories.contact.push(folder);
    } else if (folder.includes('curtain') || folder.includes('blind') || folder.includes('shade')) {
      categories.curtain.push(folder);
    } else if (folder.includes('lock')) {
      categories.lock.push(folder);
    } else {
      categories.other.push(folder);
    }
  }
  
  return categories;
}

function detectMismatchedImages(issues, categories) {
  const mismatches = [];
  
  // Check if drivers in the same category share the same image
  for (const duplicate of issues.duplicate_images) {
    if (duplicate.count > 10) {
      // Likely a generic placeholder used by many drivers
      
      // Check if they're from different categories
      const driversInCategories = {};
      for (const [catName, catDrivers] of Object.entries(categories)) {
        const overlap = duplicate.drivers.filter(d => catDrivers.includes(d));
        if (overlap.length > 0) {
          driversInCategories[catName] = overlap.length;
        }
      }
      
      if (Object.keys(driversInCategories).length > 1) {
        mismatches.push({
          hash: duplicate.hash,
          type: duplicate.type,
          drivers_count: duplicate.count,
          categories: driversInCategories,
          issue: 'Generic placeholder used across multiple device types'
        });
      }
    }
  }
  
  return mismatches;
}

async function generateReport(issues, imageHashes, categories) {
  console.log('📊 CONTENT ANALYSIS REPORT\n');
  
  console.log(`Total unique small images: ${imageHashes.small.size}`);
  console.log(`Total unique large images: ${imageHashes.large.size}`);
  console.log(`\nDuplicate image groups: ${issues.duplicate_images.length}`);
  
  // Sort by count
  const sortedDuplicates = issues.duplicate_images.sort((a, b) => b.count - a.count);
  
  console.log('\n\n🔍 TOP DUPLICATED IMAGES:\n');
  
  sortedDuplicates.slice(0, 10).forEach((dup, i) => {
    console.log(`${i + 1}. ${dup.type}.png - Used by ${dup.count} drivers`);
    console.log(`   Hash: ${dup.hash.substring(0, 8)}...`);
    console.log(`   First 5 drivers: ${dup.drivers.slice(0, 5).join(', ')}`);
    if (dup.count > 5) {
      console.log(`   ... and ${dup.count - 5} more`);
    }
    console.log('');
  });
  
  // Detect mismatches
  const mismatches = detectMismatchedImages(issues, categories);
  
  if (mismatches.length > 0) {
    console.log('\n⚠️  POTENTIAL IMAGE MISMATCHES:\n');
    mismatches.forEach((mismatch, i) => {
      console.log(`${i + 1}. ${mismatch.type}.png - ${mismatch.drivers_count} drivers`);
      console.log(`   Categories affected:`);
      Object.entries(mismatch.categories).forEach(([cat, count]) => {
        console.log(`     - ${cat}: ${count} drivers`);
      });
      console.log(`   Issue: ${mismatch.issue}\n`);
    });
  }
  
  // Category analysis
  console.log('\n📦 DRIVERS BY CATEGORY:\n');
  Object.entries(categories).forEach(([catName, drivers]) => {
    if (drivers.length > 0) {
      console.log(`  ${catName}: ${drivers.length} drivers`);
    }
  });
  
  // Save detailed report
  const report = {
    summary: {
      unique_small_images: imageHashes.small.size,
      unique_large_images: imageHashes.large.size,
      duplicate_groups: issues.duplicate_images.length,
      total_drivers: 183
    },
    duplicates: sortedDuplicates,
    mismatches: mismatches,
    categories: Object.fromEntries(
      Object.entries(categories).map(([k, v]) => [k, v.length])
    )
  };
  
  const reportPath = path.join(__dirname, '../../reports/IMAGE_CONTENT_ANALYSIS.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report: ${reportPath}`);
  
  return { mismatches, sortedDuplicates };
}

async function main() {
  console.log('🎨 IMAGE CONTENT ANALYZER\n');
  console.log('This will detect:');
  console.log('  - Duplicate images across drivers');
  console.log('  - Generic placeholders');
  console.log('  - Mismatched device icons\n');
  console.log('===============================\n');
  
  const { issues, imageHashes } = await analyzeImages();
  const categories = await categorizeDrivers();
  const { mismatches, sortedDuplicates } = await generateReport(issues, imageHashes, categories);
  
  console.log('\n\n💡 RECOMMENDATIONS:\n');
  
  if (sortedDuplicates.length > 0) {
    const topDuplicate = sortedDuplicates[0];
    if (topDuplicate.count > 50) {
      console.log(`  ⚠️  ${topDuplicate.count} drivers share the SAME ${topDuplicate.type} image!`);
      console.log('     This is likely a generic placeholder.');
      console.log('     Consider creating device-specific icons.\n');
    }
  }
  
  if (mismatches.length > 0) {
    console.log(`  🔴 ${mismatches.length} generic images used across multiple device types`);
    console.log('     These should be replaced with category-specific icons:\n');
    mismatches.forEach(m => {
      console.log(`     - ${Object.keys(m.categories).join(', ')}`);
    });
    console.log('');
  }
  
  console.log('  📝 Next steps:');
  console.log('     1. Review IMAGE_CONTENT_ANALYSIS.json');
  console.log('     2. Create category-specific icons (motion, switch, plug, etc.)');
  console.log('     3. Use Johan Bendz design standards');
  console.log('     4. Replace generic placeholders with proper device icons');
}

main().catch(console.error);
