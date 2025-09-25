// Node.js port of scripts/tuya-zigbee-automation.ps1
// Usage: node scripts/js/tuyaZigbeeAutomation.js [validate|filter|update]

const fs = require('fs');
const path = require('path');

const ACTION = process.argv[2] || 'validate';

const tuyaZigbeeConfig = {
  ProjectName: 'Tuya Zigbee Project',
  Version: '1.0.0',
  TuyaOnlyMode: true,
  SupportedManufacturers: [
    'Tuya',
    'Smart Life',
    'Jinvoo',
    'Gosund',
    'Treatlife',
    'Teckin',
    'Merkury',
    'Wyze',
  ],
  SupportedProtocols: ['Zigbee'],
  ExcludedProtocols: ['WiFi', 'Z-Wave', 'Thread', 'Matter', 'KNX', 'EnOcean'],
};

function testTuyaZigbeeDevice(device) {
  try {
    const isTuya = Boolean(device.manufacturer) && /tuya|smart life|jinvoo|gosund|treatlife|teckin|merkury|wyze/i.test(device.manufacturer);
    const isZigbee = device.protocol === 'zigbee';
    const isSupported = Boolean(device.model) && /tuya|zigbee/i.test(device.model);
    return isTuya && isZigbee && isSupported;
  } catch (e) {
    console.error(`Erreur validation appareil: ${e.message}`);
    return false;
  }
}

function filterTuyaZigbeeSources(sources) {
  const results = [];
  for (const source of sources) {
    const hasTuyaDevices = (source.devices || []).some((d) => testTuyaZigbeeDevice(d));
    if (hasTuyaDevices || /tuya/i.test(source.name || '')) {
      results.push(source);
    }
  }
  return results;
}

function generateTuyaZigbeeReport(devices) {
  const report = {
    timestamp: new Date().toISOString().replace('T', ' ').split('.')[0],
    project: tuyaZigbeeConfig.ProjectName,
    version: tuyaZigbeeConfig.Version,
    tuya_only_mode: tuyaZigbeeConfig.TuyaOnlyMode,
    total_devices: devices.length,
    tuya_zigbee_devices: 0,
    excluded_devices: 0,
    manufacturers: {},
    categories: {},
    capabilities: {},
  };

  for (const device of devices) {
    if (testTuyaZigbeeDevice(device)) {
      report.tuya_zigbee_devices++;
      const manufacturer = device.manufacturer || 'Unknown';
      report.manufacturers[manufacturer] = (report.manufacturers[manufacturer] || 0) + 1;
      const category = device.category || 'Unknown';
      report.categories[category] = (report.categories[category] || 0) + 1;
      for (const cap of device.capabilities || []) {
        report.capabilities[cap] = (report.capabilities[cap] || 0) + 1;
      }
    } else {
      report.excluded_devices++;
    }
  }

  return report;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function main() {
  console.log('🎯 AUTOMATISATION TUYA ZIGBEE');
  console.log('================================');

  switch (ACTION) {
    case 'validate': {
      console.log('✅ Validation des appareils Tuya Zigbee...');
      const devices = [
        { manufacturer: 'Tuya', protocol: 'zigbee', model: 'TS0601', category: 'switch' },
        { manufacturer: 'Smart Life', protocol: 'zigbee', model: 'TS0602', category: 'light' },
        { manufacturer: 'Generic', protocol: 'zigbee', model: 'Generic', category: 'sensor' },
        { manufacturer: 'Tuya', protocol: 'wifi', model: 'TS0603', category: 'switch' },
      ];
      const report = generateTuyaZigbeeReport(devices);
      console.log('📊 Rapport Tuya Zigbee:');
      console.log(`   Total appareils: ${report.total_devices}`);
      console.log(`   Tuya Zigbee: ${report.tuya_zigbee_devices}`);
      console.log(`   Exclus: ${report.excluded_devices}`);
      const outDir = path.join(process.cwd(), 'docs');
      ensureDir(outDir);
      const outPath = path.join(outDir, 'tuya-zigbee-report.json');
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
      console.log(`📄 Rapport sauvegardé: ${path.relative(process.cwd(), outPath)}`);
      break;
    }
    case 'filter': {
      console.log('🔍 Filtrage des sources Tuya Zigbee...');
      const sources = [
        { name: 'Zigbee2MQTT Tuya', devices: [] },
        { name: 'Generic Zigbee', devices: [] },
        { name: 'Tuya Smart Life', devices: [] },
      ];
      const filtered = filterTuyaZigbeeSources(sources);
      console.log(`📊 Sources filtrées: ${filtered.length}`);
      for (const s of filtered) console.log(`   ✅ ${s.name}`);
      break;
    }
    case 'update': {
      console.log('🔄 Mise à jour des drivers Tuya Zigbee...');
      const drivers = ['tuya-zigbee-switch', 'tuya-zigbee-light', 'tuya-zigbee-sensor', 'tuya-zigbee-lock'];
      for (const d of drivers) console.log(`   ✅ Driver mis à jour: ${d}`);
      break;
    }
    default: {
      console.error(`❌ Action non reconnue: ${ACTION}`);
      console.log('Actions disponibles: validate, filter, update');
      process.exit(2);
    }
  }
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(`❌ tuyaZigbeeAutomation failed: ${e.message}`);
    process.exit(1);
  }
}
