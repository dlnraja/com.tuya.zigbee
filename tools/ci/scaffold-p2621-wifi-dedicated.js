'use strict';
/**
 * P2621 — one-shot scaffold helper (MASTER_ONLY dedicated wifi drivers).
 * Safe to re-run: overwrites compose only when --force.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const heater = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'drivers/wifi_heater/driver.compose.json'), 'utf8')
);

const shared = {
  pair: heater.pair,
  repair: heater.repair,
  settings: heater.settings,
  platforms: heater.platforms,
  connectivity: heater.connectivity,
  maintenanceActions: (heater.maintenanceActions || []).filter((a) => a.id !== 'ota_check'),
  version: '1.0.0',
  ui: { quickAction: 'onoff' },
  discovery: 'tuya_wifi',
};

const DRIVERS = [
  {
    id: 'wifi_heat_pump',
    name: {
      en: 'WiFi Heat Pump (Tuya Local)',
      fr: 'Pompe à chaleur WiFi (Tuya Local)',
      nl: 'WiFi Warmtepomp (Tuya Lokaal)',
      de: 'WiFi Wärmepumpe (Tuya Lokal)',
    },
    class: 'heater',
    capabilities: ['onoff', 'target_temperature', 'measure_temperature', 'alarm_generic', 'button.1'],
    capabilitiesOptions: {
      target_temperature: { min: 5, max: 45, step: 1 },
      'button.1': {
        title: { en: 'Button 1', fr: 'Bouton 1' },
        maintenanceAction: true,
        getable: false,
        setable: false,
      },
    },
  },
  {
    id: 'wifi_kettle',
    name: {
      en: 'WiFi Smart Kettle (Tuya Local)',
      fr: 'Bouilloire WiFi (Tuya Local)',
      nl: 'WiFi Waterkoker (Tuya Lokaal)',
      de: 'WiFi Wasserkocher (Tuya Lokal)',
    },
    class: 'kettle',
    capabilities: ['onoff', 'target_temperature', 'measure_temperature', 'alarm_generic', 'button.1'],
    capabilitiesOptions: {
      target_temperature: { min: 40, max: 100, step: 1 },
      'button.1': {
        title: { en: 'Button 1', fr: 'Bouton 1' },
        maintenanceAction: true,
        getable: false,
        setable: false,
      },
    },
  },
  {
    id: 'wifi_ev_charger',
    name: {
      en: 'WiFi EV Charger (Tuya Local)',
      fr: 'Borne EV WiFi (Tuya Local)',
      nl: 'WiFi EV-lader (Tuya Lokaal)',
      de: 'WiFi EV-Ladegerät (Tuya Lokal)',
    },
    class: 'other',
    capabilities: [
      'onoff',
      'measure_power',
      'meter_power',
      'measure_current',
      'measure_voltage',
      'measure_temperature',
      'alarm_generic',
      'button.1',
    ],
    capabilitiesOptions: {
      'button.1': {
        title: { en: 'Button 1', fr: 'Bouton 1' },
        maintenanceAction: true,
        getable: false,
        setable: false,
      },
    },
  },
];

for (const d of DRIVERS) {
  const dir = path.join(ROOT, 'drivers', d.id);
  fs.mkdirSync(path.join(dir, 'assets', 'images'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'pair'), { recursive: true });
  const compose = {
    id: d.id,
    name: d.name,
    class: d.class,
    capabilities: d.capabilities,
    capabilitiesOptions: d.capabilitiesOptions,
    ...shared,
    images: {
      small: `/drivers/${d.id}/assets/images/small.png`,
      large: `/drivers/${d.id}/assets/images/large.png`,
    },
  };
  fs.writeFileSync(path.join(dir, 'driver.compose.json'), `${JSON.stringify(compose, null, 2)}\n`);
  console.log('wrote', d.id);
}
