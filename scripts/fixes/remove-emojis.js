#!/usr/bin/env node
'use strict';

/**
 * REMOVE ALL EMOJIS FROM DEVICE DRIVERS
 * Replaces all emojis with text-based tags for professional code
 * 
 * Usage: node scripts/fixes/remove-emojis.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Emoji replacements mapping
const EMOJI_REPLACEMENTS = {
  // Status & Checks
  '✅': '[OK]',
  '❌': '[ERROR]',
  '⚠️': '[WARN]',
  'ℹ️': '[INFO]',
  '📝': '[NOTE]',
  
  // Actions & Process
  '🔌': '[POWER]',
  '🔋': '[BATTERY]',
  '📊': '[DATA]',
  '🔄': '[SYNC]',
  '⏳': '[WAIT]',
  '🚀': '[START]',
  '🛑': '[STOP]',
  '🔧': '[FIX]',
  '🔍': '[SEARCH]',
  
  // Communication
  '📨': '[MSG]',
  '📤': '[SEND]',
  '📥': '[RECV]',
  '🆘': '[SOS]',
  '🚨': '[ALARM]',
  '📢': '[ALERT]',
  
  // Sensors & Measurements
  '🌡️': '[TEMP]',
  '💧': '[HUMID]',
  '💡': '[LIGHT]',
  '🌬️': '[AIR]',
  '💨': '[WIND]',
  '🔥': '[HEAT]',
  '❄️': '[COLD]',
  '🎯': '[TARGET]',
  
  // Devices & Controls
  '💡': '[BULB]',
  '🔦': '[FLASH]',
  '🎨': '[COLOR]',
  '🌈': '[RGB]',
  '🔆': '[BRIGHT]',
  '🔅': '[DIM]',
  
  // Security & Safety
  '🔒': '[LOCK]',
  '🔓': '[UNLOCK]',
  '🔑': '[KEY]',
  '👁️': '[EYE]',
  '🎥': '[CAM]',
  '🚪': '[DOOR]',
  '🪟': '[WINDOW]',
  
  // Other
  '✨': '[STAR]',
  '🎉': '[DONE]',
  '👍': '[GOOD]',
  '👎': '[BAD]',
  '🏠': '[HOME]',
  '🏢': '[BUILDING]',
};

// Build regex pattern from all emojis
const emojiPattern = Object.keys(EMOJI_REPLACEMENTS)
  .map(emoji => emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

const emojiRegex = new RegExp(emojiPattern, 'g');

// Statistics
let stats = {
  filesScanned: 0,
  filesModified: 0,
  totalReplacements: 0,
  byEmoji: {}
};

/**
 * Process a single file
 */
function processFile(filePath, dryRun = false) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let fileReplacements = 0;
    
    // Replace all emojis
    newContent = content.replace(emojiRegex, (match) => {
      const replacement = EMOJI_REPLACEMENTS[match] || '[?]';
      fileReplacements++;
      stats.totalReplacements++;
      
      // Track by emoji type
      if (!stats.byEmoji[match]) {
        stats.byEmoji[match] = 0;
      }
      stats.byEmoji[match]++;
      
      return replacement;
    });
    
    stats.filesScanned++;
    
    // Write back if changed
    if (newContent !== content) {
      stats.filesModified++;
      
      if (!dryRun) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ ${path.relative(process.cwd(), filePath)}: ${fileReplacements} replacements`);
      } else {
        console.log(`[DRY-RUN] ${path.relative(process.cwd(), filePath)}: ${fileReplacements} replacements`);
      }
    }
    
  } catch (err) {
    console.error(`❌ Error processing ${filePath}:`, err.message);
  }
}

/**
 * Find all JS files in drivers directory
 */
function findDriverFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      
      if (item.isDirectory()) {
        traverse(fullPath);
      } else if (item.isFile() && item.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('🔧 REMOVE EMOJIS FROM DRIVERS\n');
  
  if (dryRun) {
    console.log('⚠️  DRY-RUN MODE - No files will be modified\n');
  }
  
  // Process lib/ directory (base classes)
  console.log('📂 Processing lib/ directory...');
  const libDir = path.join(__dirname, '../../lib');
  const libFiles = findDriverFiles(libDir);
  libFiles.forEach(file => processFile(file, dryRun));
  
  // Process drivers/ directory
  console.log('\n📂 Processing drivers/ directory...');
  const driversDir = path.join(__dirname, '../../drivers');
  const driverFiles = findDriverFiles(driversDir);
  driverFiles.forEach(file => processFile(file, dryRun));
  
  // Print statistics
  console.log('\n' + '='.repeat(80));
  console.log('📊 STATISTICS');
  console.log('='.repeat(80));
  console.log(`Files scanned:    ${stats.filesScanned}`);
  console.log(`Files modified:   ${stats.filesModified}`);
  console.log(`Total replacements: ${stats.totalReplacements}\n`);
  
  if (Object.keys(stats.byEmoji).length > 0) {
    console.log('By emoji type:');
    const sortedEmojis = Object.entries(stats.byEmoji)
      .sort((a, b) => b[1] - a[1]);
    
    for (const [emoji, count] of sortedEmojis) {
      const replacement = EMOJI_REPLACEMENTS[emoji] || '[?]';
      console.log(`  ${emoji} → ${replacement}: ${count} occurrences`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (dryRun) {
    console.log('\n⚠️  DRY-RUN COMPLETE - Run without --dry-run to apply changes');
  } else {
    console.log('\n✅ ALL EMOJIS REMOVED SUCCESSFULLY!');
  }
}

// Run
main();
