#!/usr/bin/env node
'use strict';

/**
 * ANALYZE MERGEABLE DRIVERS
 * 
 * Identifie les drivers qui peuvent être mergés pour réduire
 * le nombre total de 319 → ~220 drivers
 * 
 * Patterns recherchés:
 * - Battery variants (aaa, cr2032, battery)
 * - Gang variants (1gang, 2gang, 3gang, 4gang)
 * - Power variants (ac, dc, usb)
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 ANALYZE MERGEABLE DRIVERS\n');

const appJsonPath = path.join(__dirname, '../../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

console.log(`📊 Total drivers: ${appJson.drivers.length}\n`);

// Group drivers by base name (without variants)
const groups = new Map();

appJson.drivers.forEach(driver => {
  // Remove common suffixes
  let baseName = driver.id
    .replace(/_aaa$/, '')
    .replace(/_cr2032$/, '')
    .replace(/_cr2450$/, '')
    .replace(/_battery$/, '')
    .replace(/_1gang$/, '')
    .replace(/_2gang$/, '')
    .replace(/_3gang$/, '')
    .replace(/_4gang$/, '')
    .replace(/_5gang$/, '')
    .replace(/_6gang$/, '')
    .replace(/_8gang$/, '')
    .replace(/_ac$/, '')
    .replace(/_dc$/, '')
    .replace(/_usb$/, '')
    .replace(/_advanced$/, '')
    .replace(/_basic$/, '');
  
  if (!groups.has(baseName)) {
    groups.set(baseName, []);
  }
  
  groups.get(baseName).push(driver);
});

// Find mergeable groups (2+ drivers with same base)
const mergeable = Array.from(groups.entries())
  .filter(([base, drivers]) => drivers.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

console.log(`📦 Groups with variants: ${mergeable.length}\n`);

let totalSavings = 0;
const recommendations = [];

mergeable.forEach(([baseName, drivers]) => {
  const savings = drivers.length - 1; // Keep 1, merge others
  totalSavings += savings;
  
  console.log(`📁 ${baseName} (${drivers.length} drivers, save ${savings}):`);
  
  const variants = [];
  drivers.forEach(d => {
    const variant = d.id.replace(baseName, '').replace(/^_/, '');
    console.log(`   - ${d.id} (${variant || 'base'})`);
    variants.push(variant || 'base');
  });
  
  recommendations.push({
    baseName,
    count: drivers.length,
    savings,
    drivers: drivers.map(d => d.id),
    variants,
    canMerge: detectMergeability(drivers)
  });
  
  console.log('');
});

console.log('='.repeat(60));
console.log(`\n💡 SUMMARY:\n`);
console.log(`Current drivers: ${appJson.drivers.length}`);
console.log(`Potential savings: ${totalSavings}`);
console.log(`After merge: ${appJson.drivers.length - totalSavings}`);
console.log(`Target: ~220 drivers`);
console.log(`Gap: ${Math.max(0, (appJson.drivers.length - totalSavings) - 220)} still to reduce\n`);

// Categorize by merge priority
const highPriority = recommendations.filter(r => r.canMerge === 'HIGH');
const mediumPriority = recommendations.filter(r => r.canMerge === 'MEDIUM');
const lowPriority = recommendations.filter(r => r.canMerge === 'LOW');

console.log(`✅ HIGH priority merges: ${highPriority.length} groups (${highPriority.reduce((sum, r) => sum + r.savings, 0)} drivers saved)`);
console.log(`⚠️  MEDIUM priority merges: ${mediumPriority.length} groups (${mediumPriority.reduce((sum, r) => sum + r.savings, 0)} drivers saved)`);
console.log(`❌ LOW priority merges: ${lowPriority.length} groups (${lowPriority.reduce((sum, r) => sum + r.savings, 0)} drivers saved)\n`);

// Save recommendations
const outputPath = path.join(__dirname, 'MERGE_RECOMMENDATIONS.json');
fs.writeFileSync(outputPath, JSON.stringify({
  analysis_date: new Date().toISOString(),
  current_count: appJson.drivers.length,
  potential_savings: totalSavings,
  target_count: 220,
  after_merge: appJson.drivers.length - totalSavings,
  high_priority: highPriority,
  medium_priority: mediumPriority,
  low_priority: lowPriority
}, null, 2));

console.log(`📄 Recommendations saved: ${outputPath}\n`);

// Top 10 quick wins
console.log('🎯 TOP 10 QUICK WINS:\n');
highPriority.slice(0, 10).forEach((r, i) => {
  console.log(`${i + 1}. ${r.baseName}: ${r.count} → 1 (save ${r.savings})`);
  console.log(`   Variants: ${r.variants.join(', ')}`);
  console.log('');
});

function detectMergeability(drivers) {
  // Check if drivers are similar enough to merge
  
  // Battery variants: HIGH priority (easy merge)
  const allBattery = drivers.every(d => 
    d.id.includes('_aaa') || 
    d.id.includes('_cr2032') || 
    d.id.includes('_cr2450') ||
    d.id.includes('_battery')
  );
  
  if (allBattery) return 'HIGH';
  
  // Gang variants: MEDIUM priority (need testing)
  const allGang = drivers.every(d =>
    d.id.match(/_[1-8]gang$/)
  );
  
  if (allGang) return 'MEDIUM';
  
  // Power variants: MEDIUM priority
  const allPower = drivers.every(d =>
    d.id.endsWith('_ac') ||
    d.id.endsWith('_dc') ||
    d.id.endsWith('_usb')
  );
  
  if (allPower) return 'MEDIUM';
  
  // Advanced/basic variants: HIGH priority
  const allLevel = drivers.every(d =>
    d.id.includes('_advanced') ||
    d.id.includes('_basic')
  );
  
  if (allLevel) return 'HIGH';
  
  // Mixed or unclear: LOW priority
  return 'LOW';
}
