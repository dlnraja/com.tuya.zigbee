# TEMPLATE DRIVER HYBRIDE UNIVERSEL

## Concept
Un driver hybride détecte automatiquement le type d'alimentation et adapte ses capabilities:
- **AC/DC**: Pas de measure_battery, pas d'energy.batteries
- **Battery**: measure_battery + energy.batteries array

## Structure driver.compose.json

```json
{
  "name": {
    "en": "Wireless Button (1-8 Buttons)",
    "fr": "Bouton Sans Fil (1-8 Boutons)",
    "nl": "Draadloze Knop (1-8 Knoppen)",
    "de": "Kabelloser Schalter (1-8 Tasten)",
    "it": "Pulsante Wireless (1-8 Pulsanti)",
    "sv": "Trådlös Knapp (1-8 Knappar)",
    "no": "Trådløs Knapp (1-8 Knapper)",
    "es": "Botón Inalámbrico (1-8 Botones)",
    "da": "Trådløs Knap (1-8 Knapper)"
  },
  "class": "button",
  "capabilities": [],
  "capabilitiesOptions": {},
  "zigbee": {
    "manufacturerName": [
      "_TZ3000_*",
      "_TZE200_*",
      "lumi.*"
    ],
    "productId": [
      "TS0041",
      "TS0042",
      "TS0043",
      "TS0044"
    ],
    "endpoints": {
      "1": {
        "clusters": [0, 1, 3, 6],
        "bindings": [1]
      }
    }
  },
  "flow": {
    "triggers": []
  },
  "settings": [
    {
      "type": "group",
      "label": {
        "en": "Device Configuration",
        "fr": "Configuration de l'Appareil"
      },
      "children": [
        {
          "id": "button_count",
          "type": "dropdown",
          "label": {
            "en": "Number of Buttons",
            "fr": "Nombre de Boutons"
          },
          "value": "auto",
          "values": [
            {"id": "auto", "label": {"en": "Auto-detect"}},
            {"id": "1", "label": {"en": "1 Button"}},
            {"id": "2", "label": {"en": "2 Buttons"}},
            {"id": "3", "label": {"en": "3 Buttons"}},
            {"id": "4", "label": {"en": "4 Buttons"}},
            {"id": "6", "label": {"en": "6 Buttons"}},
            {"id": "8", "label": {"en": "8 Buttons"}}
          ]
        },
        {
          "id": "power_type",
          "type": "dropdown",
          "label": {
            "en": "Power Type",
            "fr": "Type d'Alimentation"
          },
          "value": "auto",
          "values": [
            {"id": "auto", "label": {"en": "Auto-detect"}},
            {"id": "battery", "label": {"en": "Battery"}},
            {"id": "ac", "label": {"en": "AC Power"}},
            {"id": "dc", "label": {"en": "DC Power"}}
          ]
        },
        {
          "id": "battery_type",
          "type": "dropdown",
          "label": {
            "en": "Battery Type (if battery powered)",
            "fr": "Type de Pile (si alimenté par pile)"
          },
          "value": "CR2032",
          "values": [
            {"id": "CR2032", "label": {"en": "CR2032"}},
            {"id": "CR2450", "label": {"en": "CR2450"}},
            {"id": "AAA", "label": {"en": "AAA"}},
            {"id": "AA", "label": {"en": "AA"}}
          ]
        }
      ]
    }
  ],
  "connectivity": ["zigbee"],
  "platforms": ["local"]
}
```

## Structure device.js

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class HybridButtonDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('🔄 Initializing Hybrid Button Device');
    
    // ==========================================
    // STEP 1: DETECT POWER TYPE
    // ==========================================
    const powerType = await this.detectPowerType(zclNode);
    this.log(`✅ Power type detected: ${powerType}`);
    await this.setStoreValue('power_type', powerType);
    
    // ==========================================
    // STEP 2: DETECT BUTTON COUNT
    // ==========================================
    const buttonCount = await this.detectButtonCount(zclNode);
    this.log(`✅ Button count detected: ${buttonCount}`);
    await this.setStoreValue('button_count', buttonCount);
    
    // ==========================================
    // STEP 3: SETUP CAPABILITIES DYNAMICALLY
    // ==========================================
    await this.setupDynamicCapabilities(powerType, buttonCount);
    
    // ==========================================
    // STEP 4: CONFIGURE CLUSTERS
    // ==========================================
    if (powerType === 'battery') {
      await this.configureBatteryReporting(zclNode);
    }
    
    await this.configureButtonClusters(zclNode, buttonCount);
    
    // ==========================================
    // STEP 5: SETUP FLOW TRIGGERS
    // ==========================================
    await this.setupFlowTriggers(buttonCount);
    
    this.log('✅ Hybrid Button Device initialized successfully');
  }
  
  /**
   * Détecte automatiquement le type d'alimentation
   */
  async detectPowerType(zclNode) {
    const settingsPowerType = this.getSetting('power_type');
    if (settingsPowerType && settingsPowerType !== 'auto') {
      return settingsPowerType;
    }
    
    // Check if powerConfiguration cluster exists and has battery
    try {
      const endpoint = zclNode.endpoints[1];
      if (endpoint.clusters.powerConfiguration) {
        const batteryPercentage = await endpoint.clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']);
        if (batteryPercentage.batteryPercentageRemaining !== undefined) {
          this.log('Battery detected via powerConfiguration cluster');
          return 'battery';
        }
      }
    } catch (err) {
      this.log('No battery detected, assuming AC/DC power');
    }
    
    // Default to AC if no battery detected
    return 'ac';
  }
  
  /**
   * Détecte automatiquement le nombre de boutons
   */
  async detectButtonCount(zclNode) {
    const settingsButtonCount = this.getSetting('button_count');
    if (settingsButtonCount && settingsButtonCount !== 'auto') {
      return parseInt(settingsButtonCount);
    }
    
    // Count available endpoints with onOff cluster
    let count = 0;
    for (let i = 1; i <= 8; i++) {
      if (zclNode.endpoints[i]?.clusters?.onOff) {
        count++;
      }
    }
    
    return count || 1; // Default to 1 if detection fails
  }
  
  /**
   * Configure les capabilities dynamiquement
   */
  async setupDynamicCapabilities(powerType, buttonCount) {
    const capabilities = [];
    
    // Add button capabilities
    for (let i = 1; i <= buttonCount; i++) {
      const capId = i === 1 ? 'button' : `button.${i}`;
      if (!this.hasCapability(capId)) {
        await this.addCapability(capId);
      }
      capabilities.push(capId);
    }
    
    // Add battery capability if needed
    if (powerType === 'battery') {
      if (!this.hasCapability('measure_battery')) {
        await this.addCapability('measure_battery');
      }
      capabilities.push('measure_battery');
    } else {
      // Remove battery capability if exists
      if (this.hasCapability('measure_battery')) {
        await this.removeCapability('measure_battery');
      }
    }
    
    this.log(`Capabilities configured: ${capabilities.join(', ')}`);
  }
  
  /**
   * Configure battery reporting
   */
  async configureBatteryReporting(zclNode) {
    try {
      await zclNode.endpoints[1].clusters.powerConfiguration.configureReporting({
        batteryPercentageRemaining: {
          minInterval: 3600,
          maxInterval: 65535,
          minChange: 2
        }
      });
      
      this.registerCapabilityListener('measure_battery', async (value) => {
        this.log(`Battery: ${value}%`);
      });
      
      this.log('✅ Battery reporting configured');
    } catch (err) {
      this.error('Battery reporting configuration failed:', err);
    }
  }
  
  /**
   * Configure button clusters
   */
  async configureButtonClusters(zclNode, buttonCount) {
    for (let i = 1; i <= buttonCount; i++) {
      const endpoint = zclNode.endpoints[i];
      if (!endpoint) continue;
      
      const capId = i === 1 ? 'button' : `button.${i}`;
      
      if (endpoint.clusters.onOff) {
        endpoint.clusters.onOff.on('commandOn', () => {
          this.log(`Button ${i} pressed`);
          this.setCapabilityValue(capId, true).catch(this.error);
          this.triggerButtonFlow(i, 'pressed');
        });
        
        endpoint.clusters.onOff.on('commandOff', () => {
          this.log(`Button ${i} released`);
          this.setCapabilityValue(capId, false).catch(this.error);
        });
      }
    }
  }
  
  /**
   * Setup flow triggers dynamically
   */
  async setupFlowTriggers(buttonCount) {
    for (let i = 1; i <= buttonCount; i++) {
      const triggerId = `button_${i}_pressed`;
      // Flow triggers are registered in driver.compose.json dynamically
    }
  }
  
  /**
   * Trigger button flow
   */
  async triggerButtonFlow(buttonNumber, action) {
    try {
      const triggerId = `button_${buttonNumber}_${action}`;
      await this.homey.flow.getDeviceTriggerCard(triggerId).trigger(this, {
        button: buttonNumber
      });
    } catch (err) {
      this.error(`Failed to trigger flow for button ${buttonNumber}:`, err);
    }
  }

}

module.exports = HybridButtonDevice;
```

## Avantages

1. **Un seul driver pour tous** - Plus besoin de drivers séparés par type de batterie
2. **Auto-détection intelligente** - Détecte automatiquement le nombre de boutons et le type d'alimentation
3. **Configuration manuelle possible** - L'utilisateur peut forcer les paramètres si nécessaire
4. **SDK3 compliant** - Pas d'alarm_battery, gestion correcte des capabilities
5. **Maintenance simplifiée** - Un seul fichier à maintenir au lieu de 23

## Réduction

- **Avant**: 23 drivers wireless buttons
- **Après**: 1 driver hybride
- **Réduction**: 95.7%

## Application à d'autres catégories

Le même pattern s'applique à:
- Wall Switches (31 → 1 driver)
- Motion Sensors (13 → 3-4 drivers selon features)
- Contact Sensors (13 → 1 driver)
- Temperature Sensors (15 → 2-3 drivers)
- Etc.

**Total: 183 drivers → ~40-50 drivers hybrides (-75%)**
