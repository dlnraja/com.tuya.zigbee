'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// DriverConsequenceTiering.js — Adaptation du consequence_class de Polos
// Classifie chaque driver Tuya par niveau de conséquence pour tiering
// d'oversight (validation plus stricte pour les devices à haut risque).
// ═══════════════════════════════════════════════════════════════════════════

// Niveaux de conséquence (inspiré Polos : read → docs → write → comms → exec)
const CONSEQUENCE_CLASSES = {
  READ: 'read',                    // Sensors, battery, temperature (lecture seule)
  WRITE_INTERNAL: 'write-internal', // Switches, dimmers (contrôle local)
  COMMS: 'comms',                  // Flow triggers, notifications
  EXTERNAL_WRITE: 'external-write', // WiFi devices, cloud API
  CODE_EXEC: 'code-exec',          // OTA updates, firmware
  FINANCIAL: 'financial',          // Energy meters with tariff
};

// Mapping driver → consequence_class basé sur le type de device
const DRIVER_TIER_MAP = {
  // READ : capteurs (lecture seule, aucun risque)
  sensor_contact: 'read', sensor_motion: 'read', sensor_presence: 'read',
  climate_sensor: 'read', motion_sensor: 'read', presence_sensor: 'read',
  water_leak_sensor: 'read', soil_sensor: 'read', smoke_sensor: 'read',
  gas_sensor: 'read', vibration_sensor: 'read', light_sensor: 'read',
  temp_humidity: 'read', weather_station: 'read',

  // READ : boutons (event-only, pas d'état modifiable)
  button_wireless: 'read', scene_switch: 'read', wall_remote: 'read',
  smart_button: 'read', smart_knob: 'read', smart_remote: 'read',

  // WRITE_INTERNAL : switches, dimmers (contrôle local réversible)
  switch: 'write-internal', wall_switch: 'write-internal',
  dimmer: 'write-internal', wall_dimmer: 'write-internal',

  // EXTERNAL_WRITE : devices WiFi (contrôle via cloud/API externe)
  wifi_switch: 'external-write', wifi_light: 'external-write',
  wifi_plug: 'external-write', wifi_dimmer: 'external-write',

  // CODE_EXEC : OTA, firmware updates
  ota_update: 'code-exec',

  // FINANCIAL : energy meters avec tariff
  energy_meter: 'financial', plug_energy: 'financial',
};

/**
 * Détermine le consequence_class d'un driver.
 * @param {string} driverId - ID du driver (ex: 'switch_1gang')
 * @returns {string} consequence_class
 */
function getConsequenceClass(driverId) {
  if (!driverId) return CONSEQUENCE_CLASSES.READ;

  // Match exact d'abord
  if (DRIVER_TIER_MAP[driverId]) return DRIVER_TIER_MAP[driverId];

  // Match par préfixe
  if (driverId.startsWith('sensor') || driverId.startsWith('climate')
      || driverId.startsWith('motion') || driverId.startsWith('presence')
      || driverId.startsWith('water_leak') || driverId.startsWith('smoke')
      || driverId.startsWith('gas_') || driverId.startsWith('soil')
      || driverId.startsWith('temp_') || driverId.startsWith('weather')) {
    return CONSEQUENCE_CLASSES.READ;
  }
  if (driverId.startsWith('button') || driverId.startsWith('scene_switch')
      || driverId.startsWith('wall_remote') || driverId.startsWith('smart_button')
      || driverId.startsWith('smart_knob') || driverId.startsWith('smart_remote')) {
    return CONSEQUENCE_CLASSES.READ;
  }
  if (driverId.startsWith('switch') || driverId.startsWith('wall_switch')
      || driverId.startsWith('dimmer') || driverId.startsWith('wall_dimmer')
      || driverId.startsWith('curtain') || driverId.startsWith('valve')) {
    return CONSEQUENCE_CLASSES.WRITE_INTERNAL;
  }
  if (driverId.startsWith('wifi_')) return CONSEQUENCE_CLASSES.EXTERNAL_WRITE;
  if (driverId.startsWith('plug_energy') || driverId.startsWith('energy_meter')) {
    return CONSEQUENCE_CLASSES.FINANCIAL;
  }

  return CONSEQUENCE_CLASSES.READ; // default safe
}

/**
 * Détermine le niveau d'oversight requis (inspiré Polos gating).
 * @param {string} consequenceClass
 * @returns {{ monitor: boolean, qc: boolean, security: boolean }}
 */
function getOversightLevel(consequenceClass) {
  switch (consequenceClass) {
    case CONSEQUENCE_CLASSES.READ:
      return { monitor: false, qc: false, security: false };
    case CONSEQUENCE_CLASSES.WRITE_INTERNAL:
      return { monitor: true, qc: false, security: false };
    case CONSEQUENCE_CLASSES.COMMS:
      return { monitor: true, qc: true, security: false };
    case CONSEQUENCE_CLASSES.EXTERNAL_WRITE:
      return { monitor: true, qc: true, security: true };
    case CONSEQUENCE_CLASSES.CODE_EXEC:
      return { monitor: true, qc: true, security: true };
    case CONSEQUENCE_CLASSES.FINANCIAL:
      return { monitor: true, qc: true, security: true };
    default:
      return { monitor: true, qc: true, security: true }; // fail-closed
  }
}

module.exports = {
  CONSEQUENCE_CLASSES,
  DRIVER_TIER_MAP,
  getConsequenceClass,
  getOversightLevel,
};
