'use strict';
// safeMultiply loaded lazily to avoid circular dependency

/**
 * SourceCredits.js - Attribution des sources et contributeurs
 *
 * Ce fichier liste toutes les sources de donnÃ©es utilisÃ©es pour enrichir
 * la base de donnÃ©es de l'application Universal Tuya Zigbee.
 *
 * IMPORTANT: Respecter les licences de chaque source
 */

const SOURCES = {

  // 
  // ZIGBEE2MQTT - Koenkk
  // 

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
    updateInterval:(typeof safeMultiply==="function"?safeMultiply:((a,b)=>a*b))(24, 60) * 60 * 1000 // 24 hours
  },

  // 
  // ZIGBEE-OTA - Koenkk
  // 

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
    updateInterval:(typeof safeMultiply==="function"?safeMultiply:((a,b)=>a*b))(6, 60) * 60 * 1000 // 6 hours
  },

  // 
  // ZHA DEVICE HANDLERS - zigpy
  // 

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
    updateInterval:(typeof safeMultiply==="function"?safeMultiply:((a,b)=>a*b))(24, 60) * 60 * 1000
  },

  // 
  // BLAKADDER ZIGBEE DATABASE
  // 

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
    updateInterval:(typeof safeMultiply==="function"?safeMultiply:((a,b)=>a*b))(24, 60) * 60 * 1000
  },

  // 
  // TUYA DEVELOPER DOCUMENTATION
  // 

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
    updateInterval:(typeof safeMultiply==="function"?safeMultiply:((a,b)=>a*b))(7, 24) * 60 * 60 * 1000 // Weekly
  },

  // 
  // FAIRECASOIMEME ZIGBEE-OTA (Alternative)
  // 

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
    updateInterval:(typeof safeMultiply==="function"?safeMultiply:((a,b)=>a*b))(12, 60) * 60 * 1000
  },

  // 
  // DECONZ / PHOSCON
  // 

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
    updateInterval:(typeof safeMultiply==="function"?safeMultiply:((a,b)=>a*b))(24, 60) * 60 * 1000
  },

  // 
  // ZIGBEE ALLIANCE / CSA
  // 

  ZIGBEE_ALLIANCE: {
    name: 'Zigbee Alliance/CSA',
    description: 'Official Zigbee Cluster Library specifications',
    website: 'https://csa-iot.org/developer-resource/specifications-download-request/',
    license: 'CSA Membership',
    maintainer: 'Connectivity Standards Alliance',
    notes: 'ZCL specifications for cluster IDs and attributes'
  }
};

// 
// COMMUNITY CONTRIBUTORS
// 

const COMMUNITY_CONTRIBUTORS = [
  // Zigbee2MQTT core team
  { name: 'Koen Kanters', github: 'Koenkk', role: 'Zigbee2MQTT creator & maintainer' },
  { name: 'Nerivec', github: 'Nerivec', role: 'Zigbee2MQTT contributor' },

  // ZHA team
  { name: 'David Mulcahey', github: 'dmulcahey', role: 'ZHA creator' },
  { name: 'Alexei Chetroi', github: 'Adminiuga', role: 'zigpy maintainer' },
  { name: 'puddly', github: 'puddly', role: 'zigpy contributor' },

  // Database maintainers
  { name: 'Blakadder', github: 'blakadder', role: 'Zigbee device database' },

  // Community reporters
  { name: 'Community', github: 'various', role: 'Device testing and issue reports' }
];

// 
// UTILITY FUNCTIONS
// 

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
  let text = '\n';
  text += '  UNIVERSAL TUYA ZIGBEE - DATA SOURCES & CREDITS\n';
  text += '\n\n';

  for (const [id, source] of Object.entries(SOURCES)) {
    text += ` ${source.name}\n`;
    text += `   ${source.description}\n`;
    if (source.repository) text += `   Repository: ${source.repository}\n`;
    if (source.website) text += `   Website: ${source.website}\n`;
    text += `   License: ${source.license}\n`;
    if (source.maintainer) text += `   Maintainer: ${source.maintainer}\n`;
    if (source.contributors) text += `   Contributors: ${source.contributors.slice(0, 5).join(', ')}...\n`;
    text += '\n';
  }

  text += '\n';
  text += '  COMMUNITY CONTRIBUTORS\n';
  text += '\n\n';

  for (const contrib of COMMUNITY_CONTRIBUTORS) {
    text += ` ${contrib.name} (@${contrib.github}) - ${contrib.role}\n`;
  }

  text += '\n Thank you to all contributors who make this project possible!\n';

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
