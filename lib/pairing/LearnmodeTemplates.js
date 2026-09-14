'use strict';

/**
 * LearnmodeTemplates (P2498)
 *
 * WHY(P215): Athom owns Zigbee pair UI — our only pairing UX surface is
 * zigbee.learnmode.instruction (+ image). Class-aware copy mirrors Johan /
 * IKEA Tradfri patterns without inventing custom Zigbee pair views.
 */

const DEFAULT_IMAGE = '{{driverAssetsPath}}/icon.svg';

/** @type {Record<string, { en: string, fr: string, nl: string, de: string }>} */
const BY_CLASS = {
  sensor: {
    en: 'Press and hold the pairing button for 5 seconds until the LED flashes. Keep pressing every 2 seconds during pairing if the device is battery-powered.',
    fr: 'Maintenez le bouton d\'appairage 5 secondes jusqu\'à ce que la LED clignote. Sur pile, rappuyez toutes les 2 s pendant l\'appairage.',
    nl: 'Houd de paarknop 5 seconden ingedrukt tot de LED knippert. Bij batterij: druk elke 2 s tijdens het pairen.',
    de: 'Halten Sie die Kopplungstaste 5 Sekunden, bis die LED blinkt. Bei Batterie alle 2 s während des Pairings drücken.',
  },
  socket: {
    en: 'Turn the device on/off 3 times quickly, or hold the reset button until the LED flashes rapidly.',
    fr: 'Allumez/éteignez 3 fois rapidement, ou maintenez reset jusqu\'à clignotement rapide.',
    nl: 'Zet het apparaat 3× snel aan/uit, of houd reset vast tot snelle LED-knippering.',
    de: 'Gerät 3× schnell ein/aus, oder Reset halten bis die LED schnell blinkt.',
  },
  light: {
    en: 'Power-cycle the light 3–5 times until it flashes, or hold the reset button on the controller.',
    fr: 'Coupez/rétablissez l\'alim. 3–5 fois jusqu\'à clignotement, ou maintenez reset.',
    nl: 'Schakel de lamp 3–5× uit/aan tot knipperen, of houd reset vast.',
    de: 'Lampe 3–5× netzschalten bis Blinken, oder Reset halten.',
  },
  button: {
    en: 'Hold all buttons together (or the reset pinhole) for 5–10 seconds until the LED flashes.',
    fr: 'Maintenez tous les boutons (ou le trou reset) 5–10 s jusqu\'à clignotement.',
    nl: 'Houd alle knoppen (of reset) 5–10 s vast tot de LED knippert.',
    de: 'Alle Tasten (oder Reset) 5–10 s halten bis die LED blinkt.',
  },
  remote: {
    en: 'Hold the pairing button (often top or back) for 5–10 seconds until the LED flashes.',
    fr: 'Maintenez le bouton d\'appairage (souvent haut/arrière) 5–10 s jusqu\'à clignotement.',
    nl: 'Houd de paarknop (vaak boven/achter) 5–10 s vast tot knipperen.',
    de: 'Pairing-Taste (oft oben/hinten) 5–10 s halten bis Blinken.',
  },
  thermostat: {
    en: 'On the thermostat, open settings → Zigbee/Network → Pair, or hold the reset pin until the display shows pairing mode.',
    fr: 'Réglages → Zigbee/Réseau → Appairer, ou maintenez reset jusqu\'au mode appairage.',
    nl: 'Instellingen → Zigbee/Netwerk → Pairen, of reset tot pairmodus op display.',
    de: 'Einstellungen → Zigbee/Netz → Koppeln, oder Reset bis Pairing-Modus.',
  },
  windowcoverings: {
    en: 'Press the motor pairing button (or P2 twice) until the motor jogs / LED flashes, then start pairing in Homey.',
    fr: 'Bouton moteur (ou P2×2) jusqu\'à jog/LED, puis lancez l\'appairage Homey.',
    nl: 'Motor-paarknop (of P2×2) tot jog/LED, start daarna Homey-pairing.',
    de: 'Motor-Pairingtaste (oder P2×2) bis Ruck/LED, dann Homey-Pairing starten.',
  },
  heater: {
    en: 'Hold the thermostat/heater pairing button for 5 seconds until the LED flashes.',
    fr: 'Maintenez le bouton d\'appairage 5 s jusqu\'à clignotement.',
    nl: 'Houd de paarknop 5 s vast tot de LED knippert.',
    de: 'Kopplungstaste 5 s halten bis die LED blinkt.',
  },
  fan: {
    en: 'Hold the fan controller pairing button for 5 seconds until the LED flashes.',
    fr: 'Maintenez le bouton d\'appairage 5 s jusqu\'à clignotement.',
    nl: 'Houd de paarknop 5 s vast tot de LED knippert.',
    de: 'Kopplungstaste 5 s halten bis die LED blinkt.',
  },
  other: {
    en: 'Put the device in Zigbee pairing mode (usually hold reset/pairing 5 seconds until LED flashes).',
    fr: 'Mode appairage Zigbee (souvent reset/pair 5 s jusqu\'à LED clignotante).',
    nl: 'Zet het apparaat in Zigbee-pairmodus (meestal reset/pair 5 s tot LED knippert).',
    de: 'Gerät in Zigbee-Pairingmodus (meist Reset/Pair 5 s bis LED blinkt).',
  },
};

const BY_DRIVER_HINT = [
  { re: /water_leak|smoke|gas|contact|motion|presence|climate|soil|illuminance/i, key: 'sensor' },
  { re: /button_wireless|scene_switch|smart_knob|remote_/i, key: 'button' },
  { re: /curtain|blind|window|shutter/i, key: 'windowcoverings' },
  { re: /thermostat|trv|radiator/i, key: 'thermostat' },
  { re: /bulb|led_strip|light_|dimmer/i, key: 'light' },
  { re: /switch_|plug_|wall_switch|wall_dimmer|socket|usb_outlet|din_rail/i, key: 'socket' },
  { re: /valve_|irrigation/i, key: 'other' },
  { re: /ir_blaster|blaster/i, key: 'other' },
];

function resolveTemplateKey(driverId, deviceClass) {
  const id = String(driverId || '');
  for (const h of BY_DRIVER_HINT) {
    if (h.re.test(id)) return h.key;
  }
  const cls = String(deviceClass || 'other').toLowerCase();
  if (BY_CLASS[cls]) return cls;
  if (cls === 'garagedoor') return 'other';
  return 'other';
}

/**
 * @param {string} driverId
 * @param {string} [deviceClass]
 * @returns {{ image: string, instruction: Record<string,string> }}
 */
function buildLearnmode(driverId, deviceClass) {
  const key = resolveTemplateKey(driverId, deviceClass);
  const instruction = { ...BY_CLASS[key] };
  return {
    image: DEFAULT_IMAGE,
    instruction,
  };
}

module.exports = {
  DEFAULT_IMAGE,
  BY_CLASS,
  resolveTemplateKey,
  buildLearnmode,
};
