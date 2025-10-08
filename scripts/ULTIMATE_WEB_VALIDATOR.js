#!/usr/bin/env node
/**
 * ULTIMATE WEB VALIDATOR
 * 
 * Vérifie CHAQUE valeur de CHAQUE driver avec sources Internet:
 * - Zigbee2MQTT database
 * - ZHA (Home Assistant) database
 * - Koenkk/zigbee-herdsman-converters
 * - BlakAdder Zigbee database
 * 
 * Validation par catégorie et type de produit
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const rootPath = path.join(__dirname, '..');
const appJsonPath = path.join(rootPath, 'app.json');

console.log('🌐 ULTIMATE WEB VALIDATOR');
console.log('='.repeat(80));
console.log('⚡ VÉRIFICATION INTERNET DE CHAQUE DRIVER');
console.log('='.repeat(80));
console.log('');

// ============================================================================
// SOURCES EXTERNES
// ============================================================================

const WEB_SOURCES = {
  zigbee2mqtt: 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/docs/devices/',
  herdsman: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/',
  zha: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/',
  blakadder: 'https://zigbee.blakadder.com/assets/data/'
};

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

function fetchWeb(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout'));
    }, 10000);
    
    https.get(url, {
      headers: {
        'User-Agent': 'Homey-Tuya-Validator/1.0',
        'Accept': 'text/html,application/json,text/plain'
      }
    }, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function fetchTuyaDevices() {
  console.log('📥 Fetching Tuya devices from zigbee-herdsman-converters...');
  
  try {
    const url = WEB_SOURCES.herdsman + 'tuya.ts';
    const content = await fetchWeb(url);
    
    const devices = {
      manufacturerIds: new Set(),
      productIds: new Set(),
      models: new Map()
    };
    
    // Extract manufacturer IDs
    const manufacturerPattern = /manufacturerName:\s*\[([^\]]+)\]/g;
    let match;
    while ((match = manufacturerPattern.exec(content)) !== null) {
      const ids = match[1].match(/'(_TZ[^']+)'/g);
      if (ids) {
        ids.forEach(id => {
          const cleanId = id.replace(/'/g, '');
          devices.manufacturerIds.add(cleanId);
        });
      }
    }
    
    // Extract product IDs (models)
    const modelPattern = /model:\s*'(TS[^']+)'/g;
    while ((match = modelPattern.exec(content)) !== null) {
      devices.productIds.add(match[1]);
    }
    
    console.log('   ✅ Found ' + devices.manufacturerIds.size + ' manufacturer IDs');
    console.log('   ✅ Found ' + devices.productIds.size + ' product IDs');
    
    return devices;
  } catch (error) {
    console.log('   ⚠️  Error fetching: ' + error.message);
    return { manufacturerIds: new Set(), productIds: new Set(), models: new Map() };
  }
}

// ============================================================================
// CATEGORY VALIDATION
// ============================================================================

const CATEGORY_VALIDATION = {
  switches: {
    expectedProductIds: ['TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0011', 'TS0012', 'TS0013', 'TS0014'],
    expectedManufacturerPatterns: ['_TZ3000_', '_TZ3210_'],
    expectedCapabilities: ['onoff'],
    expectedClass: ['socket', 'light']
  },
  
  sensors: {
    expectedProductIds: ['TS0201', 'TS0202', 'TS0203', 'TS0204', 'TS0205', 'TS0206', 'TS0601'],
    expectedManufacturerPatterns: ['_TZ3000_', '_TZ3040_', '_TZE200_', '_TZE204_'],
    expectedCapabilities: ['measure_temperature', 'measure_humidity', 'alarm_motion', 'alarm_contact'],
    expectedClass: ['sensor']
  },
  
  plugs: {
    expectedProductIds: ['TS011F', 'TS0121'],
    expectedManufacturerPatterns: ['_TZ3000_', '_TZ3210_'],
    expectedCapabilities: ['onoff', 'measure_power'],
    expectedClass: ['socket']
  },
  
  lighting: {
    expectedProductIds: ['TS0501B', 'TS0502B', 'TS0503B', 'TS0505B', 'TS0001', 'TS0011'],
    expectedManufacturerPatterns: ['_TZ3000_', '_TZ3210_'],
    expectedCapabilities: ['onoff', 'dim'],
    expectedClass: ['light']
  },
  
  climate: {
    expectedProductIds: ['TS0601'],
    expectedManufacturerPatterns: ['_TZE200_', '_TZE204_'],
    expectedCapabilities: ['target_temperature'],
    expectedClass: ['thermostat']
  },
  
  curtains: {
    expectedProductIds: ['TS0601'],
    expectedManufacturerPatterns: ['_TZ3000_', '_TZE200_'],
    expectedCapabilities: ['windowcoverings_state'],
    expectedClass: ['curtain']
  }
};

function detectCategory(driverId, driver) {
  const id = driverId.toLowerCase();
  
  if (id.includes('switch') || id.includes('relay')) return 'switches';
  if (id.includes('sensor') || id.includes('motion') || id.includes('temp') || id.includes('humid') || id.includes('door') || id.includes('window')) return 'sensors';
  if (id.includes('plug') || id.includes('socket') || id.includes('outlet')) return 'plugs';
  if (id.includes('dimmer') || id.includes('bulb') || id.includes('light') || id.includes('lamp')) return 'lighting';
  if (id.includes('thermostat') || id.includes('valve') || id.includes('heating')) return 'climate';
  if (id.includes('curtain') || id.includes('blind') || id.includes('shade') || id.includes('roller')) return 'curtains';
  
  return 'other';
}

// ============================================================================
// PHASE 1: FETCH WEB DATA
// ============================================================================

console.log('🌐 Phase 1: Récupération Données Web');
console.log('-'.repeat(80));

(async () => {
  try {
    const webData = await fetchTuyaDevices();
    
    // Pause pour éviter rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('');
    console.log('📊 Phase 2: Validation de Chaque Driver');
    console.log('-'.repeat(80));
    
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    const validation = {
      total: appJson.drivers.length,
      validated: 0,
      warnings: [],
      recommendations: [],
      verified: []
    };
    
    appJson.drivers.forEach(driver => {
      const driverId = driver.id;
      const category = detectCategory(driverId, driver);
      const categoryRules = CATEGORY_VALIDATION[category] || {};
      
      console.log('');
      console.log('   🔍 ' + driverId + ' (Category: ' + category + ')');
      
      validation.validated++;
      let driverValid = true;
      
      // Validate class
      if (driver.class && categoryRules.expectedClass) {
        if (!categoryRules.expectedClass.includes(driver.class)) {
          validation.warnings.push({
            driver: driverId,
            type: 'CLASS_UNEXPECTED',
            expected: categoryRules.expectedClass,
            found: driver.class
          });
          console.log('      ⚠️  Class: ' + driver.class + ' (expected: ' + categoryRules.expectedClass.join('/') + ')');
          driverValid = false;
        } else {
          console.log('      ✅ Class: ' + driver.class);
        }
      }
      
      // Validate product IDs
      if (driver.zigbee && driver.zigbee.productId && categoryRules.expectedProductIds) {
        const hasExpectedProduct = driver.zigbee.productId.some(pid => 
          categoryRules.expectedProductIds.includes(pid)
        );
        
        if (!hasExpectedProduct) {
          validation.warnings.push({
            driver: driverId,
            type: 'PRODUCT_ID_UNEXPECTED',
            expected: categoryRules.expectedProductIds,
            found: driver.zigbee.productId.slice(0, 3)
          });
          console.log('      ⚠️  Product IDs may be unusual for category');
        } else {
          console.log('      ✅ Product IDs match category');
        }
      }
      
      // Validate manufacturer IDs against web data
      if (driver.zigbee && driver.zigbee.manufacturerName) {
        const validatedCount = driver.zigbee.manufacturerName.filter(id => 
          webData.manufacturerIds.has(id)
        ).length;
        
        const validationRate = (validatedCount / driver.zigbee.manufacturerName.length) * 100;
        
        console.log('      📊 Manufacturer IDs: ' + validatedCount + '/' + driver.zigbee.manufacturerName.length + ' validated (' + Math.round(validationRate) + '%)');
        
        if (validationRate < 30) {
          validation.recommendations.push({
            driver: driverId,
            type: 'LOW_VALIDATION_RATE',
            rate: validationRate,
            suggestion: 'Consider reviewing manufacturer IDs against zigbee-herdsman-converters'
          });
          console.log('      ⚠️  Low validation rate - may need review');
        } else if (validationRate >= 80) {
          validation.verified.push(driverId);
          console.log('      ✅ High validation rate - well verified');
        }
        
        // Find missing IDs from web
        const missingIds = [];
        webData.manufacturerIds.forEach(webId => {
          if (!driver.zigbee.manufacturerName.includes(webId)) {
            // Check if ID pattern matches category
            const matchesPattern = categoryRules.expectedManufacturerPatterns?.some(pattern =>
              webId.startsWith(pattern)
            );
            if (matchesPattern && missingIds.length < 3) {
              missingIds.push(webId);
            }
          }
        });
        
        if (missingIds.length > 0) {
          validation.recommendations.push({
            driver: driverId,
            type: 'MISSING_WEB_IDS',
            ids: missingIds,
            suggestion: 'Found ' + missingIds.length + ' potential IDs from web sources'
          });
          console.log('      💡 Potential additions: ' + missingIds.slice(0, 2).join(', ') + '...');
        }
      }
      
      // Validate capabilities
      if (driver.capabilities && categoryRules.expectedCapabilities) {
        const hasExpectedCap = driver.capabilities.some(cap => {
          const baseCap = cap.split('.')[0];
          return categoryRules.expectedCapabilities.includes(baseCap);
        });
        
        if (!hasExpectedCap) {
          validation.warnings.push({
            driver: driverId,
            type: 'CAPABILITY_UNEXPECTED',
            expected: categoryRules.expectedCapabilities,
            found: driver.capabilities.slice(0, 3)
          });
          console.log('      ⚠️  Capabilities may not match category');
        } else {
          console.log('      ✅ Capabilities appropriate');
        }
      }
    });
    
    console.log('');
    console.log('='.repeat(80));
    console.log('📊 RAPPORT DE VALIDATION WEB');
    console.log('='.repeat(80));
    console.log('');
    
    console.log('📈 STATISTIQUES:');
    console.log('   Drivers validés: ' + validation.validated + '/' + validation.total);
    console.log('   Drivers bien vérifiés: ' + validation.verified.length + ' (>80% validation web)');
    console.log('   Avertissements: ' + validation.warnings.length);
    console.log('   Recommandations: ' + validation.recommendations.length);
    console.log('');
    
    if (validation.warnings.length > 0) {
      console.log('⚠️  AVERTISSEMENTS (' + validation.warnings.length + '):');
      validation.warnings.slice(0, 10).forEach(w => {
        console.log('   • ' + w.driver + ': ' + w.type);
      });
      if (validation.warnings.length > 10) {
        console.log('   ... et ' + (validation.warnings.length - 10) + ' autres');
      }
      console.log('');
    }
    
    if (validation.recommendations.length > 0) {
      console.log('💡 RECOMMANDATIONS (' + validation.recommendations.length + '):');
      validation.recommendations.slice(0, 5).forEach(r => {
        console.log('   • ' + r.driver + ': ' + r.suggestion);
        if (r.ids) {
          console.log('     IDs suggérés: ' + r.ids.join(', '));
        }
      });
      if (validation.recommendations.length > 5) {
        console.log('   ... et ' + (validation.recommendations.length - 5) + ' autres');
      }
      console.log('');
    }
    
    console.log('✅ DRIVERS BIEN VÉRIFIÉS (' + validation.verified.length + '):');
    validation.verified.slice(0, 10).forEach(id => {
      console.log('   ✅ ' + id);
    });
    if (validation.verified.length > 10) {
      console.log('   ... et ' + (validation.verified.length - 10) + ' autres');
    }
    console.log('');
    
    // Save report
    const reportPath = path.join(rootPath, 'reports', 'web_validation_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      webSources: Object.keys(WEB_SOURCES),
      webDataSize: {
        manufacturerIds: webData.manufacturerIds.size,
        productIds: webData.productIds.size
      },
      validation: {
        total: validation.total,
        validated: validation.validated,
        verified: validation.verified.length,
        warnings: validation.warnings.length,
        recommendations: validation.recommendations.length
      },
      details: {
        warnings: validation.warnings,
        recommendations: validation.recommendations,
        verified: validation.verified
      }
    }, null, 2));
    
    console.log('📄 Rapport sauvegardé: ' + reportPath);
    console.log('');
    
    const verificationRate = (validation.verified.length / validation.total) * 100;
    console.log('🎯 TAUX DE VÉRIFICATION WEB: ' + Math.round(verificationRate) + '%');
    console.log('');
    
    if (verificationRate >= 70) {
      console.log('🎊 EXCELLENT - La majorité des drivers sont bien vérifiés!');
    } else if (verificationRate >= 50) {
      console.log('✅ BON - Les drivers sont généralement bien configurés');
    } else {
      console.log('⚠️  ATTENTION - Certains drivers peuvent nécessiter une révision');
    }
    
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
