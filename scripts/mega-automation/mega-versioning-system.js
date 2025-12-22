#!/usr/bin/env node

/**
 * 📈 MEGA VERSIONING SYSTEM v1.0.0
 *
 * Système de versioning intelligent pour MEGA automation:
 * - Gestion versions automatique selon importance des changements
 * - Mise à jour changelog multilingue avec détails integration
 * - Versioning sémantique basé sur types de devices intégrés
 * - Compatible avec .homeycompose/ structure SDK3
 */

const fs = require('fs').promises;
const path = require('path');

class MegaVersioningSystem {
  constructor() {
    this.config = {
      // Règles de versioning selon types de changements
      versioningRules: {
        major: {
          triggers: [
            'breaking_changes',
            'sdk_upgrade',
            'architecture_change'
          ],
          increment: [1, 0, 0] // major.minor.patch
        },
        minor: {
          triggers: [
            'new_device_categories',
            'new_features',
            'flow_additions',
            'capability_additions'
          ],
          increment: [0, 1, 0]
        },
        patch: {
          triggers: [
            'device_additions',
            'manufacturer_ids',
            'bug_fixes',
            'performance_improvements'
          ],
          increment: [0, 0, 1]
        }
      },

      // Templates changelog multilingues
      changelogTemplates: {
        mega_integration: {
          en: "MEGA AUTO-INTEGRATION: {deviceCount} devices from {sourceCount} sources - {details}. Automated via MEGA system with complete features integration (flows, capabilities, datapoints).",
          fr: "MEGA AUTO-INTÉGRATION: {deviceCount} appareils de {sourceCount} sources - {details}. Automatisé via système MEGA avec intégration complète des fonctionnalités (flows, capacités, datapoints).",
          nl: "MEGA AUTO-INTEGRATIE: {deviceCount} apparaten van {sourceCount} bronnen - {details}. Geautomatiseerd via MEGA-systeem met volledige functie-integratie.",
          de: "MEGA AUTO-INTEGRATION: {deviceCount} Geräte aus {sourceCount} Quellen - {details}. Automatisiert über MEGA-System mit vollständiger Feature-Integration.",
          it: "MEGA AUTO-INTEGRAZIONE: {deviceCount} dispositivi da {sourceCount} fonti - {details}. Automatizzato tramite sistema MEGA con integrazione completa delle funzionalità.",
          es: "MEGA AUTO-INTEGRACIÓN: {deviceCount} dispositivos de {sourceCount} fuentes - {details}. Automatizado mediante sistema MEGA con integración completa de características.",
          da: "MEGA AUTO-INTEGRATION: {deviceCount} enheder fra {sourceCount} kilder - {details}. Automatiseret via MEGA-system med komplet funktionsintegration."
        }
      }
    };

    // Arguments
    this.integrationSummary = this.parseIntegrationSummary();

    this.results = {
      currentVersion: null,
      newVersion: null,
      versionType: null,
      changelogUpdated: false,
      appJsonUpdated: false,
      homeycomposeUpdated: false,
      errors: []
    };
  }

  /**
   * 📝 Parser integration summary
   */
  parseIntegrationSummary() {
    const summaryArg = process.argv.find(arg => arg.startsWith('--integration-summary='));
    if (summaryArg) {
      try {
        return JSON.parse(summaryArg.split('=')[1]);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * 📝 Logger compatible GitHub Actions
   */
  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();

    if (process.env.GITHUB_ACTIONS === 'true') {
      switch (level.toUpperCase()) {
        case 'ERROR':
          console.log(`::error::${message}`);
          break;
        case 'WARN':
          console.log(`::warning::${message}`);
          break;
        case 'SUCCESS':
          console.log(`::notice::✅ ${message}`);
          break;
        default:
          console.log(`[${timestamp}] ${message}`);
      }
    } else {
      console.log(`[${timestamp}] [${level}] ${message}`);
    }

    if (data) console.log(JSON.stringify(data, null, 2));
  }

  /**
   * 📖 Lire version actuelle depuis app.json
   */
  async getCurrentVersion() {
    try {
      const appJsonPath = path.join(process.cwd(), 'app.json');
      const content = await fs.readFile(appJsonPath, 'utf8');
      const appConfig = JSON.parse(content);

      this.results.currentVersion = appConfig.version;
      await this.log('INFO', `📖 Current version: ${this.results.currentVersion}`);

      return this.results.currentVersion;

    } catch (error) {
      await this.log('ERROR', 'Failed to read current version:', error);
      throw error;
    }
  }

  /**
   * 🎯 Déterminer type de version selon changements
   */
  determineVersionType() {
    if (!this.integrationSummary) {
      // Fallback: patch version pour ajouts device simples
      return 'patch';
    }

    const summary = this.integrationSummary;

    // Major version: changements architecturaux
    if (summary.driversModified > 10 || summary.status === 'partial') {
      return 'major';
    }

    // Minor version: nouvelles fonctionnalités importantes
    if (summary.capabilitiesAdded > 0 || summary.flowsCreated > 0 || summary.featuresIntegrated > 50) {
      return 'minor';
    }

    // Patch version: ajouts devices simples
    return 'patch';
  }

  /**
   * 📈 Calculer nouvelle version
   */
  calculateNewVersion(currentVersion, versionType) {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    const rules = this.config.versioningRules[versionType];

    if (!rules) {
      throw new Error(`Unknown version type: ${versionType}`);
    }

    const [majorInc, minorInc, patchInc] = rules.increment;

    let newMajor = major + majorInc;
    let newMinor = minor + minorInc;
    let newPatch = patch + patchInc;

    // Reset minor/patch si major increment
    if (majorInc > 0) {
      newMinor = 0;
      newPatch = 0;
    }
    // Reset patch si minor increment
    else if (minorInc > 0) {
      newPatch = 0;
    }

    return `${newMajor}.${newMinor}.${newPatch}`;
  }

  /**
   * ✍️ Générer entrée changelog
   */
  generateChangelogEntry() {
    const template = this.config.changelogTemplates.mega_integration;

    // Données depuis integration summary
    const deviceCount = this.integrationSummary?.devicesIntegrated || 0;
    const sourceCount = this.integrationSummary?.driversModified || 0;

    // Générer détails selon les changements
    let details = [];

    if (this.integrationSummary) {
      if (this.integrationSummary.capabilitiesAdded > 0) {
        details.push(`${this.integrationSummary.capabilitiesAdded} capabilities`);
      }
      if (this.integrationSummary.flowsCreated > 0) {
        details.push(`${this.integrationSummary.flowsCreated} flows`);
      }
      if (this.integrationSummary.featuresIntegrated > 0) {
        details.push(`${this.integrationSummary.featuresIntegrated} features`);
      }
      if (this.integrationSummary.validationsPassed > 0) {
        details.push(`${this.integrationSummary.validationsPassed} validations`);
      }
    }

    const detailsText = details.length > 0 ? details.join(', ') : 'complete device support';

    // Générer entrées multilingues
    const changelogEntry = {};

    for (const [lang, templateText] of Object.entries(template)) {
      changelogEntry[lang] = templateText
        .replace('{deviceCount}', deviceCount)
        .replace('{sourceCount}', sourceCount)
        .replace('{details}', detailsText);
    }

    return changelogEntry;
  }

  /**
   * 📝 Mettre à jour changelog
   */
  async updateChangelog() {
    try {
      const changelogPath = path.join(process.cwd(), '.homeychangelog.json');

      // Lire changelog existant
      let changelog = {};
      try {
        const content = await fs.readFile(changelogPath, 'utf8');
        changelog = JSON.parse(content);
      } catch (error) {
        await this.log('INFO', 'Creating new changelog file');
        changelog = {};
      }

      // Générer nouvelle entrée
      const changelogEntry = this.generateChangelogEntry();
      changelog[this.results.newVersion] = changelogEntry;

      // Sauvegarder
      await fs.writeFile(changelogPath, JSON.stringify(changelog, null, 2));

      this.results.changelogUpdated = true;
      await this.log('SUCCESS', `📝 Changelog updated for version ${this.results.newVersion}`);

    } catch (error) {
      await this.log('ERROR', 'Failed to update changelog:', error);
      this.results.errors.push(`Changelog update: ${error.message}`);
    }
  }

  /**
   * 📦 Mettre à jour app.json
   */
  async updateAppJson() {
    try {
      const appJsonPath = path.join(process.cwd(), 'app.json');
      const content = await fs.readFile(appJsonPath, 'utf8');
      const appConfig = JSON.parse(content);

      // Mettre à jour version
      appConfig.version = this.results.newVersion;

      // Ajouter metadata MEGA automation
      if (!appConfig.mega_automation) {
        appConfig.mega_automation = {};
      }

      appConfig.mega_automation.lastUpdate = new Date().toISOString();
      appConfig.mega_automation.versionType = this.results.versionType;

      if (this.integrationSummary) {
        appConfig.mega_automation.lastIntegration = {
          devicesIntegrated: this.integrationSummary.devicesIntegrated,
          driversModified: this.integrationSummary.driversModified,
          featuresIntegrated: this.integrationSummary.featuresIntegrated,
          timestamp: this.integrationSummary.timestamp
        };
      }

      // Sauvegarder
      await fs.writeFile(appJsonPath, JSON.stringify(appConfig, null, 2));

      this.results.appJsonUpdated = true;
      await this.log('SUCCESS', `📦 app.json updated to version ${this.results.newVersion}`);

    } catch (error) {
      await this.log('ERROR', 'Failed to update app.json:', error);
      this.results.errors.push(`app.json update: ${error.message}`);
    }
  }

  /**
   * 🏗️ Mettre à jour .homeycompose/app.json (SDK3)
   */
  async updateHomeycompose() {
    try {
      const homeycomposePath = path.join(process.cwd(), '.homeycompose', 'app.json');

      // Vérifier si .homeycompose existe (critique selon mémoire)
      try {
        await fs.access(path.dirname(homeycomposePath));
      } catch {
        await this.log('WARN', '.homeycompose directory not found - creating it');
        await fs.mkdir(path.dirname(homeycomposePath), { recursive: true });
      }

      // Lire ou créer .homeycompose/app.json
      let homeycomposeConfig = {};
      try {
        const content = await fs.readFile(homeycomposePath, 'utf8');
        homeycomposeConfig = JSON.parse(content);
      } catch {
        await this.log('INFO', 'Creating new .homeycompose/app.json');

        // Copier depuis app.json principal
        const mainAppPath = path.join(process.cwd(), 'app.json');
        const mainContent = await fs.readFile(mainAppPath, 'utf8');
        homeycomposeConfig = JSON.parse(mainContent);
      }

      // Mettre à jour version
      homeycomposeConfig.version = this.results.newVersion;

      // Sauvegarder
      await fs.writeFile(homeycomposePath, JSON.stringify(homeycomposeConfig, null, 2));

      this.results.homeycomposeUpdated = true;
      await this.log('SUCCESS', `🏗️ .homeycompose/app.json updated to version ${this.results.newVersion}`);

    } catch (error) {
      await this.log('ERROR', 'Failed to update .homeycompose/app.json:', error);
      this.results.errors.push(`homeycompose update: ${error.message}`);
    }
  }

  /**
   * 📊 Générer rapport versioning
   */
  async generateVersioningReport() {
    const reportPath = path.join(process.cwd(), 'logs', 'mega-automation', `versioning-${Date.now()}.log`);

    await fs.mkdir(path.dirname(reportPath), { recursive: true });

    const report = `
MEGA VERSIONING SYSTEM REPORT
=============================

Timestamp: ${new Date().toISOString()}
Previous Version: ${this.results.currentVersion}
New Version: ${this.results.newVersion}
Version Type: ${this.results.versionType}

INTEGRATION SUMMARY:
${this.integrationSummary ? JSON.stringify(this.integrationSummary, null, 2) : 'No integration summary provided'}

UPDATES PERFORMED:
- Changelog Updated: ${this.results.changelogUpdated}
- app.json Updated: ${this.results.appJsonUpdated}
- .homeycompose Updated: ${this.results.homeycomposeUpdated}

ERRORS: ${this.results.errors.length}
${this.results.errors.join('\n')}

VERSIONING RULES APPLIED:
- Type: ${this.results.versionType}
- Increment: ${this.config.versioningRules[this.results.versionType]?.increment?.join('.') || 'unknown'}
`;

    await fs.writeFile(reportPath, report);
    await this.log('INFO', `📊 Versioning report saved to ${reportPath}`);
  }

  /**
   * 🚀 Exécution principale
   */
  async execute() {
    try {
      await this.log('INFO', '🚀 Starting MEGA Versioning System');

      // 1. Lire version actuelle
      await this.getCurrentVersion();

      // 2. Déterminer type de version
      this.results.versionType = this.determineVersionType();
      await this.log('INFO', `🎯 Version type determined: ${this.results.versionType}`);

      // 3. Calculer nouvelle version
      this.results.newVersion = this.calculateNewVersion(this.results.currentVersion, this.results.versionType);
      await this.log('INFO', `📈 New version: ${this.results.currentVersion} → ${this.results.newVersion}`);

      // 4. Mettre à jour changelog
      await this.updateChangelog();

      // 5. Mettre à jour app.json
      await this.updateAppJson();

      // 6. Mettre à jour .homeycompose (SDK3 critique)
      await this.updateHomeycompose();

      // 7. Générer rapport
      await this.generateVersioningReport();

      await this.log('SUCCESS', `✅ MEGA Versioning completed: ${this.results.newVersion} (${this.results.versionType})`);

      return this.results;

    } catch (error) {
      await this.log('ERROR', '❌ MEGA Versioning System failed:', error);
      this.results.errors.push(error.message);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const versioningSystem = new MegaVersioningSystem();

  versioningSystem.execute()
    .then(results => {
      console.log('✅ MEGA Versioning completed:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ MEGA Versioning failed:', error);
      process.exit(1);
    });
}

module.exports = MegaVersioningSystem;
