#!/usr/bin/env node

/**
 * FLOW EMERGENCY FIXER v5.5.295
 * Correcteur d'urgence pour les IDs doublons créés par l'optimisation
 * Restaure les IDs spécifiques pour switches multi-gang avec fallback intelligent
 */

const fs = require('fs');
const path = require('path');

class FlowEmergencyFixer {
  constructor() {
    this.driversPath = path.join(__dirname, 'drivers');
    this.fixResults = {
      processed: 0,
      fixed: 0,
      errors: 0,
      restoredIds: 0
    };
  }

  /**
   * Fixe d'urgence tous les doublons critiques
   */
  async fixAllDuplicates() {
    console.log('🚨 EMERGENCY FLOW DUPLICATE FIXER STARTING...');

    // Identifier les drivers multi-gang problématiques
    const multiGangDrivers = [
      'switch_wall_5gang',
      'switch_wall_6gang',
      'switch_wall_7gang',
      'switch_wall_8gang',
      'switch_2gang',
      'switch_3gang',
      'switch_4gang'
    ];

    // Fixer chaque driver multi-gang
    for (const driverName of multiGangDrivers) {
      try {
        await this.fixMultiGangDriver(driverName);
        this.fixResults.processed++;
      } catch (error) {
        console.log(`❌ Error fixing ${driverName}: ${error.message}`);
        this.fixResults.errors++;
      }
    }

    this.generateFixReport();
  }

  /**
   * Fixe un driver multi-gang spécifique
   */
  async fixMultiGangDriver(driverName) {
    const driverPath = path.join(this.driversPath, driverName);
    const flowPath = path.join(driverPath, 'driver.flow.compose.json');

    if (!fs.existsSync(flowPath)) return;

    console.log(`🔧 Fixing ${driverName}...`);

    const flows = JSON.parse(fs.readFileSync(flowPath, 'utf8'));

    // Détecter le nombre de gangs
    const gangCount = this.extractGangCount(driverName);

    // Fixer les flows avec IDs spécifiques par gang
    const fixedFlows = this.fixMultiGangFlows(flows, driverName, gangCount);

    // Sauvegarder si des changements ont été faits
    if (JSON.stringify(flows) !== JSON.stringify(fixedFlows)) {
      fs.writeFileSync(flowPath, JSON.stringify(fixedFlows, null, 2));
      this.fixResults.fixed++;
      console.log(`✅ Fixed duplicates in ${driverName}`);
    }
  }

  /**
   * Extrait le nombre de gangs du nom du driver
   */
  extractGangCount(driverName) {
    const match = driverName.match(/(\d+)gang/);
    return match ? parseInt(match[1]) : 1;
  }

  /**
   * Fixe les flows multi-gang avec IDs uniques
   */
  fixMultiGangFlows(flows, driverName, gangCount) {
    const fixed = JSON.parse(JSON.stringify(flows));

    // Fixer les triggers
    if (fixed.triggers) {
      fixed.triggers = this.fixFlowSection(fixed.triggers, driverName, gangCount, 'trigger');
    }

    // Fixer les conditions
    if (fixed.conditions) {
      fixed.conditions = this.fixFlowSection(fixed.conditions, driverName, gangCount, 'condition');
    }

    // Fixer les actions
    if (fixed.actions) {
      fixed.actions = this.fixFlowSection(fixed.actions, driverName, gangCount, 'action');
    }

    return fixed;
  }

  /**
   * Fixe une section de flows (triggers/conditions/actions)
   */
  fixFlowSection(flowArray, driverName, gangCount, flowType) {
    const fixed = [];
    const seenIds = new Map();

    flowArray.forEach(flow => {
      if (!flow.id) {
        fixed.push(flow);
        return;
      }

      // Identifier le type de flow de base
      const baseType = this.identifyBaseFlowType(flow.id, flow);

      if (this.isMultiGangFlow(baseType)) {
        // Créer des flows spécifiques pour chaque gang
        for (let gang = 1; gang <= gangCount; gang++) {
          const gangFlow = this.createGangSpecificFlow(flow, driverName, gang, baseType);
          fixed.push(gangFlow);
        }

        // Ajouter flows spéciaux (all_on, all_off) si nécessaire
        if (baseType === 'is_on' && flowType === 'condition') {
          fixed.push(this.createAllOnCondition(driverName));
          fixed.push(this.createAllOffCondition(driverName));
        }

        this.fixResults.restoredIds += gangCount;
      } else {
        // Garder le flow tel quel s'il n'est pas multi-gang
        const uniqueId = this.ensureUniqueId(flow.id, seenIds);
        if (uniqueId !== flow.id) {
          flow.id = uniqueId;
          this.fixResults.restoredIds++;
        }
        fixed.push(flow);
      }
    });

    return fixed;
  }

  /**
   * Identifie le type de base d'un flow
   */
  identifyBaseFlowType(flowId, flow) {
    // Utiliser le champ _fallback pour identifier le type original
    if (flow._fallback && flow._fallback.originalId) {
      const originalId = flow._fallback.originalId;
      if (originalId.includes('_gang')) {
        return this.extractBaseTypeFromGangId(originalId);
      }
    }

    // Fallback: analyser l'ID actuel
    if (flowId.includes('turned_on')) return 'turned_on';
    if (flowId.includes('turned_off')) return 'turned_off';
    if (flowId.includes('is_on')) return 'is_on';
    if (flowId.includes('turn_on')) return 'turn_on';
    if (flowId.includes('turn_off')) return 'turn_off';
    if (flowId.includes('toggle')) return 'toggle';

    return 'unknown';
  }

  /**
   * Extrait le type de base d'un ID gang original
   */
  extractBaseTypeFromGangId(originalId) {
    if (originalId.includes('_turned_on')) return 'turned_on';
    if (originalId.includes('_turned_off')) return 'turned_off';
    if (originalId.includes('_is_on')) return 'is_on';
    if (originalId.includes('_turn_on')) return 'turn_on';
    if (originalId.includes('_turn_off')) return 'turn_off';
    if (originalId.includes('_toggle')) return 'toggle';
    return 'unknown';
  }

  /**
   * Vérifie si un type de flow nécessite des gangs multiples
   */
  isMultiGangFlow(baseType) {
    const multiGangTypes = ['turned_on', 'turned_off', 'is_on', 'turn_on', 'turn_off', 'toggle'];
    return multiGangTypes.includes(baseType);
  }

  /**
   * Crée un flow spécifique pour un gang
   */
  createGangSpecificFlow(originalFlow, driverName, gangNumber, baseType) {
    const gangFlow = JSON.parse(JSON.stringify(originalFlow));

    // Générer l'ID spécifique pour ce gang
    gangFlow.id = `${driverName}_gang${gangNumber}_${baseType}`;

    // Mettre à jour le titre pour inclure le numéro de gang
    if (gangFlow.title) {
      Object.keys(gangFlow.title).forEach(lang => {
        const baseTitle = gangFlow.title[lang];
        switch (baseType) {
          case 'turned_on':
            gangFlow.title[lang] = `Gang ${gangNumber} ${baseTitle.toLowerCase()}`;
            break;
          case 'turned_off':
            gangFlow.title[lang] = `Gang ${gangNumber} ${baseTitle.toLowerCase()}`;
            break;
          case 'is_on':
            gangFlow.title[lang] = `Gang ${gangNumber} ${baseTitle.toLowerCase()}`;
            break;
          case 'turn_on':
            gangFlow.title[lang] = `${baseTitle} gang ${gangNumber}`;
            break;
          case 'turn_off':
            gangFlow.title[lang] = `${baseTitle} gang ${gangNumber}`;
            break;
          case 'toggle':
            gangFlow.title[lang] = `${baseTitle} gang ${gangNumber}`;
            break;
        }
      });
    }

    // Préserver les métadonnées de fallback
    if (originalFlow._fallback) {
      gangFlow._fallback = {
        ...originalFlow._fallback,
        restoredGang: gangNumber,
        emergencyFix: '5.5.295'
      };
    }

    return gangFlow;
  }

  /**
   * Crée une condition "all on"
   */
  createAllOnCondition(driverName) {
    return {
      id: `${driverName}_all_on`,
      title: {
        en: "All gangs are on",
        fr: "Tous les gangs sont allumés"
      },
      _fallback: {
        emergencyFix: '5.5.295',
        type: 'all_condition'
      }
    };
  }

  /**
   * Crée une condition "all off"
   */
  createAllOffCondition(driverName) {
    return {
      id: `${driverName}_all_off`,
      title: {
        en: "All gangs are off",
        fr: "Tous les gangs sont éteints"
      },
      _fallback: {
        emergencyFix: '5.5.295',
        type: 'all_condition'
      }
    };
  }

  /**
   * Assure l'unicité d'un ID
   */
  ensureUniqueId(originalId, seenIds) {
    let uniqueId = originalId;
    let counter = 1;

    while (seenIds.has(uniqueId)) {
      uniqueId = `${originalId}_${counter}`;
      counter++;
    }

    seenIds.set(uniqueId, true);
    return uniqueId;
  }

  /**
   * Génère le rapport de correction
   */
  generateFixReport() {
    console.log('\n📊 EMERGENCY FIX RESULTS:');
    console.log('═'.repeat(50));
    console.log(`Drivers processed: ${this.fixResults.processed}`);
    console.log(`Drivers fixed: ${this.fixResults.fixed}`);
    console.log(`IDs restored: ${this.fixResults.restoredIds}`);
    console.log(`Errors: ${this.fixResults.errors}`);

    if (this.fixResults.errors === 0) {
      console.log('\n✅ ALL DUPLICATE ISSUES FIXED!');
      console.log('- Multi-gang switches now have unique IDs per gang');
      console.log('- Backward compatibility preserved with _fallback metadata');
      console.log('- Ready for Homey validation');
    } else {
      console.log('\n⚠️ Some issues remain, manual review required');
    }
  }
}

// Exécution d'urgence
if (require.main === module) {
  const fixer = new FlowEmergencyFixer();
  fixer.fixAllDuplicates().catch(console.error);
}

module.exports = FlowEmergencyFixer;
