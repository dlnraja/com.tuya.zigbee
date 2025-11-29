'use strict';

const fs = require('fs');
const path = require('path');

// Parse Zigbee2MQTT tuya.ts for device fingerprints
function parseTuyaTS(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  const devices = [];
  const manufacturers = new Set();
  const modelIds = new Set();

  // Extract device definitions - look for fingerprint arrays
  const deviceBlocks = content.split(/\n\s*{\s*$/m);

  // Extract modelID patterns
  const modelRegex = /modelID:\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = modelRegex.exec(content)) !== null) {
    modelIds.add(match[1]);
  }

  // Extract manufacturerName patterns
  const manuRegex = /manufacturerName:\s*['"`]([^'"`]+)['"`]/g;
  while ((match = manuRegex.exec(content)) !== null) {
    manufacturers.add(match[1]);
  }

  // Extract vendor patterns
  const vendorRegex = /vendor:\s*['"`]([^'"`]+)['"`]/g;
  const vendors = new Set();
  while ((match = vendorRegex.exec(content)) !== null) {
    vendors.add(match[1]);
  }

  // Extract model patterns
  const modelPatternRegex = /model:\s*['"`]([^'"`]+)['"`]/g;
  const models = new Set();
  while ((match = modelPatternRegex.exec(content)) !== null) {
    models.add(match[1]);
  }

  // Extract description patterns
  const descRegex = /description:\s*['"`]([^'"`]+)['"`]/g;
  const descriptions = [];
  while ((match = descRegex.exec(content)) !== null) {
    descriptions.push(match[1]);
  }

  // Extract exposes/capabilities
  const exposesRegex = /e\.(switch|light|cover|climate|lock|fan|numeric|binary|enum|text|composite)\(/g;
  const exposes = new Set();
  while ((match = exposesRegex.exec(content)) !== null) {
    exposes.add(match[1]);
  }

  // Extract tuya datapoints
  const dpRegex = /tuya\.dpValue(Bool|Enum|Range|Bitmap|Raw|String)\((\d+)/g;
  const datapoints = new Set();
  while ((match = dpRegex.exec(content)) !== null) {
    datapoints.add({ dp: parseInt(match[2]), type: match[1] });
  }

  // Extract DP mappings from tuyaQuirkz
  const dpMappingRegex = /dp:\s*(\d+)/g;
  const allDPs = new Set();
  while ((match = dpMappingRegex.exec(content)) !== null) {
    allDPs.add(parseInt(match[1]));
  }

  return {
    manufacturers: [...manufacturers].sort(),
    modelIds: [...modelIds].sort(),
    vendors: [...vendors].sort(),
    models: [...models].sort(),
    descriptions: descriptions.slice(0, 100),
    exposes: [...exposes],
    datapoints: [...allDPs].sort((a, b) => a - b),
    stats: {
      totalManufacturers: manufacturers.size,
      totalModelIds: modelIds.size,
      totalVendors: vendors.size,
      totalModels: models.size,
      totalDescriptions: descriptions.length,
      totalDatapoints: allDPs.size
    }
  };
}

// Parse OTA index.json
function parseOTAIndex(filePath) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const getManuName = (item) => {
    if (!item.manufacturerName) return '';
    if (Array.isArray(item.manufacturerName)) return item.manufacturerName[0] || '';
    return String(item.manufacturerName);
  };

  const tuyaOTA = content.filter(item =>
    item.manufacturerCode === 4417 || // 0x1141 Tuya
    item.manufacturerCode === 4098 || // 0x1002 Tuya alt
    getManuName(item).toLowerCase().includes('tuya')
  );

  const xiaomiOTA = content.filter(item =>
    item.manufacturerCode === 4447 || // 0x115F Xiaomi
    item.manufacturerCode === 4151 || // 0x1037 Aqara
    getManuName(item).toLowerCase().includes('xiaomi') ||
    getManuName(item).toLowerCase().includes('aqara') ||
    getManuName(item).toLowerCase().includes('lumi')
  );

  return {
    total: content.length,
    tuya: tuyaOTA.length,
    xiaomi: xiaomiOTA.length,
    tuyaDevices: tuyaOTA.map(o => ({
      modelId: o.modelId,
      manufacturerName: o.manufacturerName,
      fileVersion: o.fileVersion
    })),
    xiaomiDevices: xiaomiOTA.map(o => ({
      modelId: o.modelId,
      manufacturerName: o.manufacturerName,
      fileVersion: o.fileVersion
    }))
  };
}

// Parse ZHA quirks
function parseZHAQuirks(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract DP definitions
  const dpDefRegex = /(\w+)_DP\s*=\s*(\d+)/g;
  const dpDefs = {};
  let match;
  while ((match = dpDefRegex.exec(content)) !== null) {
    dpDefs[match[1]] = parseInt(match[2]);
  }

  // Extract class definitions
  const classRegex = /class\s+(\w+)\s*\(/g;
  const classes = [];
  while ((match = classRegex.exec(content)) !== null) {
    classes.push(match[1]);
  }

  // Extract Tuya-specific patterns
  const tuyaPatterns = {
    dpMappings: dpDefs,
    quirksClasses: classes.filter(c => c.includes('Tuya') || c.includes('DP')),
    totalClasses: classes.length
  };

  return tuyaPatterns;
}

// Main execution
console.log('=== PARSING FRESH DATA FROM ALL SOURCES ===\n');

// Parse Zigbee2MQTT
console.log('📦 Parsing Zigbee2MQTT tuya.ts...');
const tuyaData = parseTuyaTS('./tuya_fresh.ts');
console.log(`   Manufacturers: ${tuyaData.stats.totalManufacturers}`);
console.log(`   Model IDs: ${tuyaData.stats.totalModelIds}`);
console.log(`   Vendors: ${tuyaData.stats.totalVendors}`);
console.log(`   Models: ${tuyaData.stats.totalModels}`);
console.log(`   Descriptions: ${tuyaData.stats.totalDescriptions}`);
console.log(`   Datapoints: ${tuyaData.stats.totalDatapoints}`);

// Parse OTA
console.log('\n📦 Parsing Zigbee-OTA index.json...');
const otaData = parseOTAIndex('./ota_index.json');
console.log(`   Total OTA images: ${otaData.total}`);
console.log(`   Tuya OTA: ${otaData.tuya}`);
console.log(`   Xiaomi OTA: ${otaData.xiaomi}`);

// Parse ZHA
console.log('\n📦 Parsing ZHA quirks...');
const zhaData = parseZHAQuirks('./zha_tuya.py');
console.log(`   DP Mappings: ${Object.keys(zhaData.dpMappings).length}`);
console.log(`   Quirks Classes: ${zhaData.quirksClasses.length}`);

// Output summary
console.log('\n=== FRESH DATA SUMMARY ===');
console.log(`
ZIGBEE2MQTT:
  - ${tuyaData.manufacturers.length} unique manufacturer names
  - ${tuyaData.modelIds.length} unique model IDs
  - ${tuyaData.vendors.length} vendors (brands)
  - ${tuyaData.models.length} product models

ZIGBEE-OTA:
  - ${otaData.total} total firmware images
  - ${otaData.tuya} Tuya-compatible
  - ${otaData.xiaomi} Xiaomi/Aqara/Lumi

ZHA QUIRKS:
  - ${Object.keys(zhaData.dpMappings).length} DP constant definitions
  - ${zhaData.quirksClasses.length} Tuya quirks classes
`);

// Save parsed data for use
const enrichmentData = {
  timestamp: new Date().toISOString(),
  zigbee2mqtt: {
    manufacturers: tuyaData.manufacturers,
    modelIds: tuyaData.modelIds,
    vendors: tuyaData.vendors,
    models: tuyaData.models,
    datapoints: tuyaData.datapoints,
    stats: tuyaData.stats
  },
  ota: {
    total: otaData.total,
    tuya: otaData.tuyaDevices,
    xiaomi: otaData.xiaomiDevices
  },
  zha: zhaData
};

fs.writeFileSync('./lib/data/enrichment_data.json', JSON.stringify(enrichmentData, null, 2));
console.log('\n✅ Saved enrichment data to lib/data/enrichment_data.json');

// Output new manufacturers to add
console.log('\n=== NEW TUYA MANUFACTURERS ===');
const tuyaManus = tuyaData.manufacturers.filter(m => m.startsWith('_T'));
console.log(tuyaManus.slice(0, 50).join('\n'));
