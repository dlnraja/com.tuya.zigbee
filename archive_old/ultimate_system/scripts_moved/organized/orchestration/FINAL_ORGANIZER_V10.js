const fs = require('fs');

console.log('📦 FINAL ORGANIZER V10');

// Create comprehensive directory structure
const dirs = [
  './scripts/organized/backup',
  './scripts/organized/enrichment', 
  './scripts/organized/validation',
  './scripts/organized/scraping',
  './scripts/organized/historical',
  './scripts/organized/coherence',
  './scripts/organized/categorization',
  './references',
  './backup'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
    console.log(`📁 Created: ${dir}`);
  }
});

// Organize V10 scripts by category
const scriptCategories = {
  backup: ['BACKUP_', 'HISTORICAL_'],
  enrichment: ['ENRICHER_', 'ENRICH_'],
  validation: ['COHERENCE_', 'CATEGORY_'],
  scraping: ['WEB_SCRAPER_', 'SCRAPER_'],
  historical: ['ANALYZER_', 'DEEP_']
};

const rootScripts = fs.readdirSync('./')
  .filter(f => f.endsWith('_V10.js'));

let organized = 0;
rootScripts.forEach(script => {
  try {
    let category = 'organized';
    
    // Determine category based on script name
    Object.keys(scriptCategories).forEach(cat => {
      scriptCategories[cat].forEach(prefix => {
        if (script.includes(prefix)) {
          category = cat;
        }
      });
    });
    
    const dest = `./scripts/organized/${category}/${script}`;
    if (!fs.existsSync(dest)) {
      fs.renameSync(`./${script}`, dest);
      organized++;
      console.log(`📁 ${script} → ${category}/`);
    }
  } catch(e) {
    console.log(`⚠️ ${script} handled`);
  }
});

console.log(`✅ Organized ${organized} V10 scripts into categories`);
