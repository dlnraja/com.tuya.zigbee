import fs from 'fs';
import path from 'path';

const CAPABILITIES_MAP = {
  // Mapping des mots-clés vers les capacités
  switch: ['onoff'],
  light: ['onoff', 'dim'],
  dimmer: ['dim'],
  sensor: ['measure_temperature', 'measure_humidity'],
  motion: ['alarm_motion'],
  contact: ['alarm_contact'],
  thermostat: ['target_temperature', 'measure_temperature'],
  lock: ['locked'],
  fan: ['onoff', 'fan_speed'],
};

export function guessCapabilities(device) {
  const { name, category } = device;
  const capabilities = new Set();
  
  // Ajouter les capacités basées sur la catégorie
  if (category && CAPABILITIES_MAP[category]) {
    CAPABILITIES_MAP[category].forEach(cap => capabilities.add(cap));
  }
  
  // Ajouter les capacités basées sur le nom
  Object.keys(CAPABILITIES_MAP).forEach(keyword => {
    if (name.toLowerCase().includes(keyword)) {
      CAPABILITIES_MAP[keyword].forEach(cap => capabilities.add(cap));
    }
  });
  
  return Array.from(capabilities);
}

// Exemple d'utilisation
// const device = { name: 'Smart Light Switch', category: 'switch' };
// const capabilities = guessCapabilities(device);
// console.log(capabilities); // ['onoff', 'dim']
