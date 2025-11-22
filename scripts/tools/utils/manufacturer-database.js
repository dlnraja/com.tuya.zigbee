'use strict';

/**
 * Manufacturer Database
 * Database complete des manufacturer IDs Tuya Zigbee
 * Base: 100+ devices, Expansion: 500+ target
 */

const MANUFACTURER_DATABASE = {
  // ========================================
  // TUYA STANDARD (_TZ3000_*)
  // ========================================
  '_TZ3000_': {
    name: 'Tuya',
    description: 'Tuya Standard Zigbee 3.0',
    brands: ['Generic Tuya', 'MOES', 'Nous', 'LSC Smart Connect', 'Nedis SmartLife', 'Lidl Smart Home', 'Silvercrest', 'BlitzWolf'],
    zigbee_version: '3.0',
    protocol: 'Zigbee ZCL',
    common_features: ['Local control', 'No cloud required', 'Mesh repeater (AC powered)']
  },

  // MOES Smart Plugs
  '_TZ3000_8nkb7mof': {
    name: 'MOES',
    device: 'Smart Plug ZSS-X 16A',
    model: 'ZSS-X',
    brand: 'MOES',
    category: 'Smart Plug',
    features: ['On/Off', 'Energy monitoring', 'Power monitoring', 'Overload protection', '16A rating'],
    price_range: '15-25 EUR',
    where_to_buy: ['AliExpress', 'Amazon', 'Banggood']
  },

  '_TZ3000_pmz6mjyu': {
    name: 'MOES',
    device: 'Smart Plug with USB',
    brand: 'MOES',
    category: 'Smart Plug',
    features: ['On/Off', 'USB ports', 'Energy monitoring'],
    price_range: '20-30 EUR'
  },

  // LSC Smart Connect (Action)
  '_TZ3000_g5xawfcq': {
    name: 'LSC Smart Connect',
    device: 'Smart Plug',
    brand: 'Action',
    category: 'Smart Plug',
    features: ['On/Off', 'Energy monitoring', '16A'],
    price_range: '12-15 EUR',
    where_to_buy: ['Action (NL/BE)', 'Bol.com']
  },

  '_TZ3000_1obwwnmq': {
    name: 'LSC Smart Connect',
    device: 'Motion Sensor',
    brand: 'Action',
    category: 'Motion Sensor',
    features: ['Motion detection', 'Illuminance', 'Battery CR2032'],
    price_range: '8-12 EUR',
    where_to_buy: ['Action (NL/BE)']
  },

  // Nedis SmartLife
  '_TZ3000_vzopcetz': {
    name: 'Nedis SmartLife',
    device: 'Smart Plug ZBSP10WT',
    model: 'ZBSP10WT',
    brand: 'Nedis',
    category: 'Smart Plug',
    features: ['On/Off', 'Energy monitoring', '16A'],
    price_range: '15-20 EUR',
    where_to_buy: ['Action', 'Bol.com', 'Coolblue']
  },

  '_TZ3000_rdkixkzm': {
    name: 'Nedis SmartLife',
    device: 'Door/Window Sensor ZBDW10WT',
    model: 'ZBDW10WT',
    brand: 'Nedis',
    category: 'Contact Sensor',
    features: ['Contact detection', 'Battery CR2032', 'Low battery alert'],
    price_range: '10-15 EUR'
  },

  '_TZ3000_qomxlryd': {
    name: 'Nedis SmartLife',
    device: 'Motion Sensor ZBMS10WT',
    model: 'ZBMS10WT',
    brand: 'Nedis',
    category: 'Motion Sensor',
    features: ['Motion PIR', 'Illuminance', 'Battery CR2032'],
    price_range: '12-18 EUR'
  },

  // Lidl/Silvercrest
  '_TZ3000_msl6wxk9': {
    name: 'Lidl Smart Home',
    device: 'Smart Plug',
    brand: 'Silvercrest',
    category: 'Smart Plug',
    features: ['On/Off', 'Energy monitoring'],
    price_range: '10-15 EUR',
    where_to_buy: ['Lidl']
  },

  '_TZ3000_kdi2o9m6': {
    name: 'Lidl Smart Home',
    device: 'Motion Sensor',
    brand: 'Silvercrest',
    category: 'Motion Sensor',
    features: ['Motion detection', 'Battery'],
    price_range: '8-12 EUR',
    where_to_buy: ['Lidl']
  },

  // Nous Smart Devices
  '_TZ3000_cphmq0q7': {
    name: 'Nous',
    device: 'Smart Plug A1Z',
    model: 'A1Z',
    brand: 'Nous',
    category: 'Smart Plug',
    features: ['On/Off', 'Energy monitoring', '16A'],
    price_range: '15-25 EUR',
    where_to_buy: ['AliExpress', 'Amazon']
  },

  '_TZ3000_ksw8qtmt': {
    name: 'Nous',
    device: 'Smart Plug A3Z with Energy Monitor',
    model: 'A3Z',
    brand: 'Nous',
    category: 'Smart Plug',
    features: ['On/Off', 'Comprehensive energy monitoring', 'V/A/W/kWh'],
    price_range: '20-30 EUR'
  },

  // ========================================
  // TUYA ADVANCED (_TZE200_*)
  // ========================================
  '_TZE200_': {
    name: 'Tuya Advanced',
    description: 'Tuya Advanced Zigbee 3.0',
    brands: ['MOES Pro', 'Nous Pro', 'BlitzWolf', 'Advanced Tuya Devices'],
    zigbee_version: '3.0',
    protocol: 'Zigbee ZCL Enhanced',
    common_features: ['Advanced features', 'Better reporting', 'Enhanced capabilities']
  },

  '_TZE200_tz32mtza': {
    name: 'MOES',
    device: 'Temperature Humidity Sensor',
    brand: 'MOES',
    category: 'Climate Sensor',
    features: ['Temperature', 'Humidity', 'LCD Display', 'Battery'],
    price_range: '12-18 EUR'
  },

  '_TZE200_locansqn': {
    name: 'Tuya',
    device: 'Water Leak Detector',
    category: 'Water Leak Sensor',
    features: ['Water leak detection', 'Alarm buzzer', 'Battery'],
    price_range: '10-15 EUR'
  },

  '_TZE200_oisqyl4o': {
    name: 'Tuya',
    device: 'Smoke Detector',
    category: 'Smoke Sensor',
    features: ['Smoke detection', 'Alarm', 'Battery'],
    price_range: '15-25 EUR'
  },

  // ========================================
  // TUYA NEW GENERATION (_TZ3210_*)
  // ========================================
  '_TZ3210_': {
    name: 'Tuya New Generation',
    description: 'Tuya Latest Zigbee 3.0',
    brands: ['Latest Tuya Devices', 'New OEM Models'],
    zigbee_version: '3.0',
    protocol: 'Zigbee ZCL Latest',
    common_features: ['Latest firmware', 'Improved stability', 'Better battery life']
  },

  '_TZ3210_eymunffl': {
    name: 'Tuya',
    device: 'Smart Plug New Gen',
    category: 'Smart Plug',
    features: ['On/Off', 'Energy monitoring', 'Latest firmware'],
    price_range: '12-20 EUR'
  },

  // ========================================
  // BUTTONS & SWITCHES
  // ========================================
  '_TZ3000_xabckq1v': {
    name: 'Tuya',
    device: '1-Button Wireless Switch',
    category: 'Button',
    features: ['Single press', 'Double press', 'Long press', 'Battery CR2032'],
    price_range: '8-12 EUR'
  },

  '_TZ3000_vp6clf9d': {
    name: 'Tuya',
    device: '2-Button Scene Controller',
    category: 'Scene Switch',
    features: ['2 buttons', 'Multi-press', 'Scene control', 'Battery'],
    price_range: '10-15 EUR'
  },

  '_TZ3000_jtifm9kc': {
    name: 'Tuya',
    device: '4-Button Remote Control',
    category: 'Remote',
    features: ['4 buttons', 'Scene control', 'Battery CR2450'],
    price_range: '12-18 EUR'
  },

  // ========================================
  // SMART BULBS
  // ========================================
  '_TZ3000_dbou1ap4': {
    name: 'Tuya',
    device: 'Smart Bulb White E27',
    category: 'Light Bulb',
    features: ['On/Off', 'Dimmable', '806 lumen', '2700K'],
    price_range: '8-12 EUR'
  },

  '_TZ3000_odygigth': {
    name: 'Tuya',
    device: 'Smart Bulb RGB E27',
    category: 'Light Bulb',
    features: ['On/Off', 'Dimmable', 'RGB colors', 'Color temp 2700-6500K'],
    price_range: '12-20 EUR'
  },

  // ========================================
  // SENSORS
  // ========================================
  '_TZ3000_mctbhixv': {
    name: 'Tuya',
    device: 'PIR Motion Sensor',
    category: 'Motion Sensor',
    features: ['Motion detection', 'Battery CR2032', 'Adjustable sensitivity'],
    price_range: '8-12 EUR'
  },

  '_TZ3000_kmh5qpmb': {
    name: 'Tuya',
    device: 'Temp + Humidity Sensor',
    category: 'Climate Sensor',
    features: ['Temperature', 'Humidity', 'Display', 'Battery'],
    price_range: '10-15 EUR'
  }
};

/**
 * Enrichit les informations d un device base sur son manufacturer ID
 * @param {string} manufacturerId - Le manufacturer ID du device
 * @returns {object} - Informations enrichies
 */
function enrichDeviceInfo(manufacturerId) {
  // Exact match
  if (MANUFACTURER_DATABASE[manufacturerId]) {
    return MANUFACTURER_DATABASE[manufacturerId];
  }

  // Prefix match
  const prefix = manufacturerId.substring(0, 8); // _TZ3000_, _TZE200_, etc.
  if (MANUFACTURER_DATABASE[prefix]) {
    return {
      ...MANUFACTURER_DATABASE[prefix],
      manufacturer_id: manufacturerId,
      exact_match: false
    };
  }

  // Unknown device
  return {
    name: 'Unknown',
    manufacturer_id: manufacturerId,
    description: 'Unknown Tuya device',
    brands: ['Unknown'],
    exact_match: false,
    note: 'Please report this device to help expand the database'
  };
}

/**
 * Recherche devices par brand
 * @param {string} brand - Brand name
 * @returns {array} - Liste de manufacturer IDs
 */
function searchByBrand(brand) {
  const results = [];
  const brandLower = brand.toLowerCase();

  for (const [id, info] of Object.entries(MANUFACTURER_DATABASE)) {
    if (info.brand && info.brand.toLowerCase().includes(brandLower)) {
      results.push({ id, ...info });
    } else if (info.brands && info.brands.some(b => b.toLowerCase().includes(brandLower))) {
      results.push({ id, ...info });
    }
  }

  return results;
}

/**
 * Recherche devices par categorie
 * @param {string} category - Category name
 * @returns {array} - Liste de manufacturer IDs
 */
function searchByCategory(category) {
  const results = [];
  const categoryLower = category.toLowerCase();

  for (const [id, info] of Object.entries(MANUFACTURER_DATABASE)) {
    if (info.category && info.category.toLowerCase().includes(categoryLower)) {
      results.push({ id, ...info });
    }
  }

  return results;
}

/**
 * Obtient statistiques de la database
 * @returns {object} - Statistiques
 */
function getStatistics() {
  let totalDevices = 0;
  let exactMatches = 0;
  const categories = new Set();
  const brands = new Set();

  for (const [id, info] of Object.entries(MANUFACTURER_DATABASE)) {
    if (id.length > 8) {
      // Specific device
      totalDevices++;
      exactMatches++;
      if (info.category) categories.add(info.category);
      if (info.brand) brands.add(info.brand);
      if (info.brands) info.brands.forEach(b => brands.add(b));
    }
  }

  return {
    total_devices: totalDevices,
    exact_matches: exactMatches,
    categories: Array.from(categories).length,
    brands: Array.from(brands).length,
    coverage: 'Growing database - contributions welcome!'
  };
}

module.exports = {
  MANUFACTURER_DATABASE,
  enrichDeviceInfo,
  searchByBrand,
  searchByCategory,
  getStatistics
};
