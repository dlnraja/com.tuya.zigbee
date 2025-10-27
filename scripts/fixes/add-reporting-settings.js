// add-reporting-settings.js
// Adds report_interval and enable_realtime_reporting settings to ALL drivers
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const REPORTING_SETTINGS = [
  {
    id: 'report_interval',
    type: 'number',
    label: {
      en: 'Data Report Interval (seconds)',
      fr: 'Intervalle Rapport Données (secondes)'
    },
    value: 60,
    min: 10,
    max: 3600,
    step: 10,
    hint: {
      en: 'How often device reports data to Homey (lower = more responsive, higher = less traffic)',
      fr: 'Fréquence de rapport des données à Homey (bas = plus réactif, haut = moins de trafic)'
    }
  },
  {
    id: 'enable_realtime_reporting',
    type: 'checkbox',
    label: {
      en: 'Enable Real-Time Data Reporting',
      fr: 'Activer Rapport Données Temps Réel'
    },
    value: true,
    hint: {
      en: 'Configure device to report data changes immediately (recommended for AC-powered devices)',
      fr: 'Configure l\'appareil pour rapporter les changements immédiatement (recommandé pour appareils secteur)'
    }
  }
];

console.log('🔧 Adding reporting settings to all drivers...\n');

const driverFiles = glob.sync('drivers/*/driver.compose.json');
let modified = 0;
let skipped = 0;

for (const file of driverFiles) {
  try {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    // Only add if driver has measurement capabilities
    const hasMeasurement = content.capabilities?.some(cap => 
      cap.startsWith('measure_') || 
      cap.startsWith('alarm_') ||
      cap === 'onoff'
    );
    
    if (!hasMeasurement) {
      skipped++;
      continue;
    }
    
    // Check if settings already exist
    const hasSettings = content.settings?.some(s => 
      s.id === 'report_interval' || s.id === 'enable_realtime_reporting'
    );
    
    if (hasSettings) {
      console.log(`⏭️  Skipped: ${path.basename(path.dirname(file))} (already has settings)`);
      skipped++;
      continue;
    }
    
    // Add settings
    if (!content.settings) {
      content.settings = [];
    }
    
    // Add to existing settings
    content.settings.push(...REPORTING_SETTINGS);
    
    // Write back
    fs.writeFileSync(file, JSON.stringify(content, null, 2) + '\n');
    console.log(`✅ Added: ${path.basename(path.dirname(file))}`);
    modified++;
    
  } catch (err) {
    console.error(`❌ Error: ${file}`, err.message);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Modified: ${modified} drivers`);
console.log(`   Skipped: ${skipped} drivers`);
console.log(`\n✅ Done! Run 'homey app build' to rebuild.`);
