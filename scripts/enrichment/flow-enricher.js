#!/usr/bin/env node
'use strict';

/**
 * FLOW ENRICHER MODULE
 * Module intelligent pour enrichissement des flows
 */

const fs = require('fs');
const path = require('path');

class FlowEnricher {
  constructor(appJsonPath) {
    this.appJsonPath = appJsonPath;
    this.appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    this.enrichments = [];
  }

  // Templates de flows intelligents
  getFlowTemplates() {
    return {
      motion: {
        trigger: {
          id: 'motion_detected',
          title: { en: 'Motion detected' },
          tokens: [
            { name: 'device', type: 'string', title: { en: 'Device' } },
            { name: 'timestamp', type: 'string', title: { en: 'Timestamp' } }
          ]
        },
        condition: {
          id: 'is_motion_active',
          title: { en: 'Motion is active' }
        }
      },
      
      temperature: {
        trigger: {
          id: 'temperature_changed',
          title: { en: 'Temperature changed' },
          tokens: [
            { name: 'temperature', type: 'number', title: { en: 'Temperature' } },
            { name: 'unit', type: 'string', title: { en: 'Unit' } }
          ]
        },
        condition: {
          id: 'temperature_above',
          title: { en: 'Temperature is above' },
          args: [{
            name: 'threshold',
            type: 'number',
            placeholder: { en: 'Temperature' }
          }]
        }
      },
      
      button: {
        trigger: {
          id: 'button_pressed',
          title: { en: 'Button pressed' },
          tokens: [
            { name: 'button', type: 'string', title: { en: 'Button' } },
            { name: 'action', type: 'string', title: { en: 'Action' } }
          ]
        }
      },
      
      alarm: {
        trigger: {
          id: 'alarm_triggered',
          title: { en: 'Alarm triggered' },
          tokens: [
            { name: 'type', type: 'string', title: { en: 'Alarm Type' } },
            { name: 'state', type: 'boolean', title: { en: 'State' } }
          ]
        },
        condition: {
          id: 'alarm_is_active',
          title: { en: 'Alarm is active' }
        },
        action: {
          id: 'reset_alarm',
          title: { en: 'Reset alarm' }
        }
      }
    };
  }

  // Enrichir flows existants
  enrichFlows() {
    console.log('⚡ Flow Enricher Module');
    console.log('═'.repeat(60));

    if (!this.appJson.flow) {
      this.appJson.flow = {};
    }

    const templates = this.getFlowTemplates();
    let enriched = 0;

    // Ajouter triggers manquants
    if (!this.appJson.flow.triggers) {
      this.appJson.flow.triggers = [];
    }

    // Enrichir selon les capabilities utilisées dans les drivers
    for (const [type, template] of Object.entries(templates)) {
      if (template.trigger && !this.flowExists('trigger', template.trigger.id)) {
        this.appJson.flow.triggers.push(template.trigger);
        this.enrichments.push(`trigger: ${template.trigger.id}`);
        enriched++;
      }
    }

    // Ajouter conditions
    if (!this.appJson.flow.conditions) {
      this.appJson.flow.conditions = [];
    }

    for (const [type, template] of Object.entries(templates)) {
      if (template.condition && !this.flowExists('condition', template.condition.id)) {
        this.appJson.flow.conditions.push(template.condition);
        this.enrichments.push(`condition: ${template.condition.id}`);
        enriched++;
      }
    }

    // Ajouter actions
    if (!this.appJson.flow.actions) {
      this.appJson.flow.actions = [];
    }

    for (const [type, template] of Object.entries(templates)) {
      if (template.action && !this.flowExists('action', template.action.id)) {
        this.appJson.flow.actions.push(template.action);
        this.enrichments.push(`action: ${template.action.id}`);
        enriched++;
      }
    }

    // Sauvegarder
    if (enriched > 0) {
      fs.writeFileSync(this.appJsonPath, JSON.stringify(this.appJson, null, 2) + '\n');
    }

    console.log(`\n✅ Enriched: ${enriched} flow cards`);
    return this.enrichments;
  }

  // Vérifier si flow existe
  flowExists(type, id) {
    const collection = this.appJson.flow[`${type}s`] || [];
    return collection.some(item => item.id === id);
  }
}

module.exports = FlowEnricher;
