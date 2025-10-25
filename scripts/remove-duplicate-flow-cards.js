#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * REMOVE DUPLICATE FLOW CARDS
 * Nettoie les doublons en gardant le premier trouvé
 */

const FLOW_BASE = path.join(__dirname, '..', '.homeycompose', 'flow');
const TYPES = ['triggers', 'conditions', 'actions'];

console.log('🧹 Cleaning duplicate flow cards...\n');

let totalRemoved = 0;

TYPES.forEach(type => {
  const dir = path.join(FLOW_BASE, type);
  
  if (!fs.existsSync(dir)) {
    console.log(`⏭️  Skip ${type} (dir not found)`);
    return;
  }
  
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const seenIds = new Map();
  let removed = 0;
  
  console.log(`📂 Processing ${type}: ${files.length} files`);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Extract ID from args device filter
      const deviceArg = content.args?.find(a => a.type === 'device');
      const filterId = deviceArg?.filter?.replace('driver_id=', '');
      
      if (!filterId) {
        console.warn(`  ⚠️  No driver_id in ${file}`);
        return;
      }
      
      // Extract card ID (everything after driver_id_)
      const cardId = file.replace(`${filterId}_`, '').replace('.json', '');
      const uniqueKey = `${filterId}_${cardId}`;
      
      if (seenIds.has(uniqueKey)) {
        // Duplicate! Remove it
        fs.unlinkSync(filePath);
        console.log(`  🗑️  Removed duplicate: ${file}`);
        removed++;
      } else {
        seenIds.set(uniqueKey, file);
      }
      
    } catch (err) {
      console.error(`  ❌ Error processing ${file}:`, err.message);
    }
  });
  
  console.log(`  ✅ ${type}: ${removed} duplicates removed\n`);
  totalRemoved += removed;
});

console.log('='.repeat(80));
console.log(`✅ Total duplicates removed: ${totalRemoved}\n`);
