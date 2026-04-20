/**
 * scripts/fixes/CLEAN_HYBRID_NOMENCLATURE.js
 * 
 * Standardizes driver naming conventions by removing 'hybrid' suffixes across all manifests.
 * As all drivers now utilize dynamic, self-adaptive logic, the term is redundant.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    return false;
  }

  let changed = false;

  // 1. Process name object
  if (data.name) {
    if (typeof data.name === 'string') {
      const original = data.name;
      data.name = data.name.replace(/\s*Hybrid$/i, '').trim();
      if (data.name !== original) changed = true;
    } else if (typeof data.name === 'object') {
      for (const lang in data.name) {
        const original = data.name[lang];
        data.name[lang] = data.name[lang].replace(/\s*Hybrid$/i, '').trim();
        if (data.name[lang] !== original) changed = true;
      }
    }
  }

  // 2. Process description
  if (data.description) {
    if (typeof data.description === 'string') {
      const original = data.description;
      data.description = data.description.replace(/Hybrid/ig, 'Universal').trim();
      if (data.description !== original) changed = true;
    } else if (typeof data.description === 'object') {
      for (const lang in data.description) {
        const original = data.description[lang];
        data.description[lang] = data.description[lang].replace(/Hybrid/ig, 'Universal').trim();
        if (data.description[lang] !== original) changed = true;
      }
    }
  }

  // 3. Process Flow Card Titles (if in driver.flow.compose.json)
  if (filePath.endsWith('driver.flow.compose.json')) {
    ['triggers', 'conditions', 'actions'].forEach(type => {
      if (data[type]) {
        data[type].forEach(card => {
          if (card.title) {
            if (typeof card.title === 'string') {
              const original = card.title;
              card.title = card.title.replace(/\s*\(Hybrid\)$/i, '').trim();
              if (card.title !== original) changed = true;
            } else if (typeof card.title === 'object') {
              for (const lang in card.title) {
                const original = card.title[lang];
                card.title[lang] = card.title[lang].replace(/\s*\(Hybrid\)$/i, '').trim();
                if (card.title[lang] !== original) changed = true;
              }
            }
          }
        });
      }
    });
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(` Cleaned nomenclature in: ${path.relative(ROOT, filePath)}`);
    return true;
  }
  return false;
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file === 'driver.compose.json' || file === 'driver.flow.compose.json') {
      processFile(fullPath);
    }
  }
}

console.log(' Starting Global Nomenclature Cleanup (Removing "Hybrid")...');
walk(DRIVERS_DIR);
console.log(' Nomenclature cleanup complete.');
