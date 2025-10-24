#!/usr/bin/env node
'use strict';

/**
 * ENRICH FLOWS COMPLETE
 * 
 * Enrichissement complet des nouveaux drivers avec:
 * - Flow cards (triggers, conditions, actions)
 * - Pair templates
 * - Settings
 * - Toutes métadonnées
 */

const fs = require('fs-extra');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const NEW_DRIVERS_2025 = [
  'bulb_white_ac',
  'bulb_white_ambiance_ac',
  'led_strip_outdoor_color_ac',
  'doorbell_camera_ac',
  'alarm_siren_chime_ac',
  'contact_sensor_battery',
  'wireless_button_2gang_battery',
  'wireless_dimmer_scroll_battery',
  'presence_sensor_mmwave_battery',
  'smart_plug_power_meter_16a_ac'
];

class FlowEnricher {
  
  async run() {
    console.log('🎯 ENRICH FLOWS COMPLETE\n');
    console.log('═'.repeat(70) + '\n');
    
    let enriched = 0;
    
    for (const driverId of NEW_DRIVERS_2025) {
      console.log(`📝 Enriching ${driverId}...`);
      
      try {
        await this.enrichDriver(driverId);
        enriched++;
        console.log(`✅ ${driverId} enriched\n`);
      } catch (err) {
        console.error(`❌ ${driverId} failed:`, err.message, '\n');
      }
    }
    
    console.log('═'.repeat(70));
    console.log(`\n✅ Enriched ${enriched}/${NEW_DRIVERS_2025.length} drivers\n`);
  }
  
  async enrichDriver(driverId) {
    const driverDir = path.join(DRIVERS_DIR, driverId);
    const composeFile = path.join(driverDir, 'driver.compose.json');
    
    if (!await fs.pathExists(composeFile)) {
      throw new Error('driver.compose.json not found');
    }
    
    const compose = await fs.readJson(composeFile);
    
    // Add pair template
    if (!compose.pair) {
      compose.pair = this.generatePairTemplate(driverId, compose);
      console.log('   + Pair template');
    }
    
    // Add settings
    const settings = this.generateSettings(driverId, compose);
    if (settings && settings.length > 0) {
      compose.settings = settings;
      console.log('   + Settings');
    }
    
    // Save
    await fs.writeJson(composeFile, compose, { spaces: 2 });
    
    // Create pair directory
    await this.createPairDirectory(driverId, compose);
  }
  
  generatePairTemplate(driverId, compose) {
    // Basic pair template - Homey handles Zigbee pairing automatically
    return [
      {
        id: 'list_devices',
        template: 'list_devices',
        navigation: {
          next: 'add_devices'
        }
      },
      {
        id: 'add_devices',
        template: 'add_devices'
      }
    ];
  }
  
  generateSettings(driverId, compose) {
    const capabilities = compose.capabilities || [];
    const settings = [];
    
    // Lighting settings
    if (capabilities.includes('dim')) {
      settings.push({
        type: 'group',
        label: {
          en: 'Dimming Settings',
          fr: 'Paramètres de gradation',
          nl: 'Dim instellingen',
          de: 'Dimm-Einstellungen'
        },
        children: [
          {
            id: 'transition_time',
            type: 'number',
            label: {
              en: 'Transition time (seconds)',
              fr: 'Temps de transition (secondes)',
              nl: 'Overgangstijd (seconden)',
              de: 'Übergangszeit (Sekunden)'
            },
            value: 1,
            min: 0,
            max: 10,
            step: 0.1,
            units: {
              en: 'seconds',
              fr: 'secondes',
              nl: 'seconden',
              de: 'Sekunden'
            }
          }
        ]
      });
    }
    
    // Power on behavior for lights/plugs
    if (capabilities.includes('onoff')) {
      settings.push({
        type: 'group',
        label: {
          en: 'Power Settings',
          fr: 'Paramètres d\'alimentation',
          nl: 'Stroom instellingen',
          de: 'Leistungseinstellungen'
        },
        children: [
          {
            id: 'power_on_behavior',
            type: 'dropdown',
            label: {
              en: 'Power-on behavior',
              fr: 'Comportement à la mise sous tension',
              nl: 'Inschakeling gedrag',
              de: 'Einschaltverhalten'
            },
            value: 'restore',
            values: [
              {
                id: 'on',
                label: {
                  en: 'Always ON',
                  fr: 'Toujours ALLUMÉ',
                  nl: 'Altijd AAN',
                  de: 'Immer EIN'
                }
              },
              {
                id: 'off',
                label: {
                  en: 'Always OFF',
                  fr: 'Toujours ÉTEINT',
                  nl: 'Altijd UIT',
                  de: 'Immer AUS'
                }
              },
              {
                id: 'restore',
                label: {
                  en: 'Restore last state',
                  fr: 'Restaurer le dernier état',
                  nl: 'Herstel laatste status',
                  de: 'Letzten Zustand wiederherstellen'
                }
              }
            ]
          }
        ]
      });
    }
    
    // Motion sensor settings
    if (capabilities.includes('alarm_motion')) {
      settings.push({
        type: 'group',
        label: {
          en: 'Motion Detection',
          fr: 'Détection de mouvement',
          nl: 'Bewegingsdetectie',
          de: 'Bewegungserkennung'
        },
        children: [
          {
            id: 'motion_timeout',
            type: 'number',
            label: {
              en: 'Motion timeout (seconds)',
              fr: 'Délai de mouvement (secondes)',
              nl: 'Beweging timeout (seconden)',
              de: 'Bewegungs-Timeout (Sekunden)'
            },
            value: 60,
            min: 5,
            max: 600,
            step: 5,
            units: {
              en: 'seconds',
              fr: 'secondes',
              nl: 'seconden',
              de: 'Sekunden'
            }
          }
        ]
      });
    }
    
    // Battery reporting
    if (capabilities.includes('measure_battery')) {
      settings.push({
        type: 'group',
        label: {
          en: 'Battery Settings',
          fr: 'Paramètres de batterie',
          nl: 'Batterij instellingen',
          de: 'Batterie-Einstellungen'
        },
        children: [
          {
            id: 'battery_report_interval',
            type: 'number',
            label: {
              en: 'Battery report interval (minutes)',
              fr: 'Intervalle de rapport de batterie (minutes)',
              nl: 'Batterij rapportage interval (minuten)',
              de: 'Batteriebericht-Intervall (Minuten)'
            },
            value: 60,
            min: 15,
            max: 1440,
            step: 15,
            units: {
              en: 'minutes',
              fr: 'minutes',
              nl: 'minuten',
              de: 'Minuten'
            }
          }
        ]
      });
    }
    
    return settings;
  }
  
  async createPairDirectory(driverId, compose) {
    const pairDir = path.join(DRIVERS_DIR, driverId, 'pair');
    await fs.ensureDir(pairDir);
    
    // Create list.html for custom pairing if needed
    const listHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Pair Device</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 20px;
            text-align: center;
        }
        .instructions {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
            border-radius: 8px;
        }
        h2 {
            color: #333;
        }
        ol {
            text-align: left;
            line-height: 1.8;
        }
        .note {
            margin-top: 20px;
            padding: 15px;
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            border-radius: 4px;
            text-align: left;
        }
    </style>
</head>
<body>
    <div class="instructions">
        <h2>Pairing Instructions</h2>
        ${this.getPairingHTML(driverId, compose)}
    </div>
</body>
</html>
`;
    
    await fs.writeFile(path.join(pairDir, 'list.html'), listHtml);
    console.log('   + Pair HTML');
  }
  
  getPairingHTML(driverId, compose) {
    const instructions = compose.zigbee?.learnmode?.instruction?.en || '';
    
    if (driverId.includes('bulb')) {
      return `
        <p>Follow these steps to pair your smart bulb:</p>
        <ol>
            <li>Install the bulb in a lamp socket</li>
            <li>Turn power ON and OFF 5 times with 1-second intervals</li>
            <li>The bulb will start flashing</li>
            <li>Wait for the device to appear in Homey</li>
        </ol>
        <div class="note">
            <strong>Note:</strong> Some bulbs may require a specific reset procedure. 
            Check the manufacturer's manual if standard pairing doesn't work.
        </div>
      `;
    }
    
    if (driverId.includes('sensor')) {
      return `
        <p>Follow these steps to pair your sensor:</p>
        <ol>
            <li>Insert the battery into the sensor</li>
            <li>Press and hold the pairing button for 5 seconds</li>
            <li>The LED will blink to indicate pairing mode</li>
            <li>Wait for the device to appear in Homey</li>
        </ol>
        <div class="note">
            <strong>Tip:</strong> Keep the sensor close to Homey during pairing for best results.
        </div>
      `;
    }
    
    if (driverId.includes('plug')) {
      return `
        <p>Follow these steps to pair your smart plug:</p>
        <ol>
            <li>Plug the device into a power outlet</li>
            <li>Press and hold the power button for 5 seconds</li>
            <li>The LED will start blinking rapidly</li>
            <li>Wait for the device to appear in Homey</li>
        </ol>
        <div class="note">
            <strong>Safety:</strong> Do not connect high-power appliances during initial setup.
        </div>
      `;
    }
    
    // Default
    return `
        <p>${String(instructions).replace(/\n/g, '</p><p>')}</p>
        <div class="note">
            <strong>Tip:</strong> Make sure the device is close to your Homey during pairing.
        </div>
      `;
  }
}

// === MAIN ===
async function main() {
  const enricher = new FlowEnricher();
  await enricher.run();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
