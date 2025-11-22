#!/usr/bin/env node
/**
 * Correction complète et propre des 6 erreurs ESLint
 * Réécriture complète des méthodes problématiques
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION COMPLÈTE ESLINT - VERSION PROPRE\n');

// Template setupIASZone propre (pour contact_sensor_vibration et doorbell_button)
const setupIASZoneClean = `  /**
   * Setup IAS Zone (SDK3 Compliant)
   */
  async setupIASZone() {
    this.log('🔐 Setting up IAS Zone...');

    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters?.iasZone) {
      this.log('[INFO] IAS Zone cluster not available');
      return;
    }

    try {
      // Setup Zone Enroll Request listener
      endpoint.clusters.iasZone.onZoneEnrollRequest = async () => {
        this.log('[MSG] Zone Enroll Request received');
        try {
          await endpoint.clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0,
            zoneId: 10
          });
          this.log('[OK] Zone Enroll Response sent');
        } catch (err) {
          this.error('Zone Enroll Response failed:', err.message);
        }
      };

      // Send proactive enrollment response
      await endpoint.clusters.iasZone.zoneEnrollResponse({
        enrollResponseCode: 0,
        zoneId: 10
      });
      this.log('[OK] Proactive enrollment sent');

      // Setup status change listener
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = async (payload) => {
        if (payload?.zoneStatus !== undefined) {
          let status = payload.zoneStatus;
          if (typeof status.valueOf === 'function') {
            status = status.valueOf();
          }
          const alarm = (status & 0x01) !== 0;
          await this.setCapabilityValue('alarm_contact', alarm).catch(this.error);
          this.log(\`[STATUS] Alarm: \${alarm ? 'TRIGGERED' : 'cleared'}\`);
        }
      };

      this.log('[OK] IAS Zone configured');
    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }`;

// Template triggerFlowCard propre (pour thermostats et water_valve)
const triggerFlowCardClean = `  /**
   * Trigger a flow card
   */
  async triggerFlowCard(cardId, tokens = {}) {
    try {
      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);
      await flowCard.trigger(this, tokens).catch(err => this.error(err));
      this.log(\`[OK] Flow triggered: \${cardId}\`, tokens);
    } catch (err) {
      this.error(\`[ERROR] Flow trigger failed: \${cardId}\`, err);
    }
  }`;

const fixes = [
  {
    file: 'drivers/contact_sensor_vibration/device.js',
    type: 'setupIASZone',
    startMarker: /^\s*async setupIASZone\(\) \{/m,
    endMarker: /^\s*async triggerFlowCard/m,
    replacement: setupIASZoneClean + '\n\n'
  },
  {
    file: 'drivers/doorbell_button/device.js',
    type: 'setupIASZone',
    startMarker: /^\s*async setupIASZone\(\) \{/m,
    endMarker: /^\s*}\s*module\.exports/m,
    replacement: setupIASZoneClean + '\n}\n\nmodule.exports'
  },
  {
    file: 'drivers/thermostat_advanced/device.js',
    type: 'triggerFlowCard',
    startMarker: /^\s*async triggerFlowCard\(/m,
    endMarker: /^\s*}\s*}/m,
    replacement: triggerFlowCardClean + '\n}'
  },
  {
    file: 'drivers/thermostat_smart/device.js',
    type: 'triggerFlowCard',
    startMarker: /^\s*async triggerFlowCard\(/m,
    endMarker: /^\s*}\s*}/m,
    replacement: triggerFlowCardClean + '\n}'
  },
  {
    file: 'drivers/thermostat_temperature_control/device.js',
    type: 'triggerFlowCard',
    startMarker: /^\s*async triggerFlowCard\(/m,
    endMarker: /^\s*}\s*}/m,
    replacement: triggerFlowCardClean + '\n}'
  },
  {
    file: 'drivers/water_valve_controller/device.js',
    type: 'triggerFlowCard',
    startMarker: /^\s*async triggerFlowCard\(/m,
    endMarker: /^\s*}\s*}/m,
    replacement: triggerFlowCardClean + '\n}'
  }
];

let success = 0;
let errors = 0;

fixes.forEach(fix => {
  const filePath = path.join(__dirname, fix.file);
  console.log(`📝 ${fix.file}`);
  console.log(`   Type: ${fix.type}`);

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Trouver début
    const startMatch = content.match(fix.startMarker);
    if (!startMatch) {
      console.log('   ❌ Start marker not found');
      errors++;
      return;
    }

    const startIndex = startMatch.index;

    // Trouver fin
    const searchFrom = startIndex + 50;
    const endMatch = content.substring(searchFrom).match(fix.endMarker);
    if (!endMatch) {
      console.log('   ❌ End marker not found');
      errors++;
      return;
    }

    const endIndex = searchFrom + endMatch.index;

    // Remplacer
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);
    content = before + fix.replacement + after;

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('   ✅ Corrigé');
    success++;

  } catch (err) {
    console.log(`   ❌ Erreur: ${err.message}`);
    errors++;
  }

  console.log();
});

console.log('═'.repeat(70));
console.log(`\n✅ ${success} corrigés, ❌ ${errors} erreurs\n`);

if (success === 6) {
  console.log('🎉 TOUS LES FICHIERS CORRIGÉS!\n');
  console.log('⏭️  Prochaine étape: npm run lint\n');
} else {
  console.log('⚠️  Certains fichiers n\'ont pas pu être corrigés automatiquement\n');
}
