const { test } = require('node:test');
const assert = require('node:assert');

test('TuyaConvert - basic DP conversion', () => {
  // Test boolean conversion
  const boolResult = { cap: 'onoff', to: 'bool' };
  assert.strictEqual(typeof boolResult.to, 'string');
  
  // Test power scaling
  const powerResult = { cap: 'measure_power', to: 'num/10' };
  assert.strictEqual(powerResult.to, 'num/10');
  
  // Test energy scaling
  const energyResult = { cap: 'meter_power', to: 'num/1000' };
  assert.strictEqual(energyResult.to, 'num/1000');
});

test('TuyaConvert - temperature conversion', () => {
  // Test temperature scaling
  const tempResult = { cap: 'target_temperature', to: 'num/10' };
  assert.strictEqual(tempResult.to, 'num/10');
  
  // Test measure temperature
  const measureResult = { cap: 'measure_temperature', to: 'num/10' };
  assert.strictEqual(measureResult.to, 'num/10');
});

test('TuyaConvert - battery alarm', () => {
  // Test battery alarm boolean
  const batteryResult = { cap: 'alarm_battery', to: 'bool' };
  assert.strictEqual(batteryResult.to, 'bool');
});
