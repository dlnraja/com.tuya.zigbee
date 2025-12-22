#!/usr/bin/env node
'use strict';

/**
 * 🧪 Script de test - DeviceTypeManager
 * Valide le fonctionnement du changement de type device et logique d'inversion
 *
 * Usage: node scripts/test/test_device_type_manager.js
 */

const path = require('path');

// Mock du contexte Homey pour les tests
global.Homey = {
  __: (key, tokens) => {
    const translations = {
      'device_type.light': '💡 Éclairage',
      'device_type.radiator': '🔥 Radiateur électrique',
      'device_type.fan': '🌀 Ventilation',
      'device_type.other': '⚙️ Autre appareil'
    };
    return translations[key] || key;
  }
};

// Importer DeviceTypeManager
const DeviceTypeManager = require('../../lib/devices/DeviceTypeManager');

class TestDeviceTypeManager {
  constructor() {
    this.manager = new DeviceTypeManager();
    this.testResults = [];
  }

  log(message, success = true) {
    const status = success ? '✅' : '❌';
    console.log(`${status} ${message}`);
    this.testResults.push({ message, success });
  }

  async runTests() {
    console.log('🧪 🔥 DÉMARRAGE TESTS DEVICETYPEMANAGER...');
    console.log('');

    await this.testDeviceTypeConfig();
    await this.testLogicInversion();
    await this.testEnergyMonitoring();
    await this.testDeviceTypeOptions();
    await this.testSettingsGeneration();
    await this.testEdgeCases();

    this.printSummary();
  }

  async testDeviceTypeConfig() {
    console.log('📋 === TEST CONFIGURATION TYPES DEVICE ===');

    // Test types valides
    const validTypes = ['light', 'radiator', 'fan', 'other'];
    validTypes.forEach(type => {
      const config = this.manager.getDeviceTypeConfig(type);
      const hasRequiredFields = config.name && config.icon && config.hasOwnProperty('invertLogic');
      this.log(`Type ${type}: Configuration complète`, hasRequiredFields);
    });

    // Test type invalide
    const invalidConfig = this.manager.getDeviceTypeConfig('invalid');
    this.log(`Type invalide: Retourne config par défaut (light)`, invalidConfig.name.includes('Éclairage'));

    console.log('');
  }

  async testLogicInversion() {
    console.log('🔄 === TEST LOGIQUE INVERSION ===');

    // Test radiateur - doit inverser
    const radiatorTrue = this.manager.applyDeviceLogic(true, 'radiator');
    const radiatorFalse = this.manager.applyDeviceLogic(false, 'radiator');
    this.log(`Radiateur ON→OFF: ${true}→${radiatorTrue}`, radiatorTrue === false);
    this.log(`Radiateur OFF→ON: ${false}→${radiatorFalse}`, radiatorFalse === true);

    // Test light - ne doit pas inverser
    const lightTrue = this.manager.applyDeviceLogic(true, 'light');
    const lightFalse = this.manager.applyDeviceLogic(false, 'light');
    this.log(`Éclairage ON→ON: ${true}→${lightTrue}`, lightTrue === true);
    this.log(`Éclairage OFF→OFF: ${false}→${lightFalse}`, lightFalse === false);

    // Test fan - ne doit pas inverser
    const fanTrue = this.manager.applyDeviceLogic(true, 'fan');
    this.log(`Ventilation ON→ON: ${true}→${fanTrue}`, fanTrue === true);

    // Test other - ne doit pas inverser
    const otherFalse = this.manager.applyDeviceLogic(false, 'other');
    this.log(`Autre OFF→OFF: ${false}→${otherFalse}`, otherFalse === false);

    console.log('');
  }

  async testEnergyMonitoring() {
    console.log('⚡ === TEST SURVEILLANCE ÉNERGIE ===');

    // Test support monitoring par type
    const lightSupport = this.manager.supportsEnergyMonitoring('light');
    const radiatorSupport = this.manager.supportsEnergyMonitoring('radiator');
    const fanSupport = this.manager.supportsEnergyMonitoring('fan');
    const otherSupport = this.manager.supportsEnergyMonitoring('other');

    this.log(`Éclairage: Support énergie`, lightSupport === true);
    this.log(`Radiateur: Pas de support énergie`, radiatorSupport === false);
    this.log(`Ventilation: Support énergie`, fanSupport === true);
    this.log(`Autre: Support énergie`, otherSupport === true);

    console.log('');
  }

  async testDeviceTypeOptions() {
    console.log('📱 === TEST OPTIONS INTERFACE ===');

    const options = this.manager.getDeviceTypeOptions();
    this.log(`Nombre d'options: ${options.length}`, options.length === 4);

    // Vérifier structure des options
    const validOptions = options.every(option =>
      option.id && option.label && typeof option.label === 'string'
    );
    this.log(`Structure options valide`, validOptions);

    // Vérifier icônes présentes
    const hasIcons = options.every(option =>
      option.label.includes('💡') ||
      option.label.includes('🔥') ||
      option.label.includes('🌀') ||
      option.label.includes('⚙️')
    );
    this.log(`Icônes présentes dans toutes les options`, hasIcons);

    console.log('');
  }

  async testSettingsGeneration() {
    console.log('⚙️ === TEST GÉNÉRATION SETTINGS ===');

    const settings = this.manager.generateSettingsConfig();

    // Vérifier structure groupe
    const isGroup = settings.type === 'group';
    this.log(`Type groupe valide`, isGroup);

    // Vérifier children
    const hasChildren = Array.isArray(settings.children) && settings.children.length === 2;
    this.log(`Children valides (2 éléments)`, hasChildren);

    if (hasChildren) {
      // Vérifier device_type dropdown
      const deviceTypeSetting = settings.children[0];
      const isDeviceTypeValid = deviceTypeSetting.id === 'device_type' &&
        deviceTypeSetting.type === 'dropdown' &&
        Array.isArray(deviceTypeSetting.values) &&
        deviceTypeSetting.values.length === 4;
      this.log(`Setting device_type valide`, isDeviceTypeValid);

      // Vérifier invert_logic_manual checkbox
      const manualSetting = settings.children[1];
      const isManualValid = manualSetting.id === 'invert_logic_manual' &&
        manualSetting.type === 'checkbox' &&
        manualSetting.value === false;
      this.log(`Setting inversion manuelle valide`, isManualValid);
    }

    console.log('');
  }

  async testEdgeCases() {
    console.log('🔍 === TEST CAS LIMITES ===');

    // Test valeurs nulles/undefined
    const nullResult = this.manager.applyDeviceLogic(null, 'radiator');
    this.log(`Valeur null gérée`, nullResult === null);

    const undefinedResult = this.manager.applyDeviceLogic(undefined, 'light');
    this.log(`Valeur undefined gérée`, undefinedResult === undefined);

    // Test type inexistant
    const unknownTypeResult = this.manager.applyDeviceLogic(true, 'unknown_type');
    this.log(`Type inconnu: pas d'inversion`, unknownTypeResult === true);

    // Test validation type
    const validType = this.manager.isValidDeviceType('radiator');
    const invalidType = this.manager.isValidDeviceType('invalid');
    this.log(`Validation type valide`, validType === true);
    this.log(`Validation type invalide`, invalidType === false);

    // Test icône type
    const radiatorIcon = this.manager.getDeviceIcon('radiator');
    const unknownIcon = this.manager.getDeviceIcon('unknown');
    this.log(`Icône radiateur: 🔥`, radiatorIcon === '🔥');
    this.log(`Icône inconnue: défaut ⚙️`, unknownIcon === '⚙️');

    console.log('');
  }

  printSummary() {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.success).length;
    const failed = total - passed;

    console.log('📊 === RÉSUMÉ TESTS DEVICETYPEMANAGER ===');
    console.log(`✅ Tests réussis: ${passed}`);
    console.log(`❌ Tests échoués: ${failed}`);
    console.log(`📈 Taux de réussite: ${Math.round((passed / total) * 100)}%`);
    console.log('');

    if (failed > 0) {
      console.log('❌ ÉCHECS DÉTECTÉS:');
      this.testResults.filter(r => !r.success).forEach(result => {
        console.log(`   - ${result.message}`);
      });
      console.log('');
    }

    if (passed === total) {
      console.log('🎉 TOUS LES TESTS SONT PASSÉS!');
      console.log('🔥 DeviceTypeManager fonctionne correctement');
      console.log('🏠 Prêt pour utilisation avec radiateurs électriques');
    } else {
      console.log('⚠️ CERTAINS TESTS ONT ÉCHOUÉ');
      console.log('🔧 Correction nécessaire avant déploiement');
    }

    return failed === 0;
  }
}

async function main() {
  const tester = new TestDeviceTypeManager();
  const success = await tester.runTests();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TestDeviceTypeManager;
