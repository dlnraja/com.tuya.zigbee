#!/usr/bin/env node
'use strict';

/**
 * COMPLETE FLOW CARD TEMPLATES
 * Templates complets pour tous les types de flow cards
 */

const COMPLETE_TEMPLATES = {
  // ============ TRIGGERS ============
  
  // Power & Energy
  turned_on: (dn) => ({
    title: { en: 'Turned on', fr: 'Allumé' },
    hint: { en: 'When turned on', fr: 'Quand allumé' },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  turned_off: (dn) => ({
    title: { en: 'Turned off', fr: 'Éteint' },
    hint: { en: 'When turned off', fr: 'Quand éteint' },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  power_above: (dn) => ({
    title: { en: 'Power above', fr: 'Puissance supérieure' },
    titleFormatted: { en: 'Power above [[threshold]] W', fr: 'Puissance > [[threshold]] W' },
    tokens: [{ name: 'power', type: 'number', title: { en: 'Power (W)', fr: 'Puissance (W)' }, example: 100 }],
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${dn}` },
      { type: 'number', name: 'threshold', placeholder: { en: 'Watts', fr: 'Watts' }, min: 0, max: 5000 }
    ]
  }),
  
  power_below: (dn) => ({
    title: { en: 'Power below', fr: 'Puissance inférieure' },
    titleFormatted: { en: 'Power below [[threshold]] W', fr: 'Puissance < [[threshold]] W' },
    tokens: [{ name: 'power', type: 'number', title: { en: 'Power (W)', fr: 'Puissance (W)' }, example: 50 }],
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${dn}` },
      { type: 'number', name: 'threshold', placeholder: { en: 'Watts', fr: 'Watts' }, min: 0, max: 5000 }
    ]
  }),
  
  power_spike: (dn) => ({
    title: { en: 'Power spike detected', fr: 'Pic de puissance détecté' },
    hint: { en: 'When sudden power increase', fr: 'Quand augmentation soudaine' },
    tokens: [
      { name: 'power', type: 'number', title: { en: 'Power (W)', fr: 'Puissance (W)' } },
      { name: 'increase', type: 'number', title: { en: 'Increase (%)', fr: 'Augmentation (%)' } }
    ],
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  energy_threshold: (dn) => ({
    title: { en: 'Energy threshold', fr: 'Seuil d\'énergie' },
    titleFormatted: { en: 'Energy exceeds [[threshold]] kWh', fr: 'Énergie dépasse [[threshold]] kWh' },
    tokens: [{ name: 'energy', type: 'number', title: { en: 'Energy (kWh)', fr: 'Énergie (kWh)' } }],
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${dn}` },
      { type: 'number', name: 'threshold', placeholder: { en: 'kWh', fr: 'kWh' }, min: 0, max: 10000, step: 0.1 }
    ]
  }),
  
  // Light
  brightness_changed: (dn) => ({
    title: { en: 'Brightness changed', fr: 'Luminosité changée' },
    tokens: [{ name: 'brightness', type: 'number', title: { en: 'Brightness (%)', fr: 'Luminosité (%)' }, example: 50 }],
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  color_changed: (dn) => ({
    title: { en: 'Color changed', fr: 'Couleur changée' },
    tokens: [
      { name: 'hue', type: 'number', title: { en: 'Hue', fr: 'Teinte' }, example: 180 },
      { name: 'saturation', type: 'number', title: { en: 'Saturation', fr: 'Saturation' }, example: 100 }
    ],
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  // Motion
  motion_detected: (dn) => ({
    title: { en: 'Motion detected', fr: 'Mouvement détecté' },
    hint: { en: 'When motion detected', fr: 'Quand mouvement détecté' },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  no_motion: (dn) => ({
    title: { en: 'No motion', fr: 'Pas de mouvement' },
    titleFormatted: { en: 'No motion for [[timeout]] minutes', fr: 'Pas de mouvement depuis [[timeout]] min' },
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${dn}` },
      { type: 'number', name: 'timeout', placeholder: { en: 'Minutes', fr: 'Minutes' }, min: 1, max: 60, value: 5 }
    ]
  }),
  
  motion_luminance_combo: (dn) => ({
    title: { en: 'Motion + low light', fr: 'Mouvement + faible lumière' },
    hint: { en: 'Motion detected AND luminance below threshold', fr: 'Mouvement ET luminosité faible' },
    tokens: [
      { name: 'luminance', type: 'number', title: { en: 'Luminance (lux)', fr: 'Luminosité (lux)' } }
    ],
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  // Contact
  opened: (dn) => ({
    title: { en: 'Opened', fr: 'Ouvert' },
    hint: { en: 'When contact opened', fr: 'Quand contact ouvert' },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  closed: (dn) => ({
    title: { en: 'Closed', fr: 'Fermé' },
    hint: { en: 'When contact closed', fr: 'Quand contact fermé' },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  left_open: (dn) => ({
    title: { en: 'Left open', fr: 'Resté ouvert' },
    titleFormatted: { en: 'Left open for [[duration]] minutes', fr: 'Ouvert depuis [[duration]] min' },
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${dn}` },
      { type: 'number', name: 'duration', placeholder: { en: 'Minutes', fr: 'Minutes' }, min: 1, max: 1440, value: 10 }
    ]
  }),
  
  vibration: (dn) => ({
    title: { en: 'Vibration detected', fr: 'Vibration détectée' },
    hint: { en: 'When vibration detected', fr: 'Quand vibration détectée' },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  // ============ CONDITIONS ============
  
  is_on: (dn) => ({
    title: { en: 'Is !{{on|off}}', fr: 'Est !{{allumé|éteint}}' },
    hint: { en: 'Check if on', fr: 'Vérifie si allumé' },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  brightness_above: (dn) => ({
    title: { en: 'Brightness !{{above|below}}', fr: 'Luminosité !{{au-dessus|en-dessous}}' },
    titleFormatted: { en: 'Brightness !{{above|below}} [[level]]%', fr: 'Luminosité !{{>|<}} [[level]]%' },
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${dn}` },
      { type: 'range', name: 'level', min: 0, max: 100, step: 5, value: 50, label: { en: 'Level (%)', fr: 'Niveau (%)' } }
    ]
  }),
  
  power_in_range: (dn) => ({
    title: { en: 'Power in range', fr: 'Puissance dans plage' },
    titleFormatted: { en: 'Power between [[min]] and [[max]] W', fr: 'Puissance entre [[min]] et [[max]] W' },
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${dn}` },
      { type: 'number', name: 'min', placeholder: { en: 'Min (W)', fr: 'Min (W)' }, min: 0 },
      { type: 'number', name: 'max', placeholder: { en: 'Max (W)', fr: 'Max (W)' }, min: 0 }
    ]
  }),
  
  color_equals: (dn) => ({
    title: { en: 'Color !{{equals|does not equal}}', fr: 'Couleur !{{égale|différente}}' },
    titleFormatted: { en: 'Color !{{equals|≠}} [[color]]', fr: 'Couleur !{{=|≠}} [[color]]' },
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${dn}` },
      { type: 'dropdown', name: 'color', values: [
        { id: 'red', label: { en: 'Red', fr: 'Rouge' } },
        { id: 'green', label: { en: 'Green', fr: 'Vert' } },
        { id: 'blue', label: { en: 'Blue', fr: 'Bleu' } },
        { id: 'white', label: { en: 'White', fr: 'Blanc' } },
        { id: 'yellow', label: { en: 'Yellow', fr: 'Jaune' } }
      ]}
    ]
  }),
  
  motion_in_last_minutes: (dn) => ({
    title: { en: 'Motion in last minutes', fr: 'Mouvement récent' },
    titleFormatted: { en: 'Motion in last [[minutes]] min', fr: 'Mouvement < [[minutes]] min' },
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${dn}` },
      { type: 'number', name: 'minutes', placeholder: { en: 'Minutes', fr: 'Minutes' }, min: 1, max: 60, value: 5 }
    ]
  }),
  
  luminance_below: (dn) => ({
    title: { en: 'Luminance !{{below|above}}', fr: 'Luminosité !{{<|>}}' },
    titleFormatted: { en: 'Luminance !{{<|>}} [[threshold]] lux', fr: 'Luminosité !{{<|>}} [[threshold]] lux' },
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${dn}` },
      { type: 'number', name: 'threshold', placeholder: { en: 'Lux', fr: 'Lux' }, min: 0, max: 10000, value: 100 }
    ]
  }),
  
  // ============ ACTIONS ============
  
  turn_on: (dn) => ({
    title: { en: 'Turn on', fr: 'Allumer' },
    hint: { en: 'Turn on', fr: 'Allumer' },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  turn_off: (dn) => ({
    title: { en: 'Turn off', fr: 'Éteindre' },
    hint: { en: 'Turn off', fr: 'Éteindre' },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  toggle: (dn) => ({
    title: { en: 'Toggle', fr: 'Basculer' },
    hint: { en: 'Toggle on/off', fr: 'Basculer on/off' },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  set_brightness: (dn) => ({
    title: { en: 'Set brightness', fr: 'Définir luminosité' },
    titleFormatted: { en: 'Set brightness [[brightness]]%', fr: 'Luminosité [[brightness]]%' },
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${dn}` },
      { type: 'range', name: 'brightness', min: 0, max: 100, step: 1, value: 50, label: { en: 'Brightness (%)', fr: 'Luminosité (%)' } }
    ]
  }),
  
  set_color: (dn) => ({
    title: { en: 'Set color', fr: 'Définir couleur' },
    titleFormatted: { en: 'Set color [[color]]', fr: 'Couleur [[color]]' },
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${dn}` },
      { type: 'dropdown', name: 'color', values: [
        { id: 'red', label: { en: 'Red', fr: 'Rouge' } },
        { id: 'green', label: { en: 'Green', fr: 'Vert' } },
        { id: 'blue', label: { en: 'Blue', fr: 'Bleu' } },
        { id: 'white', label: { en: 'White', fr: 'Blanc' } },
        { id: 'yellow', label: { en: 'Yellow', fr: 'Jaune' } },
        { id: 'purple', label: { en: 'Purple', fr: 'Violet' } },
        { id: 'orange', label: { en: 'Orange', fr: 'Orange' } }
      ]}
    ]
  }),
  
  set_temperature: (dn) => ({
    title: { en: 'Set temperature', fr: 'Définir température' },
    titleFormatted: { en: 'Set temperature [[temperature]]K', fr: 'Température [[temperature]]K' },
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${dn}` },
      { type: 'range', name: 'temperature', min: 2700, max: 6500, step: 100, value: 4000, label: { en: 'Temperature (K)', fr: 'Température (K)' } }
    ]
  }),
  
  reboot: (dn) => ({
    title: { en: 'Reboot', fr: 'Redémarrer' },
    hint: { en: 'Power cycle device', fr: 'Cycle d\'alimentation' },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  reset_meter: (dn) => ({
    title: { en: 'Reset energy meter', fr: 'RAZ compteur' },
    hint: { en: 'Reset energy meter', fr: 'Réinitialiser compteur' },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  reset_timeout: (dn) => ({
    title: { en: 'Reset motion timeout', fr: 'RAZ timeout mouvement' },
    hint: { en: 'Reset motion detection timeout', fr: 'Réinitialiser timeout détection' },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  }),
  
  reset_calibration: (dn) => ({
    title: { en: 'Reset calibration', fr: 'RAZ calibration' },
    hint: { en: 'Reset sensor calibration', fr: 'Réinitialiser calibration' },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${dn}` }]
  })
};

module.exports = COMPLETE_TEMPLATES;

// Export summary
if (require.main === module) {
  console.log('📋 COMPLETE FLOW CARD TEMPLATES\n');
  
  const triggers = Object.keys(COMPLETE_TEMPLATES).filter(k => 
    !k.includes('is_') && !k.includes('turn_') && !k.includes('set_') && !k.includes('reset_') && !k.includes('reboot')
  );
  
  const conditions = Object.keys(COMPLETE_TEMPLATES).filter(k => 
    k.includes('is_') || k.endsWith('_in_range') || k.endsWith('_equals') || k.endsWith('_below') || k.endsWith('_above') && !k.endsWith('_changed')
  );
  
  const actions = Object.keys(COMPLETE_TEMPLATES).filter(k => 
    k.includes('turn_') || k.includes('set_') || k.includes('reset_') || k.includes('reboot') || k.includes('toggle')
  );
  
  console.log(`✅ Triggers: ${triggers.length}`);
  triggers.forEach(t => console.log(`   - ${t}`));
  
  console.log(`\n✅ Conditions: ${conditions.length}`);
  conditions.forEach(c => console.log(`   - ${c}`));
  
  console.log(`\n✅ Actions: ${actions.length}`);
  actions.forEach(a => console.log(`   - ${a}`));
  
  console.log(`\n📊 Total templates: ${Object.keys(COMPLETE_TEMPLATES).length}\n`);
}
