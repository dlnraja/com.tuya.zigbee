/**
 * Tests for capability-manager module
 */

const { test } = require('node:test');
const assert = require('node:assert');

// Mock the module
const CapabilityManager = require('../lib/capabilities/capability-manager');

test('CapabilityManager - constructor', (t) => {
  const manager = new CapabilityManager();
  assert.ok(manager.standardCapabilities);
  assert.ok(manager.capabilityOptions);
});

test('CapabilityManager - getCapabilitiesForType', (t) => {
  const manager = new CapabilityManager();
  
  const plugCaps = manager.getCapabilitiesForType('plug');
  assert.ok(plugCaps.includes('onoff'));
  assert.ok(plugCaps.includes('measure_power'));
  
  const trvCaps = manager.getCapabilitiesForType('trv');
  assert.ok(trvCaps.includes('target_temperature'));
  assert.ok(trvCaps.includes('measure_temperature'));
});

test('CapabilityManager - getOptionsForCapability', (t) => {
  const manager = new CapabilityManager();
  
  const targetTempOptions = manager.getOptionsForCapability('target_temperature');
  assert.strictEqual(targetTempOptions.min, 5);
  assert.strictEqual(targetTempOptions.max, 30);
  assert.strictEqual(targetTempOptions.step, 0.5);
});

test('CapabilityManager - validateCapabilityValue', (t) => {
  const manager = new CapabilityManager();
  
  // Valid value
  const validResult = manager.validateCapabilityValue('target_temperature', 20);
  assert.strictEqual(validResult.valid, true);
  
  // Value below minimum
  const belowMinResult = manager.validateCapabilityValue('target_temperature', 0);
  assert.strictEqual(belowMinResult.valid, false);
  
  // Value above maximum
  const aboveMaxResult = manager.validateCapabilityValue('target_temperature', 35);
  assert.strictEqual(aboveMaxResult.valid, false);
});

test('CapabilityManager - getCapabilityMetadata', (t) => {
  const manager = new CapabilityManager();
  
  const onoffMeta = manager.getCapabilityMetadata('onoff');
  assert.strictEqual(onoffMeta.type, 'boolean');
  assert.strictEqual(onoffMeta.category, 'control');
  
  const powerMeta = manager.getCapabilityMetadata('measure_power');
  assert.strictEqual(powerMeta.type, 'number');
  assert.strictEqual(powerMeta.unit, 'W');
});

test('CapabilityManager - getFlowCardsForCapability', (t) => {
  const manager = new CapabilityManager();
  
  const onoffCards = manager.getFlowCardsForCapability('onoff');
  assert.ok(onoffCards.triggers.includes('is_on'));
  assert.ok(onoffCards.actions.includes('turn_on'));
  
  const trvCards = manager.getFlowCardsForCapability('target_temperature');
  assert.ok(trvCards.actions.includes('set_target_temperature'));
});

test('CapabilityManager - getCapabilityDependencies', (t) => {
  const manager = new CapabilityManager();
  
  const dimDeps = manager.getCapabilityDependencies('dim');
  assert.ok(dimDeps.includes('onoff'));
  
  const powerDeps = manager.getCapabilityDependencies('meter_power');
  assert.ok(powerDeps.includes('measure_power'));
});

console.log('✅ CapabilityManager tests completed');
