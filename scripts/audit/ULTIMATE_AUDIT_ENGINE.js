#!/usr/bin/env node
/**
 * ULTIMATE AUDIT ENGINE - Analyse complète du projet Homey
 * Détecte : flow cards invalides, capabilities incorrectes, manufacturer IDs dupliqués,
 * conversions IAS Zone, endpoints manquants, images non personnalisées, etc.
 */

const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');

const ROOT = process.cwd();
const AUDIT_REPORT = {
  meta: {
    root: ROOT,
    date: new Date().toISOString(),
    scannedFiles: 0,
    totalIssues: 0
  },
  critical: [],
  high: [],
  medium: [],
  low: [],
  info: [],
  statistics: {
    drivers: 0,
    flowCards: { app: 0, referenced: 0, invalid: 0 },
    capabilities: { total: 0, missing: 0 },
    manufacturerIDs: { total: 0, duplicates: 0 },
    images: { total: 0, generic: 0, personalized: 0 }
  }
};

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

function readFile(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    return '';
  }
}

function addIssue(severity, category, message, details = {}) {
  const issue = {
    severity,
    category,
    message,
    ...details,
    timestamp: new Date().toISOString()
  };
  AUDIT_REPORT[severity].push(issue);
  AUDIT_REPORT.meta.totalIssues++;
  return issue;
}

async function auditFlowCards() {
  console.log('\n📋 Auditing Flow Cards...');
  
  const appJson = readJSON(path.join(ROOT, 'app.json'));
  if (!appJson) {
    addIssue('critical', 'flow_cards', 'app.json not found or invalid');
    return;
  }

  // Collect all flow card IDs from app.json
  const appFlowIDs = new Set();
  ['actions', 'conditions', 'triggers'].forEach(type => {
    if (appJson.flow && appJson.flow[type]) {
      appJson.flow[type].forEach(card => {
        if (card.id) appFlowIDs.add(card.id);
      });
    }
  });
  
  AUDIT_REPORT.statistics.flowCards.app = appFlowIDs.size;

  // Scan drivers for flow card references
  const driverFiles = await fg(['drivers/**/device.js', 'drivers/**/driver.js', 'lib/**/*.js'], {
    cwd: ROOT,
    absolute: true
  });

  const referencedCards = new Set();
  const invalidCards = new Set();

  for (const file of driverFiles) {
    const content = readFile(file);
    const relPath = path.relative(ROOT, file);
    
    // Find flow card registrations
    const cardMatches = content.matchAll(/(?:getActionCard|getConditionCard|getTriggerCard)\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
    
    for (const match of cardMatches) {
      const cardId = match[1];
      referencedCards.add(cardId);
      
      if (!appFlowIDs.has(cardId)) {
        invalidCards.add(cardId);
        addIssue('high', 'flow_cards', `Invalid flow card referenced: ${cardId}`, {
          file: relPath,
          cardId,
          fix: 'Remove registration or add to app.json flow section'
        });
      }
    }

    // Check for unregistered flow card handlers
    const registerMatches = content.matchAll(/registerRunListener|registerCondition/g);
    if (registerMatches && content.includes('getActionCard') === false && content.includes('getTriggerCard') === false) {
      addIssue('medium', 'flow_cards', 'Flow card handler without card retrieval', {
        file: relPath,
        hint: 'Possible orphaned listener'
      });
    }
  }

  AUDIT_REPORT.statistics.flowCards.referenced = referencedCards.size;
  AUDIT_REPORT.statistics.flowCards.invalid = invalidCards.size;

  console.log(`  ✓ App flow cards: ${appFlowIDs.size}`);
  console.log(`  ✓ Referenced cards: ${referencedCards.size}`);
  console.log(`  ⚠ Invalid cards: ${invalidCards.size}`);
}

async function auditCapabilities() {
  console.log('\n🔌 Auditing Capabilities...');
  
  const driverDirs = await fg(['drivers/*/'], {
    cwd: ROOT,
    onlyDirectories: true,
    absolute: true
  });

  AUDIT_REPORT.statistics.drivers = driverDirs.length;

  for (const driverDir of driverDirs) {
    const driverName = path.basename(driverDir);
    const composeFile = path.join(driverDir, 'driver.compose.json');
    const driverFile = path.join(driverDir, 'driver.json');
    const deviceFile = path.join(driverDir, 'device.js');
    
    const compose = readJSON(composeFile);
    const driver = readJSON(driverFile);
    const deviceCode = readFile(deviceFile);

    const capabilities = (compose?.capabilities || driver?.capabilities || []);
    AUDIT_REPORT.statistics.capabilities.total += capabilities.length;

    if (capabilities.length === 0) {
      addIssue('high', 'capabilities', `Driver has no capabilities defined`, {
        driver: driverName,
        fix: 'Add capabilities array to driver.compose.json or driver.json'
      });
      AUDIT_REPORT.statistics.capabilities.missing++;
    }

    // Check setCapabilityValue type safety
    const setCapMatches = deviceCode.matchAll(/setCapabilityValue\s*\(\s*['"]([^'"]+)['"]\s*,\s*([^)]+)\)/g);
    
    for (const match of setCapMatches) {
      const capability = match[1];
      const value = match[2].trim();
      
      // Check numeric capabilities with string values
      if (capability.startsWith('measure_') || capability.startsWith('meter_')) {
        // Heuristic: if value is quoted or contains .toString(), might be string
        if (/^['"]/.test(value) || value.includes('.toString()')) {
          addIssue('high', 'capabilities', `Possible string value for numeric capability`, {
            driver: driverName,
            file: 'device.js',
            capability,
            value,
            fix: 'Use parseFloat() or Number() conversion'
          });
        }
      }
    }

    // Check for v.replace patterns (IAS Zone issue)
    const replaceMatches = deviceCode.matchAll(/(\w+)\.replace\s*\(/g);
    for (const match of replaceMatches) {
      const varName = match[1];
      if (varName !== 'String' && varName !== 'this') {
        addIssue('medium', 'ias_zone', `Unsafe .replace() usage on variable: ${varName}`, {
          driver: driverName,
          file: 'device.js',
          variable: varName,
          fix: `Use String(${varName}).replace(...)`
        });
      }
    }
  }

  console.log(`  ✓ Total drivers: ${driverDirs.length}`);
  console.log(`  ✓ Total capabilities: ${AUDIT_REPORT.statistics.capabilities.total}`);
  console.log(`  ⚠ Missing capabilities: ${AUDIT_REPORT.statistics.capabilities.missing}`);
}

async function auditManufacturerIDs() {
  console.log('\n🏭 Auditing Manufacturer IDs...');
  
  const driverFiles = await fg(['drivers/*/driver.compose.json', 'drivers/*/driver.json'], {
    cwd: ROOT,
    absolute: true
  });

  const idMap = new Map(); // ID -> [drivers]
  const wildcardIDs = [];

  for (const file of driverFiles) {
    const data = readJSON(file);
    if (!data) continue;

    const driverName = path.basename(path.dirname(file));
    const manufacturers = data.zigbee?.manufacturerName;
    const products = data.zigbee?.productId;

    // Check manufacturerName
    if (manufacturers) {
      const mfgList = Array.isArray(manufacturers) ? manufacturers : [manufacturers];
      
      mfgList.forEach(id => {
        if (!idMap.has(id)) idMap.set(id, []);
        idMap.get(id).push({ driver: driverName, file: path.relative(ROOT, file), type: 'manufacturer' });
        
        // Check for wildcards
        if (id.includes('*') || (id.startsWith('_TZ') && id.length < 15)) {
          wildcardIDs.push({ id, driver: driverName });
          addIssue('high', 'manufacturer_ids', `Wildcard or incomplete manufacturer ID: ${id}`, {
            driver: driverName,
            id,
            fix: 'Replace with complete manufacturer ID (e.g., _TZE284_aao6qtcs)'
          });
        }
      });
    }

    // Check productId
    if (products) {
      const prodList = Array.isArray(products) ? products : [products];
      
      prodList.forEach(id => {
        if (!idMap.has(id)) idMap.set(id, []);
        idMap.get(id).push({ driver: driverName, file: path.relative(ROOT, file), type: 'product' });
      });
    }
  }

  // Find duplicates
  const duplicates = [];
  idMap.forEach((drivers, id) => {
    if (drivers.length > 1) {
      duplicates.push({ id, drivers: drivers.map(d => d.driver), count: drivers.length });
      
      addIssue('high', 'manufacturer_ids', `Duplicate ID across ${drivers.length} drivers: ${id}`, {
        id,
        drivers: drivers.map(d => d.driver),
        fix: 'Use one driver per manufacturer/product ID or implement smart matching'
      });
    }
  });

  AUDIT_REPORT.statistics.manufacturerIDs.total = idMap.size;
  AUDIT_REPORT.statistics.manufacturerIDs.duplicates = duplicates.length;

  console.log(`  ✓ Total manufacturer/product IDs: ${idMap.size}`);
  console.log(`  ⚠ Duplicates: ${duplicates.length}`);
  console.log(`  ⚠ Wildcards: ${wildcardIDs.length}`);
}

async function auditImages() {
  console.log('\n🖼️  Auditing Driver Images...');
  
  const driverDirs = await fg(['drivers/*/'], {
    cwd: ROOT,
    onlyDirectories: true,
    absolute: true
  });

  for (const driverDir of driverDirs) {
    const driverName = path.basename(driverDir);
    const assetsDir = path.join(driverDir, 'assets');
    const imagesDir = path.join(assetsDir, 'images');

    if (!fs.existsSync(imagesDir)) {
      addIssue('medium', 'images', `Missing images directory`, {
        driver: driverName,
        path: path.relative(ROOT, imagesDir),
        fix: 'Create personalized images for driver category'
      });
      continue;
    }

    AUDIT_REPORT.statistics.images.total++;

    // Check for generic/default images
    const smallImage = path.join(imagesDir, 'small.png');
    const largeImage = path.join(imagesDir, 'large.png');
    
    if (fs.existsSync(smallImage)) {
      const stats = fs.statSync(smallImage);
      // Generic images are usually very small in size
      if (stats.size < 500) {
        addIssue('low', 'images', `Possibly generic small.png (${stats.size} bytes)`, {
          driver: driverName,
          file: 'small.png',
          size: stats.size,
          fix: 'Create category-specific image with proper dimensions (75x75)'
        });
        AUDIT_REPORT.statistics.images.generic++;
      } else {
        AUDIT_REPORT.statistics.images.personalized++;
      }
    }

    // Check image dimensions (requires canvas or sharp - skip for now)
    // TODO: Implement image dimension validation
  }

  console.log(`  ✓ Total drivers with images: ${AUDIT_REPORT.statistics.images.total}`);
  console.log(`  ✓ Personalized images: ${AUDIT_REPORT.statistics.images.personalized}`);
  console.log(`  ⚠ Generic images: ${AUDIT_REPORT.statistics.images.generic}`);
}

async function auditEndpoints() {
  console.log('\n🔌 Auditing Zigbee Endpoints...');
  
  const driverFiles = await fg(['drivers/*/driver.compose.json', 'drivers/*/driver.json'], {
    cwd: ROOT,
    absolute: true
  });

  for (const file of driverFiles) {
    const data = readJSON(file);
    if (!data) continue;

    const driverName = path.basename(path.dirname(file));
    const capabilities = data.capabilities || [];
    const endpoints = data.zigbee?.endpoints;

    // Multi-gang switches/buttons should have multiple endpoints
    const gangMatch = driverName.match(/(\d+)gang|(\d+)button/);
    if (gangMatch) {
      const gangCount = parseInt(gangMatch[1] || gangMatch[2]);
      
      if (!endpoints || Object.keys(endpoints).length < gangCount) {
        addIssue('high', 'endpoints', `Multi-gang driver missing proper endpoints`, {
          driver: driverName,
          expected: gangCount,
          found: endpoints ? Object.keys(endpoints).length : 0,
          fix: `Add endpoints "1" through "${gangCount}" with proper clusters`
        });
      }
    }

    // Check endpoint cluster mappings
    if (endpoints) {
      Object.entries(endpoints).forEach(([ep, config]) => {
        if (!config.clusters) {
          addIssue('medium', 'endpoints', `Endpoint ${ep} missing clusters`, {
            driver: driverName,
            endpoint: ep,
            fix: 'Add clusters array with proper cluster IDs'
          });
        }
      });
    }
  }
}

async function auditEventListeners() {
  console.log('\n👂 Auditing Event Listeners...');
  
  const deviceFiles = await fg(['drivers/**/device.js', 'lib/**/*.js'], {
    cwd: ROOT,
    absolute: true
  });

  for (const file of deviceFiles) {
    const content = readFile(file);
    const relPath = path.relative(ROOT, file);

    // Check for multiple .on('report') without detach
    const reportListeners = content.match(/\.on\s*\(\s*['"]report['"]/g) || [];
    if (reportListeners.length > 1) {
      addIssue('medium', 'event_listeners', `Multiple 'report' listeners detected`, {
        file: relPath,
        count: reportListeners.length,
        fix: 'Detach previous listener before re-attaching: device.removeListener("report", handler)'
      });
    }

    // Check for unhandled promise rejections
    const asyncWithoutCatch = content.match(/await\s+[^;]+(?!\.catch)/g) || [];
    if (asyncWithoutCatch.length > 5) {
      addIssue('low', 'error_handling', `Many async calls without .catch()`, {
        file: relPath,
        count: asyncWithoutCatch.length,
        hint: 'Add .catch(err => this.error(err)) to prevent unhandled rejections'
      });
    }
  }
}

async function generateReport() {
  console.log('\n📊 Generating Report...');
  
  const reportPath = path.join(ROOT, 'reports', 'ULTIMATE_AUDIT_REPORT.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(AUDIT_REPORT, null, 2), 'utf8');

  // Generate markdown summary
  const mdPath = path.join(ROOT, 'reports', 'ULTIMATE_AUDIT_REPORT.md');
  const md = generateMarkdownReport();
  fs.writeFileSync(mdPath, md, 'utf8');

  console.log(`\n✅ Audit complete!`);
  console.log(`   JSON: ${reportPath}`);
  console.log(`   MD:   ${mdPath}`);
  console.log(`\n📈 Summary:`);
  console.log(`   Total issues: ${AUDIT_REPORT.meta.totalIssues}`);
  console.log(`   Critical: ${AUDIT_REPORT.critical.length}`);
  console.log(`   High: ${AUDIT_REPORT.high.length}`);
  console.log(`   Medium: ${AUDIT_REPORT.medium.length}`);
  console.log(`   Low: ${AUDIT_REPORT.low.length}`);
}

function generateMarkdownReport() {
  return `# Ultimate Audit Report
Generated: ${AUDIT_REPORT.meta.date}

## Summary
- **Total Issues**: ${AUDIT_REPORT.meta.totalIssues}
- **Critical**: ${AUDIT_REPORT.critical.length}
- **High**: ${AUDIT_REPORT.high.length}
- **Medium**: ${AUDIT_REPORT.medium.length}
- **Low**: ${AUDIT_REPORT.low.length}

## Statistics
- **Drivers**: ${AUDIT_REPORT.statistics.drivers}
- **Flow Cards**: ${AUDIT_REPORT.statistics.flowCards.app} (app) / ${AUDIT_REPORT.statistics.flowCards.invalid} invalid
- **Capabilities**: ${AUDIT_REPORT.statistics.capabilities.total} total / ${AUDIT_REPORT.statistics.capabilities.missing} missing
- **Manufacturer IDs**: ${AUDIT_REPORT.statistics.manufacturerIDs.total} total / ${AUDIT_REPORT.statistics.manufacturerIDs.duplicates} duplicates

## Critical Issues
${formatIssues(AUDIT_REPORT.critical)}

## High Priority Issues
${formatIssues(AUDIT_REPORT.high)}

## Medium Priority Issues
${formatIssues(AUDIT_REPORT.medium)}

## Low Priority Issues
${formatIssues(AUDIT_REPORT.low)}
`;
}

function formatIssues(issues) {
  if (issues.length === 0) return '*None*\n';
  
  return issues.map((issue, i) => {
    return `### ${i + 1}. ${issue.message}
- **Category**: ${issue.category}
- **Driver**: ${issue.driver || 'N/A'}
- **File**: ${issue.file || 'N/A'}
${issue.fix ? `- **Fix**: ${issue.fix}` : ''}
${issue.hint ? `- **Hint**: ${issue.hint}` : ''}
`;
  }).join('\n');
}

// Main execution
(async function main() {
  console.log('🚀 ULTIMATE AUDIT ENGINE - Starting...\n');
  
  try {
    await auditFlowCards();
    await auditCapabilities();
    await auditManufacturerIDs();
    await auditImages();
    await auditEndpoints();
    await auditEventListeners();
    await generateReport();
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
})();
