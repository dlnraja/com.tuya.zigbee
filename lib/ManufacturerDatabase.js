'use strict';

/**
 * ManufacturerDatabase v5.5.664 - Comprehensive ManufacturerName BDD
 */

const PATTERNS = {
  TUYA: /^_TZ[A-Z0-9]+_|^_TYST|^_TYZB|^Tuya/i,
  XIAOMI: /^lumi\.|^XIAOMI|^aqara/i,
  PHILIPS: /^Philips|^Signify/i,
  IKEA: /^IKEA|^TRADFRI/i,
  SONOFF: /^SONOFF|^eWeLink/i,
  HEIMAN: /^HEIMAN|^HS[0-9]/i,
  LIDL: /^_TZ3000_|^Lidl|^Silvercrest/i,
  SAMSUNG: /^Samsung|^SmartThings/i,
  SCHNEIDER: /^Schneider|^Wiser/i,
  LEGRAND: /^Legrand|^Netatmo|^BTicino/i,
  OSRAM: /^OSRAM|^Ledvance|^Sylvania/i,
  INNR: /^innr/i,
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
