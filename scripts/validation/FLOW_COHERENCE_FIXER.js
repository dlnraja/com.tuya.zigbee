#!/usr/bin/env node
/**
 * FLOW COHERENCE FIXER - Automatic Corrections
 * Synchronise flow/ avec app.json et ajoute args manquants
 */

const fs = require('fs');
const path = require('path');

class FlowCoherenceFixer {
  constructor() {
    this.rootPath = path.join(__dirname, '../..');
    this.flowPath = path.join(this.rootPath, 'flow');
    this.appJsonPath = path.join(this.rootPath, 'app.json');
    
    this.stats = {
      triggersAdded: 0,
      actionsAdded: 0,
      conditionsAdded: 0,
      argsAdded: 0,
      translationsAdded: 0
    };
  }

  log(msg, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${msg}${colors.reset}`);
  }

  /**
   * Extract driver ID from flow ID
   */
  extractDriverId(flowId) {
    // button_wireless_2_button_pressed → button_wireless_2
    // usb_outlet_3gang_port1_turned_on → usb_outlet_3gang
    
    const patterns = [
      /_button_\d+_pressed$/,
      /_button_pressed$/,
      /_turned_on$/,
      /_turned_off$/,
      /_port\d+_turned_on$/,
      /_port\d+_turned_off$/,
      /_measure_\w+_changed$/
    ];

    let driverId = flowId;
    patterns.forEach(pattern => {
      driverId = driverId.replace(pattern, '');
    });

    return driverId;
  }

  /**
   * Add device args to flow card
   */
  addDeviceArgs(flowCard) {
    const driverId = this.extractDriverId(flowCard.id);
    
    // Skip generic flows (battery_low, etc)
    if (!flowCard.id.includes('_') || flowCard.id.startsWith('battery_') || 
        flowCard.id.startsWith('power_source_')) {
      return flowCard;
    }

    // Add args if missing
    if (!flowCard.args || flowCard.args.length === 0) {
      flowCard.args = [
        {
          type: 'device',
          name: 'device',
          filter: `driver_id=${driverId}`
        }
      ];
      this.stats.argsAdded++;
    }

    return flowCard;
  }

  /**
   * Add French translations
   */
  addFrenchTranslations(flowCard) {
    if (!flowCard.title) return flowCard;

    // Add French if missing
    if (flowCard.title.en && !flowCard.title.fr) {
      const translations = {
        'Button pressed': 'Bouton pressé',
        'Button 1 pressed': 'Bouton 1 pressé',
        'Button 2 pressed': 'Bouton 2 pressé',
        'Button 3 pressed': 'Bouton 3 pressé',
        'Button 4 pressed': 'Bouton 4 pressé',
        'Button 5 pressed': 'Bouton 5 pressé',
        'Button 6 pressed': 'Bouton 6 pressé',
        'Button 7 pressed': 'Bouton 7 pressé',
        'Button 8 pressed': 'Bouton 8 pressé',
        'Turned on': 'Allumé',
        'Turned off': 'Éteint',
        'Port 1 turned on': 'Port 1 allumé',
        'Port 1 turned off': 'Port 1 éteint',
        'Port 2 turned on': 'Port 2 allumé',
        'Port 2 turned off': 'Port 2 éteint',
        'Port 3 turned on': 'Port 3 allumé',
        'Port 3 turned off': 'Port 3 éteint'
      };

      if (translations[flowCard.title.en]) {
        flowCard.title.fr = translations[flowCard.title.en];
        this.stats.translationsAdded++;
      }
    }

    return flowCard;
  }

  /**
   * Sync flows to app.json
   */
  syncFlowsToAppJson() {
    this.log('\n📝 Syncing flows to app.json...', 'info');

    const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
    
    if (!appJson.flow) {
      appJson.flow = {};
    }

    // Sync triggers
    const triggersPath = path.join(this.flowPath, 'triggers.json');
    if (fs.existsSync(triggersPath)) {
      let triggers = JSON.parse(fs.readFileSync(triggersPath, 'utf8'));
      
      // Process each trigger
      triggers = triggers.map(trigger => {
        trigger = this.addDeviceArgs(trigger);
        trigger = this.addFrenchTranslations(trigger);
        return trigger;
      });

      // Save back to flow/triggers.json
      fs.writeFileSync(triggersPath, JSON.stringify(triggers, null, 2), 'utf8');

      // Add to app.json
      appJson.flow.triggers = [...(appJson.flow.triggers || []), ...triggers];
      
      // Remove duplicates
      const uniqueTriggers = [];
      const seenIds = new Set();
      
      appJson.flow.triggers.forEach(t => {
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id);
          uniqueTriggers.push(t);
        }
      });
      
      appJson.flow.triggers = uniqueTriggers;
      this.stats.triggersAdded = triggers.length;
      
      this.log(`   ✅ Added ${triggers.length} triggers to app.json`, 'success');
    }

    // Sync actions
    const actionsPath = path.join(this.flowPath, 'actions.json');
    if (fs.existsSync(actionsPath)) {
      let actions = JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
      
      actions = actions.map(action => {
        action = this.addDeviceArgs(action);
        action = this.addFrenchTranslations(action);
        return action;
      });

      fs.writeFileSync(actionsPath, JSON.stringify(actions, null, 2), 'utf8');

      appJson.flow.actions = [...(appJson.flow.actions || []), ...actions];
      
      // Remove duplicates
      const uniqueActions = [];
      const seenIds = new Set();
      
      appJson.flow.actions.forEach(a => {
        if (!seenIds.has(a.id)) {
          seenIds.add(a.id);
          uniqueActions.push(a);
        }
      });
      
      appJson.flow.actions = uniqueActions;
      this.stats.actionsAdded = actions.length;
      
      this.log(`   ✅ Added ${actions.length} actions to app.json`, 'success');
    }

    // Sync conditions
    const conditionsPath = path.join(this.flowPath, 'conditions.json');
    if (fs.existsSync(conditionsPath)) {
      let conditions = JSON.parse(fs.readFileSync(conditionsPath, 'utf8'));
      
      conditions = conditions.map(condition => {
        condition = this.addDeviceArgs(condition);
        condition = this.addFrenchTranslations(condition);
        return condition;
      });

      fs.writeFileSync(conditionsPath, JSON.stringify(conditions, null, 2), 'utf8');

      appJson.flow.conditions = [...(appJson.flow.conditions || []), ...conditions];
      
      // Remove duplicates
      const uniqueConditions = [];
      const seenIds = new Set();
      
      appJson.flow.conditions.forEach(c => {
        if (!seenIds.has(c.id)) {
          seenIds.add(c.id);
          uniqueConditions.push(c);
        }
      });
      
      appJson.flow.conditions = uniqueConditions;
      this.stats.conditionsAdded = conditions.length;
      
      this.log(`   ✅ Added ${conditions.length} conditions to app.json`, 'success');
    }

    // Save app.json
    fs.writeFileSync(this.appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
    this.log('   ✅ app.json updated', 'success');
  }

  /**
   * Main execution
   */
  async run() {
    this.log('\n🔧 FLOW COHERENCE FIXER - Starting...', 'info');
    this.log('='.repeat(80) + '\n', 'info');

    try {
      this.syncFlowsToAppJson();

      // Summary
      this.log('\n' + '='.repeat(80), 'info');
      this.log('📊 FLOW COHERENCE FIXER - SUMMARY', 'info');
      this.log('='.repeat(80) + '\n', 'info');

      console.log(`   Triggers added: ${this.stats.triggersAdded}`);
      console.log(`   Actions added: ${this.stats.actionsAdded}`);
      console.log(`   Conditions added: ${this.stats.conditionsAdded}`);
      console.log(`   Device args added: ${this.stats.argsAdded}`);
      console.log(`   Translations added: ${this.stats.translationsAdded}`);

      this.log('\n✅ Flow coherence fixed!', 'success');
      this.log('='.repeat(80) + '\n', 'info');

    } catch (err) {
      this.log(`\n❌ Error: ${err.message}`, 'error');
      throw err;
    }
  }
}

// Run
if (require.main === module) {
  const fixer = new FlowCoherenceFixer();
  fixer.run().catch(console.error);
}

module.exports = FlowCoherenceFixer;
