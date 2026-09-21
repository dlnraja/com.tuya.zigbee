'use strict';

/**
 * SourceCredits.js - Attribution des sources et contributeurs
 *
 * Ce fichier liste toutes les sources de données utilisées pour enrichir
 * la base de données de l'application Tuya Unified Zigbee.
 *
 * IMPORTANT: Respecter les licences de chaque source
 */

const SOURCES = {

  // ═══════════════════════════════════════════════════════════════════════════
  // ZIGBEE2MQTT - Koenkk
  // ═══════════════════════════════════════════════════════════════════════════

  ZIGBEE2MQTT: {
    name: 'Zigbee2MQTT',
    description: 'Zigbee to MQTT bridge - 4797+ supported devices',
    repository: 'https://github.com/Koenkk/zigbee2mqtt',
    website: 'https://www.zigbee2mqtt.io',
    license: 'GPL-3.0',
    maintainer: 'Koen Kanters (@Koenkk)',
    contributors: [
      'Koenkk', 'sjorge', 'arteck', 'Nerivec', 'Hedda',
      'cydrain', 'jethome-ru', 'Quentame', 'GiedriusM'
    ],
    dataEndpoints: {
      supportedDevices: 'https://www.zigbee2mqtt.io/supported-devices/',
      devicesList: 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/supported-devices.js',
      herdsmanConverters: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts'
    },
    lastChecked: null,
    updateInterval: 24 * 60 * 60 * 1000 // 24 hours
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ZIGBEE-OTA - Koenkk
  // ═══════════════════════════════════════════════════════════════════════════

  ZIGBEE_OTA: {
    name: 'Zigbee-OTA',
    description: 'Collection of Zigbee OTA firmware files',
    repository: 'https://github.com/Koenkk/zigbee-OTA',
    license: 'CC0-1.0',
    maintainer: 'Koen Kanters (@Koenkk)',
    contributors: ['Koenkk', '162+ contributors'],
    dataEndpoints: {
      indexJson: 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json',
      downgradeIndex: 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index1.json',
      tuyaImages: 'https://github.com/Koenkk/zigbee-OTA/tree/master/images/Tuya',
      xiaomiImages: 'https://github.com/Koenkk/zigbee-OTA/tree/master/images/Xiaomi'
    },
    lastChecked: null,
    updateInterval: 6 * 60 * 60 * 1000 // 6 hours
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ZHA DEVICE HANDLERS - zigpy
  // ═══════════════════════════════════════════════════════════════════════════

  ZHA_QUIRKS: {
    name: 'ZHA Device Handlers (Quirks)',
    description: 'ZHA device handlers for Home Assistant integration',
    repository: 'https://github.com/zigpy/zha-device-handlers',
    license: 'Apache-2.0',
    maintainer: 'zigpy team',
    contributors: [
      'dmulcahey', 'Adminiuga', 'puddly', 'javicalle',
      'TheJulianJES', 'MattWestworking', 'frenck'
    ],
    dataEndpoints: {
      tuyaQuirks: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
      tuyaDoc: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/tuya.md',
      quirksManifest: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/manifest.json'
    },
    lastChecked: null,
    updateInterval: 24 * 60 * 60 * 1000
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BLAKADDER ZIGBEE DATABASE
  // ═══════════════════════════════════════════════════════════════════════════

  BLAKADDER: {
    name: 'Blakadder Zigbee Device Database',
    description: 'Database of Zigbee devices compatible with ZHA, Zigbee2MQTT, deCONZ, Tasmota',
    repository: 'https://github.com/blakadder/zigbee',
    website: 'https://zigbee.blakadder.com',
    license: 'MIT',
    maintainer: 'Blakadder',
    dataEndpoints: {
      devicesJson: 'https://raw.githubusercontent.com/blakadder/zigbee/master/_data/devices.json',
      website: 'https://zigbee.blakadder.com'
    },
    lastChecked: null,
    updateInterval: 24 * 60 * 60 * 1000
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TUYA DEVELOPER DOCUMENTATION
  // ═══════════════════════════════════════════════════════════════════════════

  TUYA_DEVELOPER: {
    name: 'Tuya Developer Platform',
    description: 'Official Tuya IoT documentation for device DPs',
    website: 'https://developer.tuya.com',
    license: 'Proprietary (Tuya)',
    maintainer: 'Tuya Inc.',
    dataEndpoints: {
      dpDocs: 'https://developer.tuya.com/en/docs/iot/zigbee-apartment-doorlock-dp-document',
      deviceTypes: 'https://developer.tuya.com/en/docs/iot/device-type'
    },
    lastChecked: null,
    updateInterval: 7 * 24 * 60 * 60 * 1000 // Weekly
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FAIRECASOIMEME ZIGBEE-OTA (Alternative)
  // ═══════════════════════════════════════════════════════════════════════════

  FAIRECASOIMEME_OTA: {
    name: 'Fairecasoimeme Zigbee-OTA',
    description: 'Alternative Zigbee OTA repository',
    repository: 'https://github.com/fairecasoimeme/zigbee-OTA',
    license: 'CC0-1.0',
    maintainer: 'fairecasoimeme',
    dataEndpoints: {
      indexJson: 'https://raw.githubusercontent.com/fairecasoimeme/zigbee-OTA/master/index.json'
    },
    lastChecked: null,
    updateInterval: 12 * 60 * 60 * 1000
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DECONZ / PHOSCON
  // ═══════════════════════════════════════════════════════════════════════════

  DECONZ: {
    name: 'deCONZ Device Database',
    description: 'Dresden Elektronik deCONZ supported devices',
    repository: 'https://github.com/dresden-elektronik/deconz-rest-plugin',
    website: 'https://phoscon.de/en/conbee2/compatible',
    license: 'BSD-3-Clause',
    maintainer: 'Dresden Elektronik',
    dataEndpoints: {
      deviceDescriptors: 'https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/devices.json'
    },
    lastChecked: null,
    updateInterval: 24 * 60 * 60 * 1000
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ZIGBEE ALLIANCE / CSA
  // ═══════════════════════════════════════════════════════════════════════════

  ZIGBEE_ALLIANCE: {
    name: 'Zigbee Alliance / CSA',
    description: 'Official Zigbee Cluster Library specifications',
    website: 'https://csa-iot.org/developer-resource/specifications-download-request/',
    license: 'CSA Membership',
    maintainer: 'Connectivity Standards Alliance',
    notes: 'ZCL specifications for cluster IDs and attributes'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TUYA LOCAL (Homey WiFi/LAN) — andiwirz / complementary enrich P2619–P2641
  // ═══════════════════════════════════════════════════════════════════════════

  TUYA_LOCAL_ANDIWIRZ: {
    name: 'Tuya Local (Homey)',
    description: 'Local WiFi/LAN Tuya control for Homey — protocol detection, DP maps, EV/heat-pump/kettle/IR patterns',
    repository: 'https://github.com/andiwirz/com.tuyalocal',
    website: 'https://homey.app/fr-fr/app/com.tuyalocal/Tuya-Local/test/',
    forum: 'https://community.homey.app/t/app-pro-tuya-local/154077',
    license: 'MIT',
    maintainer: 'Andi Wirz (@andiwirz)',
    contributors: ['andiwirz', 'claude'],
    homeyAppId: 'com.tuyalocal',
    homeyLive: '1.0.232',
    homeyTest: '1.0.237',
    notes: 'Complementary enrich only (P2520 UNION). P2619–P2647. See docs/architecture/TUYALOCAL_COMPLEMENTARY_CREDITS.md + COMPLEMENTARY_HOMEY_APPS.md',
    lastChecked: '2026-09-21',
    updateInterval: 7 * 24 * 60 * 60 * 1000
  },

  JOHAN_TUYA_ZIGBEE: {
    name: 'Tuya Zigbee (Johan Bendz)',
    description: 'Original Homey Tuya Zigbee app — white-label Zigbee devices',
    repository: 'https://github.com/JohanBendz/com.tuya.zigbee',
    website: 'https://homey.app/a/com.tuya.zigbee/Tuya-Zigbee/',
    forum: 'https://community.homey.app/t/tuya-zigbee-app/26439',
    license: 'MIT',
    maintainer: 'Johan Bendz / Bortbytt Software',
    homeyAppId: 'com.tuya.zigbee',
    defaultBranch: 'SDK3',
    homeyLive: '0.2.76',
    notes: 'Upstream inspiration + issue harvest. Silent enrich only.',
    lastChecked: '2026-09-21',
    updateInterval: 7 * 24 * 60 * 60 * 1000
  },

  DRENSO_TUYA2: {
    name: 'Tuya (Drenso)',
    description: 'Homey Tuya / Smart Life cloud bridge app',
    repository: 'https://github.com/Drenso/com.tuya2',
    website: 'https://homey.app/a/com.tuya2/',
    forum: 'https://community.homey.app/t/146735',
    maintainer: 'Drenso V.O.F.',
    homeyAppId: 'com.tuya2',
    homeyLive: '1.5.8',
    notes: 'Contrast only — local-first doctrine; API fragility lesson (P2657)',
    lastChecked: '2026-09-21',
    updateInterval: 14 * 24 * 60 * 60 * 1000
  },

  TUYA_CLOUD_HEINE: {
    name: 'Tuya cloud (Jurgen Heine)',
    description: 'Homey Tuya cloud API app',
    website: 'https://homey.app/a/com.tuya.cloud/',
    maintainer: 'Jurgen Heine',
    homeyAppId: 'com.tuya.cloud',
    homeyLive: '1.1.23',
    homeyTest: '1.1.26',
    notes: 'Optional cloud contrast only — Universal stays local-first',
    lastChecked: '2026-09-21',
    updateInterval: 14 * 24 * 60 * 60 * 1000
  },

  DEVICE_CAPABILITIES_ARIE: {
    name: 'Device Capabilities',
    description: 'Homey companion for advanced capabilities / flows',
    website: 'https://homey.app/a/nl.qluster-it.DeviceCapabilities/',
    maintainer: 'Arie J. Godschalk',
    homeyAppId: 'nl.qluster-it.DeviceCapabilities',
    homeyLive: '2.17.3',
    notes: 'capability_changed / advanced capability UX inspiration',
    lastChecked: '2026-09-21',
    updateInterval: 14 * 24 * 60 * 60 * 1000
  },

  HA_TUYA_LOCAL: {
    name: 'tuya-local (Home Assistant)',
    description: 'HA custom integration — Tuya LAN DP layouts / EV configs / hub cid',
    repository: 'https://github.com/make-all/tuya-local',
    license: 'MIT',
    maintainer: 'make-all',
    notes: 'YAML DP catalogs + hub node_id / LAN session limits → TuyaZigbeeBridge (P2656)',
    lastChecked: '2026-09-21',
    updateInterval: 14 * 24 * 60 * 60 * 1000
  },

  TINYTUYA: {
    name: 'TinyTuya',
    description: 'Python LAN API — UDP discovery 6666/6667/7000, protocols 3.1–3.5',
    repository: 'https://github.com/jasonacox/tinytuya',
    license: 'MIT',
    maintainer: 'Jason Cox (@jasonacox)',
    notes: 'UdpDiscoveryKeys / WifiFixIt complementary (P2408/P2656)',
    lastChecked: '2026-09-21',
    updateInterval: 14 * 24 * 60 * 60 * 1000
  },

  HASS_LOCALTUYA_XZET: {
    name: 'LocalTuya (xZetsubou)',
    description: 'HA fork — local LAN + sub-devices behind Tuya gateways',
    repository: 'https://github.com/xZetsubou/hass-localtuya',
    license: 'MIT',
    maintainer: 'xZetsubou',
    notes: 'Gateway cid / protocol 3.5 heuristics — complementary only (P2656)',
    lastChecked: '2026-09-21',
    updateInterval: 14 * 24 * 60 * 60 * 1000
  },

  TUYA_MQTT_LEHAN: {
    name: 'tuya-mqtt (lehanspb)',
    description: 'Node MQTT bridge with Tuya hub sub-device cid topics',
    repository: 'https://github.com/lehanspb/tuya-mqtt',
    license: 'MIT',
    maintainer: 'lehanspb',
    notes: 'resolveSubDeviceCid node_id-first (P2656)',
    lastChecked: '2026-09-21',
    updateInterval: 30 * 24 * 60 * 60 * 1000
  },

  TUYA_LOCAL_KEY_VINEET: {
    name: 'tuya-local-key',
    description: 'QR Smart Life local-key export without IoT developer account',
    repository: 'https://github.com/vineetchoudhary/tuya-local-key',
    license: 'MIT',
    maintainer: 'Vineet Choudhary',
    notes: 'Parallel to TuyaSmartLifeAuth QR — credit only; no wholesale copy',
    lastChecked: '2026-09-21',
    updateInterval: 30 * 24 * 60 * 60 * 1000
  },

  TUYA_DEVICE_SHARING_SDK: {
    name: 'Tuya Device Sharing SDK',
    description: 'Official Tuya sharing OpenAPI for device credentials',
    repository: 'https://github.com/tuya/tuya-device-sharing-sdk',
    license: 'MIT',
    maintainer: 'Tuya Inc.',
    notes: 'Cloud credentials path only — LAN control stays local (P2656)',
    lastChecked: '2026-09-21',
    updateInterval: 30 * 24 * 60 * 60 * 1000
  },

  TUYAPI: {
    name: 'TuyAPI',
    description: 'Node.js Tuya LAN client (TCP 6668) — runtime dependency for wifi_* / hub bridge',
    repository: 'https://github.com/codetheweb/tuyapi',
    license: 'MIT',
    maintainer: 'Max Isom (@codetheweb)',
    notes: 'gwID + cid hub pattern → TuyaZigbeeBridge.buildGatewayTuyApiOptions (P2656)',
    lastChecked: '2026-09-21',
    updateInterval: 14 * 24 * 60 * 60 * 1000
  },

  TUYAPI_CLI: {
    name: '@tuyapi/cli',
    description: 'tuya-cli wizard — export device IDs and local keys',
    repository: 'https://github.com/TuyaAPI/cli',
    license: 'MIT',
    maintainer: 'Max Isom (@codetheweb)',
    notes: 'Documented key path alongside TinyTuya wizard / Smart Life QR (P2656)',
    lastChecked: '2026-09-21',
    updateInterval: 30 * 24 * 60 * 60 * 1000
  },

  TUYADUMP: {
    name: 'tuyadump',
    description: 'Go tool to decode live Tuya LAN traffic (cid discovery for hub children)',
    repository: 'https://github.com/py60800/tuyadump',
    license: 'MIT',
    maintainer: 'py60800',
    notes: 'Credit only — cid ≠ cloud deviceId (localtuya PR#318 lesson)',
    lastChecked: '2026-09-21',
    updateInterval: 60 * 24 * 60 * 60 * 1000
  },

  GOTUYA: {
    name: 'GoTuya',
    description: 'Go LAN API (protocol 3.3) — confirms IP+deviceId+localKey triad',
    repository: 'https://github.com/Binozo/GoTuya',
    license: 'MIT',
    maintainer: 'Binozo',
    notes: 'Observe only — no Go runtime in Homey bundle',
    lastChecked: '2026-09-21',
    updateInterval: 60 * 24 * 60 * 60 * 1000
  },

  JOHAN_LIDL: {
    name: 'Lidl Smart Home (Homey)',
    description: 'Lidl/Silvercrest/Livarno Zigbee fork of Johan Tuya Zigbee',
    repository: 'https://github.com/JohanBendz/com.lidl',
    website: 'https://homey.app/a/com.lidl/',
    license: 'MIT',
    maintainer: 'Johan Bendz (@JohanBendz)',
    homeyAppId: 'com.lidl',
    homeyLive: '0.2.5',
    notes: 'Retail couples already unioned into our drivers — credit + thanks (P2657)',
    lastChecked: '2026-09-21',
    updateInterval: 30 * 24 * 60 * 60 * 1000
  },

  REBTOR_TUYA: {
    name: 'Tuya (nl.rebtor.tuya)',
    description: 'Early Homey TuyAPI local WiFi app',
    website: 'https://homey.app/a/nl.rebtor.tuya/',
    forum: 'https://community.homey.app/t/15811',
    license: 'unknown',
    maintainer: 'Rens Brandwijk',
    homeyAppId: 'nl.rebtor.tuya',
    homeyLive: '3.1.1',
    notes: 'Single TCP session lesson → WifiFixIt (P2657)',
    lastChecked: '2026-09-21',
    updateInterval: 60 * 24 * 60 * 60 * 1000
  },

  HESZEGI_LEDVANCE: {
    name: 'SMART+ Wifi (Ledvance)',
    description: 'Homey Ledvance/OSRAM WiFi local via tuyapi patterns',
    repository: 'https://github.com/heszegi/com.heszi.ledvance-wifi',
    website: 'https://homey.app/a/com.heszi.ledvance-wifi/',
    license: 'MIT',
    maintainer: 'Andras Heszegi',
    homeyAppId: 'com.heszi.ledvance-wifi',
    homeyLive: '1.1.1',
    notes: 'Pairing/tuyapi Homey patterns — complementary credit (P2657)',
    lastChecked: '2026-09-21',
    updateInterval: 60 * 24 * 60 * 60 * 1000
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNITY CONTRIBUTORS
// ═══════════════════════════════════════════════════════════════════════════

const COMMUNITY_CONTRIBUTORS = [
  // Zigbee2MQTT core team
  { name: 'Koen Kanters', github: 'Koenkk', role: 'Zigbee2MQTT creator & maintainer' },
  { name: 'Nerivec', github: 'Nerivec', role: 'Zigbee2MQTT contributor' },

  // Homey Tuya Local (WiFi/LAN) — complementary enrich credits
  { name: 'Andi Wirz', github: 'andiwirz', role: 'Tuya Local Homey app (MIT) — LAN protocol/DP ideas' },
  { name: 'Johan Bendz', github: 'JohanBendz', role: 'Tuya Zigbee + Lidl Homey apps (MIT)' },
  { name: 'Max Isom', github: 'codetheweb', role: 'TuyAPI + tuya-cli (MIT) — Node LAN runtime' },
  { name: 'Jason Cox', github: 'jasonacox', role: 'TinyTuya (MIT) — Python LAN / discovery' },
  { name: 'Jurgen Heine', github: 'gruijter', role: 'Tuya cloud Homey peer — local-first contrast' },
  { name: 'Rens Brandwijk', github: 'rebtor', role: 'Early Homey TuyAPI local (nl.rebtor.tuya)' },
  { name: 'Andras Heszegi', github: 'heszegi', role: 'Ledvance SMART+ Wifi Homey' },
  { name: 'Drenso', github: 'Drenso', role: 'com.tuya2 Homey cloud/Smart Life path' },
  { name: 'Arie J. Godschalk', github: 'qluster-it', role: 'Device Capabilities Homey companion (capability UX)' },
  { name: 'make-all', github: 'make-all', role: 'HA tuya-local — DP YAML + hub cid patterns' },
  { name: 'xZetsubou', github: 'xZetsubou', role: 'hass-localtuya fork — gateway sub-devices' },
  { name: 'lehanspb', github: 'lehanspb', role: 'tuya-mqtt — hub/sub-device cid topics' },
  { name: 'Vineet Choudhary', github: 'vineetchoudhary', role: 'tuya-local-key — QR local-key export' },

  // ZHA team
  { name: 'David Mulcahey', github: 'dmulcahey', role: 'ZHA creator' },
  { name: 'Alexei Chetroi', github: 'Adminiuga', role: 'zigpy maintainer' },
  { name: 'puddly', github: 'puddly', role: 'zigpy contributor' },

  // Database maintainers
  { name: 'Blakadder', github: 'blakadder', role: 'Zigbee device database' },

  // Community reporters
  { name: 'Community', github: 'various', role: 'Device testing and issue reports' }
];

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getSource(sourceId) {
  return SOURCES[sourceId] || null;
}

function getAllSources() {
  return Object.entries(SOURCES).map(([id, source]) => ({
    id,
    ...source
  }));
}

function getSourcesByUpdateInterval() {
  return getAllSources()
    .filter(s => s.updateInterval)
    .sort((a, b) => a.updateInterval - b.updateInterval);
}

function getContributors() {
  return COMMUNITY_CONTRIBUTORS;
}

function generateCreditsText() {
  let text = '═══════════════════════════════════════════════════════════════════════════\n';
  text += '  UNIVERSAL TUYA ZIGBEE - DATA SOURCES & CREDITS\n';
  text += '═══════════════════════════════════════════════════════════════════════════\n\n';

  for (const [id, source] of Object.entries(SOURCES)) {
    text += `📦 ${source.name}\n`;
    text += `   ${source.description}\n`;
    if (source.repository) text += `   Repository: ${source.repository}\n`;
    if (source.website) text += `   Website: ${source.website}\n`;
    text += `   License: ${source.license}\n`;
    if (source.maintainer) text += `   Maintainer: ${source.maintainer}\n`;
    if (source.contributors) text += `   Contributors: ${source.contributors.slice(0, 5).join(', ')}...\n`;
    text += '\n';
  }

  text += '═══════════════════════════════════════════════════════════════════════════\n';
  text += '  COMMUNITY CONTRIBUTORS\n';
  text += '═══════════════════════════════════════════════════════════════════════════\n\n';

  for (const contrib of COMMUNITY_CONTRIBUTORS) {
    text += `👤 ${contrib.name} (@${contrib.github}) - ${contrib.role}\n`;
  }

  text += '\n🙏 Thank you to all contributors who make this project possible!\n';

  return text;
}

function markSourceChecked(sourceId) {
  if (SOURCES[sourceId]) {
    SOURCES[sourceId].lastChecked = Date.now();
  }
}

function shouldUpdateSource(sourceId) {
  const source = SOURCES[sourceId];
  if (!source || !source.updateInterval) return false;
  if (!source.lastChecked) return true;
  return (Date.now() - source.lastChecked) > source.updateInterval;
}

module.exports = {
  SOURCES,
  COMMUNITY_CONTRIBUTORS,
  getSource,
  getAllSources,
  getSourcesByUpdateInterval,
  getContributors,
  generateCreditsText,
  markSourceChecked,
  shouldUpdateSource
};
