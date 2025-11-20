#!/usr/bin/env node
/**
 * FIX ALL REMAINING INDENTATION ISSUES
 * Systematically fixes the 12 remaining parsing errors
 */

const fs = require('fs');
const path = require('path');

const FIXES = [
  // Pattern 1: Method body at 2 spaces → 4 spaces
  {
    file: 'drivers/air_quality_monitor/device.js',
    find: '  async triggerFlowCard(cardId, tokens = {}) {\n  try {',
    replace: '  async triggerFlowCard(cardId, tokens = {}) {\n    try {'
  },
  {
    file: 'drivers/contact_sensor_vibration/device.js',
    find: '  async setupIASZone() {\n  this.log',
    replace: '  async setupIASZone() {\n    this.log'
  },
  {
    file: 'drivers/doorbell_button/device.js',
    find: '  async checkAnyAlarm() {\n  const capabilities',
    replace: '  async checkAnyAlarm() {\n    const capabilities'
  },
  {
    file: 'drivers/hvac_air_conditioner/device.js',
    find: '  async setupTemperatureSensor() {\n  if (!this.hasCapability',
    replace: '  async setupTemperatureSensor() {\n    if (!this.hasCapability'
  },
  {
    file: 'drivers/hvac_dehumidifier/device.js',
    find: '  async setupHumiditySensor() {\n  if (!this.hasCapability',
    replace: '  async setupHumiditySensor() {\n    if (!this.hasCapability'
  },
  {
    file: 'drivers/curtain_motor/device.js',
    find: '  async readAttributeSafe(cluster, attribute) {\n    try {\n    return await',
    replace: '  async readAttributeSafe(cluster, attribute) {\n    try {\n      return await'
  },
  {
    file: 'drivers/radiator_valve_smart/device.js',
    find: '  async readAttributeSafe(cluster, attribute) {\n    try {\n    return await',
    replace: '  async readAttributeSafe(cluster, attribute) {\n    try {\n      return await'
  },
  {
    file: 'drivers/switch_internal_1gang/device.js',
    find: '  async readAttributeSafe(cluster, attribute) {\n    try {\n    return await',
    replace: '  async readAttributeSafe(cluster, attribute) {\n    try {\n      return await'
  },
  {
    file: 'drivers/thermostat_advanced/device.js',
    find: '  async triggerFlowCard(cardId, tokens = {}) {\n    try {\n      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);\n      await flowCard.trigger(this, tokens).catch(err => this.error(err));\n      this.log(`[OK] Flow triggered: ${cardId}`, tokens);\n  } catch (err) {',
    replace: '  async triggerFlowCard(cardId, tokens = {}) {\n    try {\n      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);\n      await flowCard.trigger(this, tokens).catch(err => this.error(err));\n      this.log(`[OK] Flow triggered: ${cardId}`, tokens);\n    } catch (err) {'
  },
  {
    file: 'drivers/thermostat_smart/device.js',
    find: '  async triggerFlowCard(cardId, tokens = {}) {\n    try {\n      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);\n      await flowCard.trigger(this, tokens).catch(err => this.error(err));\n      this.log(`[OK] Flow triggered: ${cardId}`, tokens);\n  } catch (err) {',
    replace: '  async triggerFlowCard(cardId, tokens = {}) {\n    try {\n      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);\n      await flowCard.trigger(this, tokens).catch(err => this.error(err));\n      this.log(`[OK] Flow triggered: ${cardId}`, tokens);\n    } catch (err) {'
  },
  {
    file: 'drivers/thermostat_temperature_control/device.js',
    find: '  async triggerFlowCard(cardId, tokens = {}) {\n    try {\n      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);\n      await flowCard.trigger(this, tokens).catch(err => this.error(err));\n      this.log(`[OK] Flow triggered: ${cardId}`, tokens);\n  } catch (err) {',
    replace: '  async triggerFlowCard(cardId, tokens = {}) {\n    try {\n      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);\n      await flowCard.trigger(this, tokens).catch(err => this.error(err));\n      this.log(`[OK] Flow triggered: ${cardId}`, tokens);\n    } catch (err) {'
  }
];

const projectRoot = path.resolve(__dirname, '..');
let fixed = 0;
let failed = 0;

FIXES.forEach(fix => {
  const filePath = path.join(projectRoot, fix.file);
  console.log(`\nFixing: ${fix.file}`);

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    content = content.replace(fix.find, fix.replace);

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ FIXED: ${fix.file}`);
      fixed++;
    } else {
      console.log(`⚠️  NOT FOUND: Pattern in ${fix.file}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${fix.file} - ${err.message}`);
    failed++;
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log(`SUMMARY: ${fixed} files fixed, ${failed} failures`);
console.log(`${'='.repeat(60)}\n`);

process.exit(failed > 0 ? 1 : 0);
