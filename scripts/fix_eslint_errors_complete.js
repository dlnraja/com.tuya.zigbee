#!/usr/bin/env node
/**
 * Correction complète et automatique des erreurs ESLint parsing
 * Réécrit les méthodes problématiques avec structure propre
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION COMPLÈTE DES ERREURS ESLINT\n');

// Méthode setupIASZone propre pour contact_sensor et doorbell
const setupIASZoneClean = `  async setupIASZone() {
    this.log('🔐 Setting up IAS Zone (SDK3 latest method)...');

    const endpoint = this.zclNode.endpoints[1];

    if (!endpoint?.clusters?.iasZone) {
      this.log('[INFO]  IAS Zone cluster not available');
      return;
    }

    try {
      // Step 1: Setup Zone Enroll Request listener
      endpoint.clusters.iasZone.onZoneEnrollRequest = async () => {
        this.log('[MSG] Zone Enroll Request received');
        try {
          await endpoint.clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0,
            zoneId: 10
          });
          this.log('[OK] Zone Enroll Response sent (zoneId: 10)');
        } catch (err) {
          this.error('Failed to send Zone Enroll Response:', err.message);
        }
      };

      this.log('[OK] Zone Enroll Request listener configured');

      // Step 2: Send proactive Zone Enroll Response
      this.log('[SEND] Sending proactive Zone Enroll Response...');
      await endpoint.clusters.iasZone.zoneEnrollResponse({
        enrollResponseCode: 0,
        zoneId: 10
      });
      this.log('[OK] Proactive Zone Enroll Response sent');

      // Step 3: Setup Zone Status Change listener
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = async (payload) => {
        this.log('[MSG] Zone notification received:', payload);
        if (payload && payload.zoneStatus !== undefined) {
          let status = payload.zoneStatus;
          if (status && typeof status.valueOf === 'function') {
            status = status.valueOf();
          }
          const alarm = (status & 0x01) !== 0;
          await this.setCapabilityValue('alarm_contact', alarm).catch(this.error);
          this.log(\`\${alarm ? '[ALARM]' : '[OK]'} Alarm: \${alarm ? 'TRIGGERED' : 'cleared'}\`);
        }
      };

      this.log('[OK] Zone Status listener configured');

      // Step 4: Setup Zone Status attribute listener
      this.zclNode.endpoints[1].clusters.iasZone.onZoneStatus = async (zoneStatus) => {
        this.log('[DATA] Zone attribute report:', zoneStatus);
        let status = zoneStatus;
        if (status && typeof status.valueOf === 'function') {
          status = status.valueOf();
        }
        const alarm = (status & 0x01) !== 0;
        await this.setCapabilityValue('alarm_contact', alarm).catch(this.error);
      };

      this.log('[OK] IAS Zone configured successfully');
    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }
`;

// Méthode triggerFlowCard propre pour thermostats et water_valve
const triggerFlowCardClean = `  async triggerFlowCard(cardId, tokens = {}) {
    try {
      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);
      await flowCard.trigger(this, tokens).catch(err => this.error(err));
      this.log(\`[OK] Flow triggered: \${cardId}\`, tokens);
    } catch (err) {
      this.error(\`[ERROR] Flow trigger error: \${cardId}\`, err);
    }
  }
`;

const fixes = [
  {
    file: 'drivers/contact_sensor_vibration/device.js',
    searchStart: '  async setupIASZone() {',
    searchEnd: '  async triggerFlowCard(cardId, tokens = {}) {',
    replacement: setupIASZoneClean + '\n',
    description: 'Fix contact_sensor_vibration setupIASZone'
  },
  {
    file: 'drivers/doorbell_button/device.js',
    searchStart: '  async setupIASZone() {',
    searchEnd: '  async triggerFlowCard(cardId, tokens = {}) {',
    replacement: setupIASZoneClean + '\n',
    description: 'Fix doorbell_button setupIASZone'
  },
  {
    file: 'drivers/thermostat_advanced/device.js',
    searchStart: '  async triggerFlowCard(cardId, tokens = {}) {',
    searchEnd: '  async checkAnyAlarm() {',
    replacement: triggerFlowCardClean + '\n',
    description: 'Fix thermostat_advanced triggerFlowCard'
  },
  {
    file: 'drivers/thermostat_smart/device.js',
    searchStart: '  async triggerFlowCard(cardId, tokens = {}) {',
    searchEnd: '  async checkAnyAlarm() {',
    replacement: triggerFlowCardClean + '\n',
    description: 'Fix thermostat_smart triggerFlowCard'
  },
  {
    file: 'drivers/thermostat_temperature_control/device.js',
    searchStart: '  async triggerFlowCard(cardId, tokens = {}) {',
    searchEnd: '  async checkAnyAlarm() {',
    replacement: triggerFlowCardClean + '\n',
    description: 'Fix thermostat_temperature_control triggerFlowCard'
  },
  {
    file: 'drivers/water_valve_controller/device.js',
    searchStart: '  async triggerFlowCard(cardId, tokens = {}) {',
    searchEnd: '  async checkAnyAlarm() {',
    replacement: triggerFlowCardClean + '\n',
    description: 'Fix water_valve_controller triggerFlowCard'
  }
];

const results = { success: [], errors: [], skipped: [] };

function fixFile(fixConfig) {
  const filePath = path.join(__dirname, fixConfig.file);

  console.log(`📝 ${fixConfig.description}`);
  console.log(`   Fichier: ${fixConfig.file}`);

  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  Fichier introuvable`);
    results.skipped.push(fixConfig.file);
    console.log('');
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Trouver les indices
    const startIdx = content.indexOf(fixConfig.searchStart);
    const endIdx = content.indexOf(fixConfig.searchEnd, startIdx + 1);

    if (startIdx === -1) {
      console.log(`   ⊗ Méthode start non trouvée - peut-être déjà corrigée`);
      results.skipped.push(fixConfig.file);
      console.log('');
      return;
    }

    if (endIdx === -1) {
      console.log(`   ⚠️  Méthode end non trouvée`);
      results.errors.push({ file: fixConfig.file, error: 'End marker not found' });
      console.log('');
      return;
    }

    // Remplacer la section
    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx);
    const newContent = before + fixConfig.replacement + after;

    // Sauvegarder
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`   ✅ Méthode réécrite proprement`);
    results.success.push(fixConfig.file);

  } catch (err) {
    console.log(`   ❌ Erreur: ${err.message}`);
    results.errors.push({ file: fixConfig.file, error: err.message });
  }

  console.log('');
}

// Exécuter
console.log('🔄 DÉBUT DES CORRECTIONS\n');
console.log('═'.repeat(60));
console.log('');

fixes.forEach(fixFile);

// Rapport final
console.log('═'.repeat(60));
console.log('\n📊 RAPPORT FINAL\n');

console.log(`✅ Succès: ${results.success.length}`);
results.success.forEach(f => console.log(`   - ${f}`));
console.log('');

console.log(`⊗ Ignorés: ${results.skipped.length}`);
results.skipped.forEach(f => console.log(`   - ${f}`));
console.log('');

console.log(`❌ Erreurs: ${results.errors.length}`);
results.errors.forEach(e => console.log(`   - ${e.file}: ${e.error}`));
console.log('');

if (results.success.length > 0) {
  console.log('✅ CORRECTIONS APPLIQUÉES!');
  console.log('');
  console.log('⏭️  PROCHAINES ÉTAPES:');
  console.log('   1. Vérifier: npm run lint');
  console.log('   2. Valider: npx homey app validate --level publish');
  console.log('   3. Si OK: git add . && git commit -m "fix: Correct all ESLint parsing errors"');
} else {
  console.log('⚠️  Aucune correction appliquée - vérifier manuellement');
}

console.log('');
console.log('✨ FIN DU TRAITEMENT');
