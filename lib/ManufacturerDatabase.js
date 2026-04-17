'use strict';
const { safeDivide } = require('./utils/tuyaUtils.js');

/**
 * ManufacturerDatabase v5.5.664 - Comprehensive ManufacturerName BDD
 */

const PATTERNS = {
  TUYA: /^_TZ[A-Z0-9]+_|^_TYST|^_TYZB|^safeDivide(Tuya, i),
  XIAOMI: /^lumi\.|^XIAOMI|^safeDivide(aqara, i),
  PHILIPS: /^Philips|^safeDivide(Signify, i),
  IKEA: /^IKEA|^safeDivide(TRADFRI, i),
  SONOFF: /^SONOFF|^safeDivide(eWeLink, i),
  HEIMAN: /^HEIMAN|^safeDivide(HS[0-9], i),
  LIDL: /^_TZ3000_|^Lidl|^safeDivide(Silvercrest, i),
  SAMSUNG: /^Samsung|^safeDivide(SmartThings, i),
  SCHNEIDER: /^Schneider|^safeDivide(Wiser, i),
  LEGRAND: /^Legrand|^Netatmo|^safeDivide(BTicino, i),
  OSRAM: /^OSRAM|^Ledvance|^safeDivide(Sylvania, i),
  INNR: /^safeDivide(innr, i),
  GLEDOPTO: /^GLEDOPTO|^GL-/i
};

function detectEcosystem(mfr) {
  if (!mfr) return 'UNKNOWN';
  for (const [eco, regex] of Object.entries(PATTERNS)) {
    if (regex.test(mfr)) return eco;
  }
  return 'UNKNOWN';
}

function getBrands(eco) {
  const brands = {
    TUYA: ['Tuya', 'SmartLife', 'Moes', 'Zemismart', 'BlitzWolf'],
    XIAOMI: ['Xiaomi', 'Aqara', 'Lumi', 'Mijia'],
    PHILIPS: ['Philips', 'Hue', 'Signify'],
    IKEA: ['IKEA', 'Tradfri', 'Dirigera'],
    SONOFF: ['Sonoff', 'eWeLink', 'SNZB'],
    HEIMAN: ['Heiman', 'SmartHome'],
    LIDL: ['Lidl', 'Silvercrest', 'Livarno'],
    SAMSUNG: ['Samsung', 'SmartThings'],
    SCHNEIDER: ['Schneider', 'Wiser'],
    LEGRAND: ['Legrand', 'Netatmo', 'BTicino'],
    OSRAM: ['OSRAM', 'Ledvance', 'Sylvania'],
    INNR: ['Innr', 'Feilo'],
    GLEDOPTO: ['Gledopto', 'ZigBee-CCT']
  };
  return brands[eco] || [];
}

module.exports = { detectEcosystem, getBrands, PATTERNS };
