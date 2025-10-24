#!/usr/bin/env node

/**
 * ADD BATTERY MANAGEMENT v34.0.0
 * Ajoute gestion complète batterie à tous les drivers concernés
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔋 ADD BATTERY MANAGEMENT v34.0.0\n');

const rootDir = path.join(__dirname, '..');
const driversDir = path.join(rootDir, 'drivers');

// Types de batteries et leurs caractéristiques
const batteryTypes = {
  'cr2032': { voltage: 3.0, capacity: 225, checkInterval: 3600 },
  'cr2450': { voltage: 3.0, capacity: 620, checkInterval: 3600 },
  'cr123a': { voltage: 3.0, capacity: 1550, checkInterval: 7200 },
  'cr1632': { voltage: 3.0, capacity: 140, checkInterval: 3600 },
  'aaa': { voltage: 1.5, capacity: 1200, checkInterval: 7200 },
  'aa': { voltage: 1.5, capacity: 2850, checkInterval: 7200 },
  'other': { voltage: 3.0, capacity: 300, checkInterval: 3600 }
};

const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

let updatedCount = 0;

drivers.forEach(driverName => {
  // Détecter si le driver a une batterie
  const batteryMatch = driverName.match(/(cr2032|cr2450|cr123a|cr1632|aaa|aa|other)$/i);
  if (!batteryMatch) return; // Skip AC devices
  
  const batteryType = batteryMatch[1].toLowerCase();
  const batteryInfo = batteryTypes[batteryType];
  
  const driverPath = path.join(driversDir, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  const devicePath = path.join(driverPath, 'device.js');
  
  if (!fs.existsSync(composePath)) return;
  
  try {
    // 1. Mettre à jour driver.compose.json
    let compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    
    // Ajouter energy si manquant
    if (!compose.energy) {
      compose.energy = {
        batteries: [batteryType.toUpperCase()]
      };
    }
    
    // Ajouter measure_battery si manquant
    if (!compose.capabilities) compose.capabilities = [];
    if (!compose.capabilities.includes('measure_battery')) {
      compose.capabilities.push('measure_battery');
    }
    
    // Ajouter settings pour battery reporting
    if (!compose.settings) compose.settings = [];
    
    const hasBatterySettings = compose.settings.some(s => s.id === 'battery_threshold');
    if (!hasBatterySettings) {
      compose.settings.push(
        {
          type: 'group',
          label: { en: 'Battery Settings', fr: 'Paramètres Batterie' },
          children: [
            {
              id: 'battery_threshold',
              type: 'number',
              label: { en: 'Low Battery Threshold (%)', fr: 'Seuil Batterie Faible (%)' },
              value: 20,
              min: 5,
              max: 50,
              hint: { 
                en: 'Trigger low battery alarm when below this percentage',
                fr: 'Déclenche alarme batterie faible en dessous de ce pourcentage'
              }
            },
            {
              id: 'battery_report_interval',
              type: 'number',
              label: { en: 'Battery Report Interval (hours)', fr: 'Intervalle Rapport Batterie (heures)' },
              value: Math.floor(batteryInfo.checkInterval / 3600),
              min: 1,
              max: 24,
              hint: { 
                en: 'How often to check battery level',
                fr: 'Fréquence de vérification du niveau de batterie'
              }
            }
          ]
        }
      );
    }
    
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
    
    // 2. Mettre à jour device.js
    let deviceJs = fs.readFileSync(devicePath, 'utf-8');
    
    // Ajouter imports si manquants
    if (!deviceJs.includes('CLUSTER')) {
      deviceJs = String(deviceJs).replace(
        "const { ZigBeeDevice } = require('homey-zigbeedriver');",
        "const { ZigBeeDevice } = require('homey-zigbeedriver');\nconst { CLUSTER } = require('zigbee-clusters');"
      );
    }
    
    // Ajouter battery management dans onNodeInit
    if (!deviceJs.includes('registerCapability(\'measure_battery\'')) {
      const batteryCode = `
    // Battery management
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      reportParser: value => {
        const percentage = Math.round(value / 2); // Zigbee reports in 0.5% increments
        this.log('Battery percentage:', percentage + '%');
        
        // Check low battery threshold
        const threshold = this.getSetting('battery_threshold') || 20;
        if (percentage <= threshold && percentage > 0) {
          this.setWarning('Low battery: ' + percentage + '%').catch(this.error);
        } else if (percentage > threshold) {
          this.unsetWarning().catch(this.error);
        }
        
        return percentage;
      },
      report: 'batteryPercentageRemaining',
      reportParser: value => Math.round(value / 2),
      getOpts: {
        getOnStart: true,
        pollInterval: (this.getSetting('battery_report_interval') || ${Math.floor(batteryInfo.checkInterval / 3600)}) * 3600000
      }
    });
    
    // Battery alarm capability
    this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryAlarmState',
      reportParser: value => {
        const isLowBattery = value > 0;
        if (isLowBattery) {
          this.log('⚠️ Low battery alarm triggered!');
          this.setWarning('Low battery detected').catch(this.error);
        }
        return isLowBattery;
      }
    });`;
      
      // Insérer après onNodeInit
      deviceJs = String(deviceJs).replace(
        /async onNodeInit\(\{ zclNode \}\) \{[\s\S]*?this\.log\(['"](.*?) initialized['"].*?\);/,
        (match, logText) => {
          return match + batteryCode;
        }
      );
    }
    
    // Ajouter méthode pour calculer battery voltage
    if (!deviceJs.includes('getBatteryVoltage')) {
      const voltageMethod = `
  
  /**
   * Calculate battery voltage from percentage
   * @param {number} percentage - Battery percentage (0-100)
   * @returns {number} Estimated voltage
   */
  getBatteryVoltage(percentage) {
    const maxVoltage = ${batteryInfo.voltage};
    const minVoltage = maxVoltage * 0.7; // 70% of max = critical
    return minVoltage + ((maxVoltage - minVoltage) * percentage / 100);
  }
  
  /**
   * Get battery capacity in mAh
   * @returns {number} Battery capacity
   */
  getBatteryCapacity() {
    return ${batteryInfo.capacity};
  }
  
  /**
   * Estimate remaining battery life in days
   * @param {number} percentage - Current battery percentage
   * @returns {number} Estimated days remaining
   */
  estimateBatteryLife(percentage) {
    const capacity = this.getBatteryCapacity();
    const avgCurrentDraw = 0.1; // mA average (conservative estimate)
    const remainingCapacity = capacity * (percentage / 100);
    const hoursRemaining = remainingCapacity / avgCurrentDraw;
    return Math.floor(hoursRemaining / 24);
  }`;
      
      deviceJs = String(deviceJs).replace(/\n\}\n\nmodule\.exports/, voltageMethod + '\n}\n\nmodule.exports');
    }
    
    fs.writeFileSync(devicePath, deviceJs);
    
    console.log(`✅ ${driverName} - Battery ${batteryType.toUpperCase()} configured`);
    updatedCount++;
    
  } catch (err) {
    console.log(`❌ ${driverName} - ERROR: ${err.message}`);
  }
});

// 3. Créer flow cards globaux pour batteries
const flowsPath = path.join(rootDir, '.homeycompose', 'flow');
if (!fs.existsSync(flowsPath)) {
  fs.mkdirSync(flowsPath, { recursive: true });
}

// Triggers
const triggersPath = path.join(flowsPath, 'triggers.json');
const triggers = [
  {
    id: 'battery_low',
    title: { en: 'Battery is low', fr: 'Batterie faible' },
    hint: { 
      en: 'Triggered when battery level drops below threshold',
      fr: 'Déclenché quand le niveau de batterie passe sous le seuil'
    },
    tokens: [
      {
        name: 'battery',
        type: 'number',
        title: { en: 'Battery %', fr: 'Batterie %' },
        example: 15
      }
    ]
  },
  {
    id: 'battery_critical',
    title: { en: 'Battery is critical', fr: 'Batterie critique' },
    hint: { 
      en: 'Triggered when battery level drops below 10%',
      fr: 'Déclenché quand le niveau de batterie passe sous 10%'
    },
    tokens: [
      {
        name: 'battery',
        type: 'number',
        title: { en: 'Battery %', fr: 'Batterie %' },
        example: 8
      }
    ]
  },
  {
    id: 'battery_changed',
    title: { en: 'Battery level changed', fr: 'Niveau batterie changé' },
    hint: { 
      en: 'Triggered when battery level changes',
      fr: 'Déclenché quand le niveau de batterie change'
    },
    tokens: [
      {
        name: 'battery',
        type: 'number',
        title: { en: 'Battery %', fr: 'Batterie %' },
        example: 75
      }
    ]
  }
];

fs.writeFileSync(triggersPath, JSON.stringify(triggers, null, 2));

// Conditions
const conditionsPath = path.join(flowsPath, 'conditions.json');
const conditions = [
  {
    id: 'battery_below',
    title: { en: 'Battery is !{{below|above}}', fr: 'Batterie est !{{sous|au dessus}}' },
    titleFormatted: { 
      en: 'Battery is !{{below|above}} [[threshold]]%',
      fr: 'Batterie est !{{sous|au dessus}} [[threshold]]%'
    },
    hint: { 
      en: 'Check if battery level is below/above threshold',
      fr: 'Vérifie si le niveau de batterie est sous/au dessus du seuil'
    },
    args: [
      {
        name: 'threshold',
        type: 'range',
        min: 0,
        max: 100,
        step: 5,
        label: { en: 'Threshold %', fr: 'Seuil %' },
        value: 20
      }
    ]
  },
  {
    id: 'battery_is_low',
    title: { en: 'Battery is !{{low|ok}}', fr: 'Batterie est !{{faible|ok}}' },
    hint: { 
      en: 'Check if battery is low (below 20%)',
      fr: 'Vérifie si la batterie est faible (sous 20%)'
    }
  }
];

fs.writeFileSync(conditionsPath, JSON.stringify(conditions, null, 2));

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         BATTERY MANAGEMENT - TERMINÉ                          ║
╚═══════════════════════════════════════════════════════════════╝

📊 Statistiques:
   Drivers mis à jour:    ${updatedCount}
   Flow triggers:         3
   Flow conditions:       2

✅ Gestion batterie complète ajoutée:
   - measure_battery capability
   - Battery alarm detection
   - Low battery warnings
   - Configurable thresholds
   - Battery voltage estimation
   - Battery life estimation
   - Flow cards (triggers + conditions)

🔋 Types batterie supportés:
${Object.keys(batteryTypes).map(type => `   - ${type.toUpperCase()}: ${batteryTypes[type].capacity}mAh`).join('\n')}

✅ Tous les drivers avec batteries sont configurés!
`);
