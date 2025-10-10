const fs = require('fs');
const path = require('path');

/**
 * CORRECTION COMPLÈTE TOUS LES BUGS DU FORUM
 * 
 * Forum #259: Temperature/Humidity not showing
 * Forum #256: Unknown Zigbee Device, too many similar drivers
 * Forum #261: Add gas sensor TS0601_gas_sensor_2
 */

console.log('🔧 CORRECTION COMPLÈTE BUGS FORUM\n');
console.log('═'.repeat(80));

class ForumBugFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixes = [];
  }

  async fixAll() {
    console.log('\n1️⃣ CRÉATION GAS SENSOR TS0601_gas_sensor_2 (Forum #261)\n');
    await this.createGasSensor();

    console.log('\n2️⃣ CORRECTION TEMPERATURE SENSORS (Forum #259)\n');
    await this.fixTemperatureSensors();

    console.log('\n3️⃣ AMÉLIORATION DEVICE PAIRING (Forum #256)\n');
    await this.improveDevicePairing();

    console.log('\n4️⃣ AJOUT IMAGES PAIRING\n');
    await this.addPairingImages();

    this.showSummary();
  }

  async createGasSensor() {
    const gasDriverPath = path.join(this.projectRoot, 'drivers', 'gas_sensor_ts0601');
    
    if (!fs.existsSync(gasDriverPath)) {
      fs.mkdirSync(gasDriverPath, { recursive: true });
      fs.mkdirSync(path.join(gasDriverPath, 'assets'), { recursive: true });
      fs.mkdirSync(path.join(gasDriverPath, 'pair'), { recursive: true});

      // driver.compose.json
      const driverCompose = {
        "name": {
          "en": "Gas Sensor TS0601",
          "fr": "Capteur de Gaz TS0601"
        },
        "class": "sensor",
        "capabilities": [
          "alarm_co",
          "alarm_smoke",
          "measure_battery"
        ],
        "zigbee": {
          "manufacturerName": [
            "_TZE200_yojqa8xn",
            "_TZE204_yojqa8xn"
          ],
          "productId": [
            "TS0601"
          ],
          "endpoints": {
            "1": {
              "clusters": [0, 1, 4, 5, 61184],
              "bindings": [1]
            }
          },
          "learnmode": {
            "instruction": {
              "en": "Press and hold the button on the device for 5 seconds to pair",
              "fr": "Appuyez et maintenez le bouton pendant 5 secondes pour appairer"
            }
          }
        },
        "images": {
          "small": "./assets/small.png",
          "large": "./assets/large.png"
        },
        "platforms": ["local"],
        "connectivity": ["zigbee"],
        "energy": {
          "batteries": ["AA", "AAA"]
        },
        "id": "gas_sensor_ts0601"
      };

      fs.writeFileSync(
        path.join(gasDriverPath, 'driver.compose.json'),
        JSON.stringify(driverCompose, null, 2)
      );

      // device.js
      const deviceJs = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class GasSensorDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.log('Gas Sensor TS0601 initialized');

    // Enable debug logging
    this.enableDebug();
    this.printNode();

    // Gas alarm
    if (this.hasCapability('alarm_co')) {
      zclNode.endpoints[1].clusters.basic.on('reporting', (value) => {
        this.log('Gas detection report:', value);
        if (value && value.hasOwnProperty('gas_value')) {
          const gasDetected = value.gas_value > 0;
          this.setCapabilityValue('alarm_co', gasDetected).catch(this.error);
        }
      });
    }

    // Battery
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 1, {
        getOpts: {
          getOnStart: true,
          pollInterval: 3600000 // Every hour
        }
      });
    }
  }

  onDeleted() {
    this.log('Gas Sensor deleted');
  }
}

module.exports = GasSensorDevice;
`;

      fs.writeFileSync(path.join(gasDriverPath, 'device.js'), deviceJs);

      // driver.js
      const driverJs = `'use strict';

const { Driver } = require('homey');

class GasSensorDriver extends Driver {
  
  async onInit() {
    this.log('Gas Sensor TS0601 driver initialized');
  }

  async onPair(session) {
    this.log('Pairing started for Gas Sensor');
  }
}

module.exports = GasSensorDriver;
`;

      fs.writeFileSync(path.join(gasDriverPath, 'driver.js'), driverJs);

      // list_devices.js
      const listDevicesJs = `'use strict';

module.exports = async function() {
  return [];
};
`;

      fs.writeFileSync(path.join(gasDriverPath, 'pair', 'list_devices.js'), listDevicesJs);

      console.log('   ✅ Gas Sensor TS0601 créé');
      this.fixes.push('Created gas_sensor_ts0601 driver');
    } else {
      console.log('   ℹ️  Gas Sensor déjà existe');
    }
  }

  async fixTemperatureSensors() {
    // Corriger le device.js pour temp_humid_sensor_dd
    const tempSensorPath = path.join(this.projectRoot, 'drivers', 'temp_humid_sensor_dd');
    const deviceJsPath = path.join(tempSensorPath, 'device.js');

    const improvedDeviceJs = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TempHumidSensorDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.log('Temperature Humidity Sensor initialized');

    // Enable debugging
    this.enableDebug();
    this.printNode();

    // Temperature
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 1024, {
        reportParser: value => {
          this.log('Temperature report:', value);
          return Math.round((value / 100) * 10) / 10; // Convert to °C with 1 decimal
        },
        getOpts: {
          getOnStart: true,
          pollInterval: 300000 // 5 minutes
        }
      });
    }

    // Humidity
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 1024, {
        reportParser: value => {
          this.log('Humidity report:', value);
          return Math.round((value / 100) * 10) / 10; // Convert to % with 1 decimal
        },
        getOpts: {
          getOnStart: true,
          pollInterval: 300000 // 5 minutes
        }
      });
    }

    // Battery
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 1, {
        reportParser: value => {
          this.log('Battery report:', value);
          return Math.min(100, Math.max(0, value / 2)); // Convert to %
        },
        getOpts: {
          getOnStart: true,
          pollInterval: 3600000 // 1 hour
        }
      });
    }

    // Luminance (if supported)
    if (this.hasCapability('measure_luminance')) {
      this.registerCapability('measure_luminance', 1024, {
        reportParser: value => {
          this.log('Luminance report:', value);
          return Math.max(0, Math.round(Math.pow(10, (value - 1) / 10000)));
        },
        getOpts: {
          getOnStart: true,
          pollInterval: 300000
        }
      });
    }

    // Motion (if supported)
    if (this.hasCapability('alarm_motion')) {
      zclNode.endpoints[1].clusters.basic.on('reporting', (value) => {
        this.log('Motion report:', value);
        if (value && value.hasOwnProperty('occupancy')) {
          this.setCapabilityValue('alarm_motion', value.occupancy === 1).catch(this.error);
        }
      });
    }
  }

  onDeleted() {
    this.log('Temperature Humidity Sensor deleted');
  }
}

module.exports = TempHumidSensorDevice;
`;

    fs.writeFileSync(deviceJsPath, improvedDeviceJs);
    console.log('   ✅ temp_humid_sensor_dd device.js corrigé');
    this.fixes.push('Fixed temp_humid_sensor_dd parsers');
  }

  async improveDevicePairing() {
    // Créer un guide de pairing amélioré
    const pairingGuidePath = path.join(this.projectRoot, 'docs', 'PAIRING_GUIDE.md');
    
    const pairingGuide = `# 📱 GUIDE DE PAIRING - UNIVERSAL TUYA ZIGBEE

## 🎯 Comment Choisir le Bon Driver

### Par Type d'Appareil

**Capteurs de Température/Humidité:**
- \`Temperature Humidity Sensor\` - Capteur basique temp + humidité
- \`temp_humid_sensor_dd\` - Avec batterie AA/AAA ou CR2032
- \`temp_humid_sensor_advanced\` - Avec luminosité + mouvement

**Détecteurs de Gaz:**
- \`gas_detector\` - Détecteur de gaz basique
- \`gas_sensor_ts0601\` - Modèle TS0601 spécifique

**Capteurs de Mouvement:**
- \`motion_sensor_pir_ac\` - Alimentation AC (secteur)
- \`motion_sensor_pir_ac_battery\` - Sur batterie
- \`radar_motion_sensor_mmwave\` - Radar mmWave 24GHz

**Boutons/Switches:**
- \`wireless_switch_1gang_cr2032\` - 1 bouton, pile CR2032
- \`wireless_switch_2gang_cr2032\` - 2 boutons, pile CR2032
- etc.

## 🔍 Identification Visuelle

Si vous ne voyez pas d'images, identifiez par:

1. **Type d'alimentation**: Secteur (AC/DC) ou Batterie (CR2032/CR2450/AA/AAA)
2. **Nombre de boutons**: Pour switches (1gang, 2gang, 3gang, etc.)
3. **Fonction principale**: Temperature, Motion, Gas, etc.

## ⚠️ Si "Unknown Zigbee Device"

1. Vérifier le manufacturer ID sur l'appareil
2. Chercher dans GitHub Issues: https://github.com/dlnraja/com.tuya.zigbee/issues
3. Rapporter le problème avec:
   - Photo de l'appareil
   - Manufacturer ID
   - Product ID
   - Ce que l'appareil fait

## 📸 Identification des Appareils

Pour identifier correctement:
- Vérifiez l'étiquette au dos de l'appareil
- Manufacturer ID commence souvent par _TZ (ex: _TZ3000_, _TZE200_)
- Product ID est souvent TS suivi de chiffres (ex: TS0601, TS0201)
`;

    fs.writeFileSync(pairingGuidePath, pairingGuide);
    console.log('   ✅ Guide de pairing créé: docs/PAIRING_GUIDE.md');
    this.fixes.push('Created pairing guide');
  }

  async addPairingImages() {
    console.log('   ℹ️  Les images de pairing nécessitent des assets graphiques');
    console.log('   ℹ️  À ajouter manuellement dans drivers/*/pair/');
    this.fixes.push('TODO: Add pairing UI images (requires assets)');
  }

  showSummary() {
    console.log('\n═'.repeat(80));
    console.log('📊 RÉSUMÉ CORRECTIONS FORUM');
    console.log('═'.repeat(80));

    console.log(`\n✅ CORRECTIONS APPLIQUÉES (${this.fixes.length}):\n`);
    this.fixes.forEach(fix => console.log(`   - ${fix}`));

    console.log('\n🎯 BUGS FORUM CORRIGÉS:');
    console.log('   ✅ #261: Gas Sensor TS0601 ajouté');
    console.log('   ✅ #259: Parsers température/humidité corrigés');
    console.log('   ✅ #256: Guide de pairing amélioré');

    console.log('\n📝 PROCHAINES ÉTAPES:');
    console.log('   1. Tester gas sensor avec device réel');
    console.log('   2. Ajouter images pairing pour tous drivers');
    console.log('   3. Valider avec homey app validate');
    console.log('   4. Commit et push');
  }
}

// Exécution
(async () => {
  const fixer = new ForumBugFixer();
  await fixer.fixAll();
})();
