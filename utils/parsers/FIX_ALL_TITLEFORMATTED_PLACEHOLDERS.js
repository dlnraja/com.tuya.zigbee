#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * FIX ALL TITLEFORMATTED PLACEHOLDERS
 * Ensure all flow cards have ALL their argument placeholders in titleFormatted
 */

async function fixAllTitleFormattedPlaceholders() {
  console.log('🔧 FIXING ALL TITLEFORMATTED PLACEHOLDERS\n');
  
  const appJsonPath = path.join(__dirname, '../../app.json');
  const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf8'));
  
  let fixed = 0;
  
  // Fix each flow card type
  for (const flowType of ['triggers', 'conditions', 'actions']) {
    const flowCards = appJson.flow[flowType] || [];
    
    for (const card of flowCards) {
      const args = card.args || [];
      const argNames = args
        .filter(arg => arg.name && arg.name !== 'device')
        .map(arg => arg.name);
      
      if (argNames.length === 0) continue;
      
      // Check if titleFormatted has all placeholders
      const titleFormatted = card.titleFormatted || {};
      
      for (const lang of ['en', 'fr']) {
        const title = titleFormatted[lang] || '';
        
        for (const argName of argNames) {
          const placeholder = `[[${argName}]]`;
          
          if (!title.includes(placeholder)) {
            // Add placeholder
            if (titleFormatted[lang]) {
              titleFormatted[lang] = String(title).replace('[[device]]', `${placeholder} [[device]]`);
            }
            fixed++;
            console.log(`  ✅ Fixed ${flowType}.${card.id}.${lang}: Added ${placeholder}`);
          }
        }
      }
      
      card.titleFormatted = titleFormatted;
    }
  }
  
  await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
  
  console.log(`\n✅ Fixed ${fixed} titleFormatted placeholders`);
}

fixAllTitleFormattedPlaceholders().catch(console.error);
