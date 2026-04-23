/**
 * scripts/fixes/CLEAN_HYBRID_NOMENCLATURE_V2.js
 * 
 * Repository-wide cleanup of "Hybrid" branding to reflect the unified, 
 * auto-adaptive architectural engine.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const STRINGS_TO_REMOVE = [
  'Hybrid', 'hybrid', 'HYBRID',
  'Hybride', 'hybride',
  'HÃ­brido', 'hÃ­brido',
  'Hibrido', 'hibrido'
];

function cleanString(str) {
  if (typeof str !== 'string') return str;
  let newStr = str;
  
  // Specific replacements to maintain grammar
  newStr = newStr.replace(/Radar Hybride/g, 'Radar');
  newStr = newStr.replace(/Hybride /g, '');
  newStr = newStr.replace(/ HÃ­brido/g, '');
  newStr = newStr.replace(/ hÃ­brido/g, '');
  
  STRINGS_TO_REMOVE.forEach(s => {
    // Regex to remove the word and potentially trailing/leading spaces
    const re = new RegExp(`\\b${s}\\b`, 'gi');
    newStr = newStr.replace(re, '');
  });

  return newStr.trim().replace(/\s\s+/g, ' ');
}

function processObject(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = cleanString(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      processObject(obj[key]);
    }
  }
}

function processDrivers() {
  console.log(' Purging "Hybrid" branding from manifests...');
  const drivers = fs.readdirSync(DRIVERS_DIR);
  
  drivers.forEach(d => {
    const driverPath = path.join(DRIVERS_DIR, d);
    const composePath = path.join(driverPath, 'driver.compose.json');
    const flowPath = path.join(driverPath, 'driver.flow.compose.json');
    
    [composePath, flowPath].forEach(p => {
      if (fs.existsSync(p)) {
        let content = JSON.parse(fs.readFileSync(p, 'utf8'));
        
        // Clean names and descriptions
        if (content.name) {
          if (typeof content.name === 'object') {
            Object.keys(content.name).forEach(lang => {
              content.name[lang] = cleanString(content.name[lang]);
            });
          } else {
            content.name = cleanString(content.name);
          }
        }
        
        // In compose.json, clean Flow cards too
        if (content.flow) {
          processObject(content.flow);
        }
        
        fs.writeFileSync(p, JSON.stringify(content, null, 2) + '\n');
      }
    });
  });
  
  console.log(' Branding cleanup complete.');
}

processDrivers();
