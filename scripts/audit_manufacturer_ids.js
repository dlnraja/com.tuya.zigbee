#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const KNOWN_DEVICE_TYPES = {
  climate_sensor: {
    productIds: ['TS0201', 'TS0601', 'TH01Z', 'RS0201', 'SM0201'],
    patterns: ['temp', 'hum', 'climate', 'weather', 'th01', 'rs0201'],
    capabilities: ['measure_temperature', 'measure_humidity']
  },
  motion_sensor: {
    productIds: ['TS0202', 'TS0601', 'MS01', 'ZM-35H-Q'],
    patterns: ['pir', 'motion', 'occupancy', 'human'],
    capabilities: ['alarm_motion']
  },
  contact_sensor: {
    productIds: ['TS0203', 'TS0601', 'DS01'],
    patterns: ['door', 'window', 'contact', 'magnet'],
    capabilities: ['alarm_contact']
  },
  water_leak_sensor: {
    productIds: ['TS0207', 'TS0601', 'WL01'],
    patterns: ['water', 'leak', 'flood'],
    capabilities: ['alarm_water']
  },
  smoke_detector: {
    productIds: ['TS0205', 'TS0601'],
    patterns: ['smoke', 'fire'],
    capabilities: ['alarm_smoke']
  },
  button_sos: {
    productIds: ['TS0215A', 'TS0218', 'TS0211'],
    patterns: ['sos', 'emergency', 'panic'],
    manufacturerIds: ['_TZ3000_0dumfk2z', '_TZ3000_4fsgukof', '_TZ3000_fsiepnrh']
  },
  plug_smart: {
    productIds: ['TS011F', 'TS0121', 'TS0001'],
    patterns: ['plug', 'socket', 'outlet'],
    capabilities: ['onoff', 'measure_power']
  },
  switch: {
    productIds: ['TS0001', 'TS0002', 'TS0003', 'TS0011', 'TS0012', 'TS0013'],
    patterns: ['switch', 'gang'],
    capabilities: ['onoff']
  },
  dimmer: {
    productIds: ['TS0101', 'TS0110', 'TS110E'],
    patterns: ['dimmer', 'dim'],
    capabilities: ['dim']
  },
  curtain: {
    productIds: ['TS130F', 'TS0601', 'TS0302'],
    patterns: ['curtain', 'blind', 'cover', 'shutter'],
    capabilities: ['windowcoverings_set']
  },
  presence_radar: {
    productIds: ['TS0601', 'ZY-M100'],
    patterns: ['radar', 'presence', 'mmwave'],
    capabilities: ['alarm_motion', 'measure_distance']
  },
  thermostat: {
    productIds: ['TS0601', 'TS0603', 'TRV'],
    patterns: ['thermostat', 'trv', 'valve', 'heating'],
    capabilities: ['target_temperature']
  },
  air_quality: {
    productIds: ['TS0601', 'ZG-204ZM'],
    patterns: ['co2', 'voc', 'air', 'quality', 'formaldehyde'],
    capabilities: ['measure_co2']
  }
};

const ZIGBEE2MQTT_CLIMATE_IDS = [
  '_TZ3000_qaayumkd', '_TZ3000_fllyghyj', '_TZ3000_saiqcn0y', '_TZ3000_lxvlqvcr',
  '_TZ3000_6uzkisv2', '_TZ3000_xr3htd96', '_TZ3000_dowj6gyi', '_TZ3000_8ybe88nf',
  '_TZ3000_0s9gukzt', '_TZ3000_yd2e749y', '_TZE200_bjawzodf', '_TZE200_zl1kmjqx',
  '_TZE200_qoy0ekbd', '_TZE200_znbl8dj5', '_TZE200_a8sdabtg', '_TZE200_locansqn',
  '_TZE204_upagmta9', '_TZE200_pisltm67', '_TZE200_c5dcbw11', '_TZE200_bq5c8xfe'
];

const NOT_CLIMATE_SENSOR_IDS = [
  '_TZ3000_0dumfk2z', '_TZ3000_4fsgukof', '_TZ3000_fsiepnrh', '_TZ3000_wr2ucaj9',
  '_TZ3000_pkfazisv', '_TZ3000_p6ju8myv', '_TZ3000_gjnozsaz', '_TZ3000_2izubafb',
  '_TZ3000_fllyghyj', '_TZ3000_kmh5qpmb', '_TZ3000_mcxw5ehu', '_TZ3000_g5xawfcq',
];

async function findAllDrivers() {
  const driversDir = path.join(__dirname, '../drivers');
  const entries = await fs.readdir(driversDir, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name);
}

async function readDriverCompose(driverName) {
  const composePath = path.join(__dirname, '../drivers', driverName, 'driver.compose.json');
  try {
    const content = await fs.readFile(composePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function normalizeId(id) {
  return id.replace(/\r/g, '').replace(/\n/g, '').trim();
}

function cleanManufacturerIds(ids) {
  const cleaned = [];
  const issues = [];

  for (const id of ids) {
    const normalized = normalizeId(id);

    if (id !== normalized) {
      issues.push({ id, issue: 'INVALID_CHARS', normalized });
    }

    if (!cleaned.includes(normalized) && !cleaned.includes(normalized.toUpperCase()) && !cleaned.includes(normalized.toLowerCase())) {
      cleaned.push(normalized);
    } else {
      issues.push({ id: normalized, issue: 'DUPLICATE_CASE' });
    }
  }

  return { cleaned, issues };
}

function detectDeviceType(manufacturerId, productIds = []) {
  const idLower = manufacturerId.toLowerCase();

  for (const [type, config] of Object.entries(KNOWN_DEVICE_TYPES)) {
    if (config.manufacturerIds && config.manufacturerIds.some(mid => mid.toLowerCase() === idLower)) {
      return { type, confidence: 'HIGH', reason: 'Known manufacturer ID' };
    }
  }

  for (const productId of productIds) {
    for (const [type, config] of Object.entries(KNOWN_DEVICE_TYPES)) {
      if (config.productIds && config.productIds.includes(productId)) {
        if (type === 'climate_sensor' && ['TS0201', 'RS0201', 'SM0201', 'TH01Z'].includes(productId)) {
          return { type, confidence: 'HIGH', reason: `ProductId ${productId}` };
        }
        if (type === 'button_sos' && productId === 'TS0215A') {
          return { type, confidence: 'HIGH', reason: 'ProductId TS0215A (SOS button)' };
        }
        if (type === 'motion_sensor' && productId === 'TS0202') {
          return { type, confidence: 'HIGH', reason: 'ProductId TS0202 (motion sensor)' };
        }
        if (type === 'contact_sensor' && productId === 'TS0203') {
          return { type, confidence: 'HIGH', reason: 'ProductId TS0203 (contact sensor)' };
        }
      }
    }
  }

  if (ZIGBEE2MQTT_CLIMATE_IDS.some(cid => cid.toLowerCase() === idLower)) {
    return { type: 'climate_sensor', confidence: 'MEDIUM', reason: 'Zigbee2MQTT database' };
  }

  if (idLower.includes('_tze200_') || idLower.includes('_tze204_')) {
    if (idLower.includes('pir') || idLower.includes('motion')) {
      return { type: 'motion_sensor', confidence: 'MEDIUM', reason: 'Pattern match (motion)' };
    }
  }

  return { type: 'unknown', confidence: 'LOW', reason: 'No match found' };
}

async function auditDriver(driverName, allDriversData) {
  const driver = await readDriverCompose(driverName);
  if (!driver || !driver.zigbee || !driver.zigbee.manufacturerName) {
    return null;
  }

  const manufacturerNames = driver.zigbee.manufacturerName;
  const productIds = driver.zigbee.productId || [];

  const { cleaned, issues } = cleanManufacturerIds(manufacturerNames);

  const audit = {
    driver: driverName,
    originalCount: manufacturerNames.length,
    cleanedCount: cleaned.length,
    productIds: productIds,
    issues: {
      invalidChars: issues.filter(i => i.issue === 'INVALID_CHARS'),
      duplicateCases: issues.filter(i => i.issue === 'DUPLICATE_CASE'),
      wrongDriver: [],
      duplicatesAcrossDrivers: []
    },
    recommendations: []
  };

  for (const id of cleaned) {
    const detection = detectDeviceType(id, productIds);

    if (detection.type !== 'unknown' && detection.type !== driverName.replace(/_/g, '').toLowerCase()) {
      const expectedDrivers = Object.keys(KNOWN_DEVICE_TYPES).filter(t =>
        t.replace(/_/g, '').toLowerCase().includes(detection.type.replace(/_/g, '').toLowerCase())
      );

      if (!driverName.includes(detection.type.split('_')[0])) {
        audit.issues.wrongDriver.push({
          id,
          currentDriver: driverName,
          suggestedType: detection.type,
          confidence: detection.confidence,
          reason: detection.reason
        });
      }
    }

    for (const [otherDriver, otherData] of Object.entries(allDriversData)) {
      if (otherDriver !== driverName && otherData.manufacturerNames) {
        const otherNormalized = otherData.manufacturerNames.map(normalizeId);
        if (otherNormalized.some(oid => oid.toLowerCase() === id.toLowerCase())) {
          audit.issues.duplicatesAcrossDrivers.push({
            id,
            otherDriver,
            productIds: otherData.productIds
          });
        }
      }
    }
  }

  if (audit.issues.invalidChars.length > 0) {
    audit.recommendations.push(`Remove \\r characters from ${audit.issues.invalidChars.length} IDs`);
  }
  if (audit.issues.duplicateCases.length > 0) {
    audit.recommendations.push(`Remove ${audit.issues.duplicateCases.length} case-insensitive duplicates`);
  }
  if (audit.issues.wrongDriver.length > 0) {
    audit.recommendations.push(`Move ${audit.issues.wrongDriver.length} IDs to correct drivers`);
  }
  if (audit.issues.duplicatesAcrossDrivers.length > 0) {
    audit.recommendations.push(`Review ${audit.issues.duplicatesAcrossDrivers.length} cross-driver duplicates`);
  }

  return audit;
}

async function runFullAudit() {
  console.log('🔍 MANUFACTURER IDs AUDIT - FULL ANALYSIS\n');

  const allDrivers = await findAllDrivers();
  console.log(`Found ${allDrivers.length} drivers\n`);

  const allDriversData = {};
  for (const driverName of allDrivers) {
    const driver = await readDriverCompose(driverName);
    if (driver && driver.zigbee) {
      allDriversData[driverName] = {
        manufacturerNames: driver.zigbee.manufacturerName || [],
        productIds: driver.zigbee.productId || []
      };
    }
  }

  const audits = [];
  const priorityDrivers = ['climate_sensor', 'motion_sensor', 'contact_sensor', 'plug_smart', 'button_wireless'];

  for (const driverName of priorityDrivers) {
    if (allDrivers.includes(driverName)) {
      console.log(`Auditing ${driverName}...`);
      const audit = await auditDriver(driverName, allDriversData);
      if (audit) {
        audits.push(audit);

        console.log(`  Original: ${audit.originalCount} IDs`);
        console.log(`  Cleaned: ${audit.cleanedCount} IDs`);
        console.log(`  Invalid chars: ${audit.issues.invalidChars.length}`);
        console.log(`  Duplicates: ${audit.issues.duplicateCases.length}`);
        console.log(`  Wrong driver: ${audit.issues.wrongDriver.length}`);
        console.log(`  Cross-driver duplicates: ${audit.issues.duplicatesAcrossDrivers.length}`);
        console.log();
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let totalInvalidChars = 0;
  let totalDuplicates = 0;
  let totalWrongDriver = 0;
  let totalCrossDriverDups = 0;

  for (const audit of audits) {
    totalInvalidChars += audit.issues.invalidChars.length;
    totalDuplicates += audit.issues.duplicateCases.length;
    totalWrongDriver += audit.issues.wrongDriver.length;
    totalCrossDriverDups += audit.issues.duplicatesAcrossDrivers.length;
  }

  console.log(`Total invalid chars (\\r): ${totalInvalidChars}`);
  console.log(`Total case duplicates: ${totalDuplicates}`);
  console.log(`Total wrong driver placements: ${totalWrongDriver}`);
  console.log(`Total cross-driver duplicates: ${totalCrossDriverDups}`);

  const reportPath = path.join(__dirname, '../MANUFACTURER_IDS_AUDIT.json');
  await fs.writeFile(reportPath, JSON.stringify(audits, null, 2), 'utf8');
  console.log(`\n📄 Full report: ${reportPath}`);

  if (audits.length > 0 && audits[0].driver === 'climate_sensor') {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('CLIMATE_SENSOR SPECIFIC ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const climateAudit = audits[0];

    if (climateAudit.issues.wrongDriver.length > 0) {
      console.log('IDs that should be MOVED to other drivers:');
      for (const item of climateAudit.issues.wrongDriver.slice(0, 20)) {
        console.log(`  ${item.id} → ${item.suggestedType} (${item.reason})`);
      }
      if (climateAudit.issues.wrongDriver.length > 20) {
        console.log(`  ... and ${climateAudit.issues.wrongDriver.length - 20} more`);
      }
    }
  }

  return audits;
}

if (require.main === module) {
  runFullAudit()
    .then(() => {
      console.log('\n✅ AUDIT COMPLETE');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ ERROR:', err);
      process.exit(1);
    });
}

module.exports = { runFullAudit, cleanManufacturerIds, detectDeviceType };
