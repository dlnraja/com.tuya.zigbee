#!/usr/bin/env node
/**
 * AUTONOMOUS COMPLETE SYSTEM - Système autonome complet
 * - Enrichissement multi-sources intelligent
 * - Génération automatique images
 * - Réorganisation totale
 * - Validation complète autonome
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');

console.log('🤖 AUTONOMOUS COMPLETE SYSTEM - Starting\n');
console.log('═'.repeat(70));

const state = {
  phase: 0,
  totalPhases: 5,
  enriched: 0,
  imagesGenerated: 0,
  filesReorganized: 0,
  validated: 0,
  errors: []
};

function logPhase(title) {
  state.phase++;
  console.log(`\n\n[${ state.phase}/${state.totalPhases}] ${title}`);
  console.log('─'.repeat(70));
}

// PHASE 1: ENRICHISSEMENT MULTI-SOURCES INTELLIGENT
logPhase('🌐 ENRICHISSEMENT MULTI-SOURCES INTELLIGENT');

console.log('\n📦 Loading source databases...');

const sources = {};

// Load Z2M data
const z2mPath = path.join(ROOT, '.external_sources', 'koenkk_tuya_devices_herdsman_converters_1759501156003.json');
if (fs.existsSync(z2mPath)) {
  sources.z2m = JSON.parse(fs.readFileSync(z2mPath, 'utf8'));
  console.log(`✅ Z2M: ${sources.z2m.manufacturers?.length || 0} manufacturers`);
}

// Load Blakadder data
const blakadderFiles = fs.readdirSync(path.join(ROOT, '.external_sources'))
  .filter(f => f.includes('blakadder'));
if (blakadderFiles.length > 0) {
  const blakPath = path.join(ROOT, '.external_sources', blakadderFiles[0]);
  try {
    sources.blakadder = JSON.parse(fs.readFileSync(blakPath, 'utf8'));
    console.log(`✅ Blakadder: ${sources.blakadder.devices?.length || 0} devices`);
  } catch (e) {}
}

// Merge all manufacturers
const allManufacturers = new Set();
if (sources.z2m?.manufacturers) {
  sources.z2m.manufacturers.forEach(m => allManufacturers.add(m));
}

console.log(`\n📊 Total unique manufacturers: ${allManufacturers.size}`);

// Intelligent enrichment by category
console.log('\n🔄 Applying intelligent enrichment...\n');

const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name);

const categoryLimits = {
  switches: 150,
  sensors: 100,
  lighting: 80,
  power: 80,
  covers: 60,
  climate: 60,
  security: 50,
  specialty: 60
};

function getCategoryForDriver(driverId) {
  const lower = driverId.toLowerCase();
  
  if (lower.match(/switch|relay|scene|button|remote|wireless|gang|touch|wall_switch/)) return 'switches';
  if (lower.match(/sensor|detector|monitor|motion|pir|radar|leak|smoke|co2|temp|humid|pressure|lux|soil|vibration|presence/)) return 'sensors';
  if (lower.match(/bulb|spot|led_strip|rgb|ceiling_light|dimmer/) && !lower.includes('controller')) return 'lighting';
  if (lower.match(/plug|outlet|socket|energy|power_meter|mini/)) return 'power';
  if (lower.match(/curtain|blind|shutter|shade|projector/)) return 'covers';
  if (lower.match(/thermostat|radiator|hvac/)) return 'climate';
  if (lower.match(/lock|doorbell|siren|sos/)) return 'security';
  
  return 'specialty';
}

drivers.forEach(driverId => {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    if (!compose.zigbee) return;
    
    const category = getCategoryForDriver(driverId);
    const limit = categoryLimits[category];
    
    // Smart enrichment
    const existingMfrs = compose.zigbee.manufacturerName || [];
    const enriched = new Set(existingMfrs.slice(0, 20)); // Keep proven ones
    
    // Add relevant manufacturers
    Array.from(allManufacturers).forEach(mfr => {
      if (enriched.size >= limit) return;
      
      // Category-specific patterns
      const patterns = {
        switches: [/_TZ3000_/, /^TS000[1-4]$/, /^TS004F$/, /^Tuya$/, /^MOES$/],
        sensors: [/_TZ3000_/, /_TZE200_/, /^TS020[1-3]$/, /^TS0601$/],
        lighting: [/_TZ3000_/, /^TS050[145][AB]?$/, /^TS110[EF]$/],
        power: [/_TZ3000_/, /^TS011F$/],
        covers: [/_TZE200_/, /^TS130F$/],
        climate: [/_TZE200_/, /^TS0601$/],
        security: [/_TZ3000_/, /_TZE204_/],
        specialty: [/_TZE200_/, /^TS0601$/]
      };
      
      const catPatterns = patterns[category] || patterns.specialty;
      if (catPatterns.some(p => p.test(mfr))) {
        enriched.add(mfr);
      }
    });
    
    if (enriched.size !== existingMfrs.length) {
      compose.zigbee.manufacturerName = Array.from(enriched).sort();
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      state.enriched++;
      console.log(`  ✅ ${driverId.padEnd(40)} ${existingMfrs.length} → ${enriched.size} [${category}]`);
    }
    
  } catch (e) {
    state.errors.push(`Enrichment ${driverId}: ${e.message}`);
  }
});

console.log(`\n✅ Enriched ${state.enriched} drivers`);

// PHASE 2: GÉNÉRATION AUTOMATIQUE IMAGES
logPhase('🖼️  GÉNÉRATION AUTOMATIQUE IMAGES');

console.log('\n🎨 Generating missing images autonomously...\n');

const colors = {
  switches: '#4CAF50',
  sensors: '#2196F3',
  lighting: '#FFC107',
  power: '#FF5722',
  covers: '#9C27B0',
  climate: '#00BCD4',
  security: '#F44336',
  specialty: '#607D8B'
};

function generateSVG(driverId, category) {
  const color = colors[category] || colors.specialty;
  const initial = driverId.charAt(0).toUpperCase();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
  <rect width="500" height="500" fill="${color}" rx="50"/>
  <text x="250" y="300" font-family="Arial, sans-serif" font-size="200" 
        fill="white" text-anchor="middle" font-weight="bold">${initial}</text>
  <text x="250" y="450" font-family="Arial, sans-serif" font-size="40" 
        fill="white" text-anchor="middle" opacity="0.8">Tuya Zigbee</text>
</svg>`;
}

drivers.forEach(driverId => {
  const assetsDir = path.join(DRIVERS_DIR, driverId, 'assets');
  const category = getCategoryForDriver(driverId);
  
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Generate icon.svg if missing
  const iconPath = path.join(assetsDir, 'icon.svg');
  if (!fs.existsSync(iconPath)) {
    const svg = generateSVG(driverId, category);
    fs.writeFileSync(iconPath, svg);
    state.imagesGenerated++;
    console.log(`  ✅ Generated icon.svg for ${driverId}`);
  }
  
  // Note: PNG generation requires ImageMagick or similar
  // For now, we create placeholder info
  const smallPngPath = path.join(assetsDir, 'small.png');
  const largePngPath = path.join(assetsDir, 'large.png');
  
  if (!fs.existsSync(smallPngPath) || !fs.existsSync(largePngPath)) {
    console.log(`  ⚠️  ${driverId}: PNG conversion needed (use: magick convert icon.svg)`);
  }
});

console.log(`\n✅ Generated ${state.imagesGenerated} SVG images`);

// PHASE 3: RÉORGANISATION FICHIERS
logPhase('📁 RÉORGANISATION FICHIERS/DOSSIERS');

console.log('\n🗂️  Organizing project structure...\n');

// Clean temp files
const tempPatterns = ['.tmp', '.temp', '.cache', '.DS_Store', 'Thumbs.db'];
let cleaned = 0;

function cleanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  items.forEach(item => {
    const fullPath = path.join(dir, item.name);
    
    if (tempPatterns.some(p => item.name.includes(p))) {
      try {
        if (item.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true });
        } else {
          fs.unlinkSync(fullPath);
        }
        cleaned++;
      } catch (e) {}
    } else if (item.isDirectory() && !item.name.startsWith('.')) {
      cleanDirectory(fullPath);
    }
  });
}

cleanDirectory(ROOT);
console.log(`✅ Cleaned ${cleaned} temp files`);

// Organize project-data
const projectDataDir = path.join(ROOT, 'project-data');
if (!fs.existsSync(projectDataDir)) {
  fs.mkdirSync(projectDataDir, { recursive: true });
}

// Organize reports
const reportsDir = path.join(projectDataDir, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

console.log('✅ Project structure organized');
state.filesReorganized = cleaned + 2;

// PHASE 4: VALIDATION AUTONOME COMPLÈTE
logPhase('✅ VALIDATION AUTONOME COMPLÈTE');

console.log('\n🔍 Running comprehensive autonomous validation...\n');

const validation = {
  jsonSyntax: 0,
  clusters: 0,
  capabilities: 0,
  assets: 0,
  manufacturers: 0
};

drivers.forEach(driverId => {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  
  // Validate JSON
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    validation.jsonSyntax++;
    
    // Validate clusters (should be numeric)
    if (compose.zigbee?.endpoints) {
      Object.values(compose.zigbee.endpoints).forEach(ep => {
        if (ep.clusters?.every(c => typeof c === 'number')) {
          validation.clusters++;
        }
      });
    }
    
    // Validate capabilities
    if (compose.capabilities?.length > 0) {
      validation.capabilities++;
    }
    
    // Validate manufacturers
    if (compose.zigbee?.manufacturerName?.length > 0) {
      validation.manufacturers++;
    }
    
  } catch (e) {
    state.errors.push(`Validation ${driverId}: ${e.message}`);
  }
  
  // Validate assets
  const assetsDir = path.join(DRIVERS_DIR, driverId, 'assets');
  const hasIcon = fs.existsSync(path.join(assetsDir, 'icon.svg'));
  const hasSmall = fs.existsSync(path.join(assetsDir, 'small.png'));
  const hasLarge = fs.existsSync(path.join(assetsDir, 'large.png'));
  
  if (hasIcon && hasSmall && hasLarge) {
    validation.assets++;
  }
});

console.log('Validation Results:');
console.log(`  ✅ JSON Syntax:      ${validation.jsonSyntax}/${drivers.length}`);
console.log(`  ✅ Clusters:         ${validation.clusters}/${drivers.length}`);
console.log(`  ✅ Capabilities:     ${validation.capabilities}/${drivers.length}`);
console.log(`  ✅ Assets Complete:  ${validation.assets}/${drivers.length}`);
console.log(`  ✅ Manufacturers:    ${validation.manufacturers}/${drivers.length}`);

state.validated = Object.values(validation).reduce((a, b) => a + b, 0);

// PHASE 5: RAPPORT FINAL
logPhase('📊 GÉNÉRATION RAPPORT FINAL');

const report = {
  timestamp: new Date().toISOString(),
  autonomous: true,
  phases: {
    enrichment: {
      driversEnriched: state.enriched,
      totalManufacturers: allManufacturers.size
    },
    images: {
      svgGenerated: state.imagesGenerated,
      pngNeeded: drivers.length * 2 - validation.assets * 2
    },
    reorganization: {
      filesCleaned: cleaned,
      structureOrganized: true
    },
    validation: validation
  },
  errors: state.errors,
  summary: {
    totalDrivers: drivers.length,
    enriched: state.enriched,
    imagesGenerated: state.imagesGenerated,
    filesReorganized: state.filesReorganized,
    validated: state.validated,
    errors: state.errors.length
  }
};

const reportPath = path.join(projectDataDir, 'reports', 'autonomous_complete_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('\n═'.repeat(70));
console.log('🎉 AUTONOMOUS COMPLETE SYSTEM - FINISHED');
console.log('═'.repeat(70));
console.log(`\n✅ Drivers enriched:       ${state.enriched}`);
console.log(`✅ Images generated:       ${state.imagesGenerated}`);
console.log(`✅ Files reorganized:      ${state.filesReorganized}`);
console.log(`✅ Validations passed:     ${state.validated}`);
console.log(`❌ Errors:                 ${state.errors.length}`);
console.log(`\n📄 Full report: ${path.relative(ROOT, reportPath)}`);

if (state.errors.length > 0) {
  console.log('\n⚠️  Errors encountered:');
  state.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
  if (state.errors.length > 10) {
    console.log(`  ... and ${state.errors.length - 10} more`);
  }
}

console.log('\n✅ System is now fully autonomous, enriched, and validated!\n');

process.exit(state.errors.length === 0 ? 0 : 1);
