#!/usr/bin/env node
'use strict';

/**
 * GENERATE FLOW CARDS
 * 
 * Génération automatique des flow cards pour tous les nouveaux drivers
 * dans .homeycompose/flow/
 */

const fs = require('fs-extra');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const FLOW_DIR = path.join(ROOT, '.homeycompose', 'flow');

const DRIVER_CAPABILITIES = {
  'bulb_white_ac': ['onoff', 'dim'],
  'bulb_white_ambiance_ac': ['onoff', 'dim', 'light_temperature'],
  'led_strip_outdoor_color_ac': ['onoff', 'dim', 'light_hue', 'light_saturation'],
  'doorbell_camera_ac': ['alarm_generic', 'alarm_motion'],
  'alarm_siren_chime_ac': ['alarm_generic'],
  'contact_sensor_battery': ['alarm_contact', 'measure_battery'],
  'wireless_button_2gang_battery': ['measure_battery'],
  'wireless_dimmer_scroll_battery': ['measure_battery'],
  'presence_sensor_mmwave_battery': ['alarm_motion', 'measure_luminance', 'measure_battery'],
  'smart_plug_power_meter_16a_ac': ['onoff', 'measure_power', 'measure_voltage', 'measure_current', 'meter_power']
};

class FlowCardGenerator {
  
  async run() {
    console.log('🎴 GENERATE FLOW CARDS\n');
    console.log('═'.repeat(70) + '\n');
    
    await fs.ensureDir(FLOW_DIR);
    await fs.ensureDir(path.join(FLOW_DIR, 'triggers'));
    await fs.ensureDir(path.join(FLOW_DIR, 'conditions'));
    await fs.ensureDir(path.join(FLOW_DIR, 'actions'));
    
    let cardsGenerated = 0;
    
    for (const [driverId, capabilities] of Object.entries(DRIVER_CAPABILITIES)) {
      console.log(`🎴 Generating flows for ${driverId}...`);
      
      // Triggers
      const triggers = this.generateTriggers(driverId, capabilities);
      for (const trigger of triggers) {
        await this.saveFlowCard('triggers', trigger.id, trigger);
        cardsGenerated++;
      }
      console.log(`   ${triggers.length} triggers`);
      
      // Conditions  
      const conditions = this.generateConditions(driverId, capabilities);
      for (const condition of conditions) {
        await this.saveFlowCard('conditions', condition.id, condition);
        cardsGenerated++;
      }
      console.log(`   ${conditions.length} conditions`);
      
      // Actions
      const actions = this.generateActions(driverId, capabilities);
      for (const action of actions) {
        await this.saveFlowCard('actions', action.id, action);
        cardsGenerated++;
      }
      console.log(`   ${actions.length} actions`);
      
      console.log(`✅ ${driverId}: ${triggers.length + conditions.length + actions.length} cards\n`);
    }
    
    console.log('═'.repeat(70));
    console.log(`\n✅ Generated ${cardsGenerated} flow cards total\n`);
  }
  
  generateTriggers(driverId, capabilities) {
    const triggers = [];
    
    // Alarm triggers
    if (capabilities.includes('alarm_motion')) {
      triggers.push({
        id: `${driverId}_motion_alarm_true`,
        title: { en: 'Motion detected', fr: 'Mouvement détecté', nl: 'Beweging gedetecteerd', de: 'Bewegung erkannt' },
        hint: { en: 'When motion is detected', fr: 'Quand un mouvement est détecté', nl: 'Wanneer beweging wordt gedetecteerd', de: 'Wenn Bewegung erkannt wird' },
        args: [{ type: 'device', name: 'device', filter: `driver_id=${driverId}` }]
      });
    }
    
    if (capabilities.includes('alarm_contact')) {
      triggers.push({
        id: `${driverId}_contact_alarm_true`,
        title: { en: 'Contact opened', fr: 'Contact ouvert', nl: 'Contact geopend', de: 'Kontakt geöffnet' },
        hint: { en: 'When the contact sensor is opened', fr: 'Quand le capteur de contact est ouvert', nl: 'Wanneer de contactsensor wordt geopend', de: 'Wenn der Kontaktsensor geöffnet wird' },
        args: [{ type: 'device', name: 'device', filter: `driver_id=${driverId}` }]
      });
      
      triggers.push({
        id: `${driverId}_contact_alarm_false`,
        title: { en: 'Contact closed', fr: 'Contact fermé', nl: 'Contact gesloten', de: 'Kontakt geschlossen' },
        hint: { en: 'When the contact sensor is closed', fr: 'Quand le capteur de contact est fermé', nl: 'Wanneer de contactsensor wordt gesloten', de: 'Wenn der Kontaktsensor geschlossen wird' },
        args: [{ type: 'device', name: 'device', filter: `driver_id=${driverId}` }]
      });
    }
    
    if (capabilities.includes('alarm_generic')) {
      triggers.push({
        id: `${driverId}_alarm_triggered`,
        title: { en: 'Alarm triggered', fr: 'Alarme déclenchée', nl: 'Alarm geactiveerd', de: 'Alarm ausgelöst' },
        hint: { en: 'When the alarm is triggered', fr: 'Quand l\'alarme est déclenchée', nl: 'Wanneer het alarm wordt geactiveerd', de: 'Wenn der Alarm ausgelöst wird' },
        args: [{ type: 'device', name: 'device', filter: `driver_id=${driverId}` }]
      });
    }
    
    // Button press triggers
    if (driverId.includes('button') || driverId.includes('dimmer')) {
      triggers.push({
        id: `${driverId}_button_pressed`,
        title: { en: 'Button pressed', fr: 'Bouton pressé', nl: 'Knop ingedrukt', de: 'Taste gedrückt' },
        hint: { en: 'When a button is pressed', fr: 'Quand un bouton est pressé', nl: 'Wanneer een knop wordt ingedrukt', de: 'Wenn eine Taste gedrückt wird' },
        args: [
          { type: 'device', name: 'device', filter: `driver_id=${driverId}` },
          {
            name: 'button',
            type: 'dropdown',
            values: [
              { id: '1', label: { en: 'Button 1', fr: 'Bouton 1', nl: 'Knop 1', de: 'Taste 1' } },
              { id: '2', label: { en: 'Button 2', fr: 'Bouton 2', nl: 'Knop 2', de: 'Taste 2' } }
            ]
          }
        ],
        tokens: [
          { name: 'button', type: 'string', title: { en: 'Button', fr: 'Bouton', nl: 'Knop', de: 'Taste' }, example: { en: '1' } }
        ]
      });
    }
    
    // Power measurement triggers
    if (capabilities.includes('measure_power')) {
      triggers.push({
        id: `${driverId}_power_changed`,
        title: { en: 'Power changed', fr: 'Puissance changée', nl: 'Vermogen gewijzigd', de: 'Leistung geändert' },
        hint: { en: 'When the power consumption changes', fr: 'Quand la consommation change', nl: 'Wanneer het verbruik verandert', de: 'Wenn der Verbrauch sich ändert' },
        args: [{ type: 'device', name: 'device', filter: `driver_id=${driverId}` }],
        tokens: [
          { name: 'power', type: 'number', title: { en: 'Power', fr: 'Puissance', nl: 'Vermogen', de: 'Leistung' }, example: { en: '100' } }
        ]
      });
    }
    
    // Battery low trigger
    if (capabilities.includes('measure_battery')) {
      triggers.push({
        id: `${driverId}_battery_low`,
        title: { en: 'Battery low', fr: 'Batterie faible', nl: 'Batterij laag', de: 'Batterie schwach' },
        hint: { en: 'When the battery is low (< 20%)', fr: 'Quand la batterie est faible (< 20%)', nl: 'Wanneer de batterij laag is (< 20%)', de: 'Wenn die Batterie schwach ist (< 20%)' },
        args: [{ type: 'device', name: 'device', filter: `driver_id=${driverId}` }]
      });
    }
    
    return triggers;
  }
  
  generateConditions(driverId, capabilities) {
    const conditions = [];
    
    // On/Off condition
    if (capabilities.includes('onoff')) {
      conditions.push({
        id: `${driverId}_is_on`,
        title: { en: 'Is turned !{{on|off}}', fr: 'Est !{{allumé|éteint}}', nl: 'Is !{{aan|uit}}', de: 'Ist !{{an|aus}}' },
        hint: { en: 'Check if the device is on or off', fr: 'Vérifier si l\'appareil est allumé ou éteint', nl: 'Controleer of het apparaat aan of uit is', de: 'Prüfen Sie, ob das Gerät ein- oder ausgeschaltet ist' },
        args: [{ type: 'device', name: 'device', filter: `driver_id=${driverId}` }]
      });
    }
    
    // Motion detected condition
    if (capabilities.includes('alarm_motion')) {
      conditions.push({
        id: `${driverId}_motion_detected`,
        title: { en: 'Motion is !{{detected|not detected}}', fr: 'Mouvement !{{détecté|non détecté}}', nl: 'Beweging is !{{gedetecteerd|niet gedetecteerd}}', de: 'Bewegung ist !{{erkannt|nicht erkannt}}' },
        hint: { en: 'Check if motion is currently detected', fr: 'Vérifier si un mouvement est détecté', nl: 'Controleer of beweging wordt gedetecteerd', de: 'Prüfen Sie, ob Bewegung erkannt wird' },
        args: [{ type: 'device', name: 'device', filter: `driver_id=${driverId}` }]
      });
    }
    
    // Contact condition
    if (capabilities.includes('alarm_contact')) {
      conditions.push({
        id: `${driverId}_contact_open`,
        title: { en: 'Contact is !{{open|closed}}', fr: 'Contact est !{{ouvert|fermé}}', nl: 'Contact is !{{open|gesloten}}', de: 'Kontakt ist !{{offen|geschlossen}}' },
        hint: { en: 'Check if the contact is open or closed', fr: 'Vérifier si le contact est ouvert ou fermé', nl: 'Controleer of het contact open of gesloten is', de: 'Prüfen Sie, ob der Kontakt offen oder geschlossen ist' },
        args: [{ type: 'device', name: 'device', filter: `driver_id=${driverId}` }]
      });
    }
    
    // Power threshold condition
    if (capabilities.includes('measure_power')) {
      conditions.push({
        id: `${driverId}_power_above`,
        title: { en: 'Power is above', fr: 'Puissance au-dessus de', nl: 'Vermogen boven', de: 'Leistung über' },
        titleFormatted: { en: 'Power is [[above]] W', fr: 'Puissance au-dessus de [[above]] W', nl: 'Vermogen boven [[above]] W', de: 'Leistung über [[above]] W' },
        hint: { en: 'Check if power consumption is above threshold', fr: 'Vérifier si la consommation est au-dessus du seuil', nl: 'Controleer of verbruik boven drempel is', de: 'Prüfen Sie, ob der Verbrauch über der Schwelle liegt' },
        args: [
          { type: 'device', name: 'device', filter: `driver_id=${driverId}` },
          { type: 'number', name: 'above', min: 0, max: 4000, step: 1, placeholder: { en: 'Watts' } }
        ]
      });
    }
    
    return conditions;
  }
  
  generateActions(driverId, capabilities) {
    const actions = [];
    
    // On/Off actions
    if (capabilities.includes('onoff')) {
      actions.push({
        id: `${driverId}_turn_on`,
        title: { en: 'Turn on', fr: 'Allumer', nl: 'Inschakelen', de: 'Einschalten' },
        hint: { en: 'Turn the device on', fr: 'Allumer l\'appareil', nl: 'Schakel het apparaat in', de: 'Gerät einschalten' },
        args: [{ type: 'device', name: 'device', filter: `driver_id=${driverId}` }]
      });
      
      actions.push({
        id: `${driverId}_turn_off`,
        title: { en: 'Turn off', fr: 'Éteindre', nl: 'Uitschakelen', de: 'Ausschalten' },
        hint: { en: 'Turn the device off', fr: 'Éteindre l\'appareil', nl: 'Schakel het apparaat uit', de: 'Gerät ausschalten' },
        args: [{ type: 'device', name: 'device', filter: `driver_id=${driverId}` }]
      });
      
      actions.push({
        id: `${driverId}_toggle`,
        title: { en: 'Toggle on/off', fr: 'Basculer', nl: 'Schakelen', de: 'Umschalten' },
        hint: { en: 'Toggle the device on or off', fr: 'Basculer l\'appareil', nl: 'Schakel het apparaat', de: 'Gerät umschalten' },
        args: [{ type: 'device', name: 'device', filter: `driver_id=${driverId}` }]
      });
    }
    
    // Dim action
    if (capabilities.includes('dim')) {
      actions.push({
        id: `${driverId}_set_dim`,
        title: { en: 'Set brightness', fr: 'Définir luminosité', nl: 'Stel helderheid in', de: 'Helligkeit einstellen' },
        titleFormatted: { en: 'Set brightness to [[brightness]]%', fr: 'Définir luminosité à [[brightness]]%', nl: 'Stel helderheid in op [[brightness]]%', de: 'Helligkeit auf [[brightness]]% einstellen' },
        hint: { en: 'Set the brightness level', fr: 'Définir le niveau de luminosité', nl: 'Stel het helderheidsniveau in', de: 'Stellen Sie die Helligkeit ein' },
        args: [
          { type: 'device', name: 'device', filter: `driver_id=${driverId}` },
          { type: 'range', name: 'brightness', min: 0, max: 1, step: 0.01, label: '%', labelMultiplier: 100 }
        ]
      });
    }
    
    // Temperature action
    if (capabilities.includes('light_temperature')) {
      actions.push({
        id: `${driverId}_set_temperature`,
        title: { en: 'Set color temperature', fr: 'Définir température couleur', nl: 'Stel kleurtemperatuur in', de: 'Farbtemperatur einstellen' },
        titleFormatted: { en: 'Set temperature to [[temperature]]K', fr: 'Définir température à [[temperature]]K', nl: 'Stel temperatuur in op [[temperature]]K', de: 'Temperatur auf [[temperature]]K einstellen' },
        hint: { en: 'Set the color temperature', fr: 'Définir la température de couleur', nl: 'Stel de kleurtemperatuur in', de: 'Stellen Sie die Farbtemperatur ein' },
        args: [
          { type: 'device', name: 'device', filter: `driver_id=${driverId}` },
          { type: 'range', name: 'temperature', min: 2200, max: 6500, step: 100, label: 'K' }
        ]
      });
    }
    
    // Color action
    if (capabilities.includes('light_hue')) {
      actions.push({
        id: `${driverId}_set_color`,
        title: { en: 'Set color', fr: 'Définir couleur', nl: 'Stel kleur in', de: 'Farbe einstellen' },
        hint: { en: 'Set the light color', fr: 'Définir la couleur de la lumière', nl: 'Stel de lichtkleur in', de: 'Stellen Sie die Lichtfarbe ein' },
        args: [
          { type: 'device', name: 'device', filter: `driver_id=${driverId}` },
          { type: 'color', name: 'color' }
        ]
      });
    }
    
    // Alarm action
    if (capabilities.includes('alarm_generic')) {
      actions.push({
        id: `${driverId}_trigger_alarm`,
        title: { en: 'Trigger alarm', fr: 'Déclencher alarme', nl: 'Activeer alarm', de: 'Alarm auslösen' },
        hint: { en: 'Trigger the alarm', fr: 'Déclencher l\'alarme', nl: 'Activeer het alarm', de: 'Lösen Sie den Alarm aus' },
        args: [{ type: 'device', name: 'device', filter: `driver_id=${driverId}` }]
      });
    }
    
    return actions;
  }
  
  async saveFlowCard(type, id, card) {
    const filePath = path.join(FLOW_DIR, type, `${id}.json`);
    await fs.writeJson(filePath, card, { spaces: 2 });
  }
}

// === MAIN ===
async function main() {
  const generator = new FlowCardGenerator();
  await generator.run();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
