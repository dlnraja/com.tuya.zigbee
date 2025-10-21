#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * ADD ALL CAPABILITY FLOWS TO APP.JSON
 * Ajoute TOUS les flow cards basés sur capabilities réelles
 */

async function main() {
  console.log('📝 ADDING ALL CAPABILITY-BASED FLOWS TO APP.JSON\n');
  
  // Load analysis
  const analysisPath = path.join(__dirname, '../../reports/CAPABILITY_BASED_FLOWS_ANALYSIS.json');
  const analysisData = await fs.readFile(analysisPath, 'utf8');
  const analysis = JSON.parse(analysisData);
  
  // Collect ALL unique flows
  const allFlows = {
    triggers: new Map(),
    conditions: new Map(),
    actions: new Map()
  };
  
  analysis.forEach(driver => {
    driver.flows.triggers.forEach(t => {
      if (!allFlows.triggers.has(t.id)) {
        const flow = { ...t };
        delete flow.capability;
        delete flow.driver;
        // Add device arg
        flow.args = [{
          type: 'device',
          name: 'device',
          filter: 'driver_uri=homey:app:com.dlnraja.tuya.zigbee'
        }];
        allFlows.triggers.set(t.id, flow);
      }
    });
    
    driver.flows.conditions.forEach(c => {
      if (!allFlows.conditions.has(c.id)) {
        const flow = { ...c };
        delete flow.capability;
        delete flow.driver;
        // Add device arg first
        if (!flow.args) flow.args = [];
        flow.args.unshift({
          type: 'device',
          name: 'device',
          filter: 'driver_uri=homey:app:com.dlnraja.tuya.zigbee'
        });
        allFlows.conditions.set(c.id, flow);
      }
    });
    
    driver.flows.actions.forEach(a => {
      if (!allFlows.actions.has(a.id)) {
        const flow = { ...a };
        delete flow.capability;
        delete flow.driver;
        // Add device arg first
        if (!flow.args) flow.args = [];
        flow.args.unshift({
          type: 'device',
          name: 'device',
          filter: 'driver_uri=homey:app:com.dlnraja.tuya.zigbee'
        });
        allFlows.actions.set(a.id, flow);
      }
    });
  });
  
  // Load app.json
  const appJsonPath = path.join(__dirname, '../..', 'app.json');
  const appJsonData = await fs.readFile(appJsonPath, 'utf8');
  const appJson = JSON.parse(appJsonData);
  
  // Initialize flow structure
  if (!appJson.flow) appJson.flow = {};
  if (!appJson.flow.triggers) appJson.flow.triggers = [];
  if (!appJson.flow.conditions) appJson.flow.conditions = [];
  if (!appJson.flow.actions) appJson.flow.actions = [];
  
  let stats = {
    triggers_added: 0,
    conditions_added: 0,
    actions_added: 0,
    skipped: 0
  };
  
  // Add triggers
  allFlows.triggers.forEach((trigger, id) => {
    const exists = appJson.flow.triggers.find(t => t.id === id);
    if (!exists) {
      appJson.flow.triggers.push(trigger);
      stats.triggers_added++;
      console.log(`  ✅ Trigger: ${id}`);
    } else {
      stats.skipped++;
    }
  });
  
  // Add conditions
  allFlows.conditions.forEach((condition, id) => {
    const exists = appJson.flow.conditions.find(c => c.id === id);
    if (!exists) {
      appJson.flow.conditions.push(condition);
      stats.conditions_added++;
      console.log(`  ✅ Condition: ${id}`);
    } else {
      stats.skipped++;
    }
  });
  
  // Add actions
  allFlows.actions.forEach((action, id) => {
    const exists = appJson.flow.actions.find(a => a.id === id);
    if (!exists) {
      appJson.flow.actions.push(action);
      stats.actions_added++;
      console.log(`  ✅ Action: ${id}`);
    } else {
      stats.skipped++;
    }
  });
  
  // Write updated app.json
  await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
  
  console.log('\n\n✅ APP.JSON UPDATED!\n');
  console.log(`📊 Statistics:`);
  console.log(`  Triggers added: ${stats.triggers_added}`);
  console.log(`  Conditions added: ${stats.conditions_added}`);
  console.log(`  Actions added: ${stats.actions_added}`);
  console.log(`  Skipped (already exist): ${stats.skipped}`);
  console.log(`\n  Total new flows: ${stats.triggers_added + stats.conditions_added + stats.actions_added}`);
  console.log(`\n  Total flows in app.json: ${appJson.flow.triggers.length + appJson.flow.conditions.length + appJson.flow.actions.length}`);
}

main().catch(console.error);
