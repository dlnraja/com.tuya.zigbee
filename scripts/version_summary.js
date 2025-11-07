#!/usr/bin/env node
/**
 * Generate a summary of recent versions and their key fixes
 */

const fs = require('fs');
const path = require('path');

function getAppVersion() {
  try {
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    return appJson.version;
  } catch (err) {
    return 'unknown';
  }
}

function parseChangelog() {
  try {
    const changelog = JSON.parse(fs.readFileSync('.homeychangelog.json', 'utf8'));
    return changelog;
  } catch (err) {
    return {};
  }
}

function extractKeyFixes(changelogText) {
  const fixes = [];
  
  // Extract problem sections
  const problemMatch = changelogText.match(/PROBLEM[S]?[^:]*:([^━]+)/i);
  if (problemMatch) {
    const problems = problemMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('❌') || line.trim().startsWith('-'))
      .map(line => line.replace(/^[❌\-]\s*/, '').trim())
      .filter(Boolean);
    
    if (problems.length > 0) {
      fixes.push({ type: 'PROBLEMS FIXED', items: problems.slice(0, 3) });
    }
  }
  
  // Extract fixes sections
  const fixMatch = changelogText.match(/FIX[ES]*[^:]*:([^━]+)/i);
  if (fixMatch) {
    const fixItems = fixMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('✅') || line.trim().match(/^\d+\./))
      .map(line => line.replace(/^[✅\d.]\s*/, '').trim())
      .filter(Boolean);
    
    if (fixItems.length > 0) {
      fixes.push({ type: 'KEY FIXES', items: fixItems.slice(0, 3) });
    }
  }
  
  return fixes;
}

function generateSummary() {
  const currentVersion = getAppVersion();
  const changelog = parseChangelog();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 UNIVERSAL TUYA ZIGBEE - VERSION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`Current Version: ${currentVersion}\n`);
  
  // Get last 5 versions
  const versions = Object.keys(changelog).slice(0, 5);
  
  console.log('📝 RECENT VERSIONS & KEY FIXES:\n');
  
  versions.forEach((version, idx) => {
    const entry = changelog[version];
    const text = entry.en || '';
    
    // Extract version title
    const titleMatch = text.match(/^([^\\n]+)/);
    const title = titleMatch ? titleMatch[1].replace(/[🚨🔧✅⚠️🛡️]/g, '').trim() : 'No title';
    
    console.log(`${idx + 1}. v${version}`);
    console.log(`   ${title.substring(0, 80)}${title.length > 80 ? '...' : ''}`);
    
    // Extract key fixes
    const fixes = extractKeyFixes(text);
    
    if (fixes.length > 0) {
      fixes.forEach(fixGroup => {
        console.log(`\n   ${fixGroup.type}:`);
        fixGroup.items.forEach(item => {
          const shortItem = item.substring(0, 60);
          console.log(`   • ${shortItem}${item.length > 60 ? '...' : ''}`);
        });
      });
    }
    
    console.log('');
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Timeline of critical fixes
  console.log('📅 CRITICAL FIX TIMELINE:\n');
  
  const criticalFixes = [
    { version: '4.9.307', date: '2025-11-07 22:11', fix: 'Smart-Adapt safety (sensor→switch prevention)' },
    { version: '4.9.306', date: '2025-11-07 19:39', fix: 'Manufacturer/Model reading + KPI reporting' },
    { version: '4.9.305', date: '2025-11-07 18:21', fix: 'App crash on startup (SDK3 read-only)' },
    { version: '4.9.304', date: '2025-11-07 17:30', fix: 'Smart-Adapt restoration (USB outlets)' }
  ];
  
  criticalFixes.forEach(({ version, date, fix }) => {
    console.log(`${date} - v${version}`);
    console.log(`  ✅ ${fix}\n`);
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Main
if (require.main === module) {
  generateSummary();
}

module.exports = { getAppVersion, parseChangelog, extractKeyFixes };
