'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const FeatureFlowCards = require('../lib/flow/FeatureFlowCards');
const SolarElevation = require('../lib/features/SolarElevation');

describe('FeatureFlowCards solar triggers', function() {
  it('passes numeric solar tokens to Homey trigger cards', function() {
    const triggered = [];
    const cards = new Map();
    const getCard = (id) => {
      if (!cards.has(id)) {
        cards.set(id, {
          registerRunListener() {},
          trigger(tokens, state) {
            triggered.push({ id, tokens, state });
          },
        });
      }
      return cards.get(id);
    };

    const homey = {
      flow: {
        getTriggerCard: getCard,
        getConditionCard: getCard,
        getActionCard: getCard,
      },
      log() {},
      error() {},
    };

    const solar = new EventEmitter();
    solar.getElevation = () => undefined;
    solar.getAzimuth = () => undefined;
    solar.getElevationCategory = () => undefined;

    const featureFlowCards = new FeatureFlowCards(homey);
    featureFlowCards.setSolarElevation(solar);
    featureFlowCards._registerSolarCards();

    solar.emit('sunset', { timestamp: new Date('2026-06-29T20:11:04.000Z') });

    const event = triggered.find(entry => entry.id === 'solar_sunset_detected');
    assert(event, 'sunset trigger should fire');
    assert.strictEqual(event.tokens.elevation, 0);
    assert.strictEqual(event.tokens.azimuth, 0);
    assert.strictEqual(event.tokens.category, 'unknown');
    assert.strictEqual(event.tokens.timestamp, '2026-06-29T20:11:04.000Z');
    assert.strictEqual(event.state._lastWasAbove, true);
  });

  it('catches Homey trigger rejections from solar events', async function() {
    const triggered = [];
    const errors = [];
    const cards = new Map();
    const getCard = (id) => {
      if (!cards.has(id)) {
        cards.set(id, {
          registerRunListener() {},
          trigger(tokens, state) {
            triggered.push({ id, tokens, state });
            return Promise.reject(new Error('Invalid value for token elevation'));
          },
        });
      }
      return cards.get(id);
    };

    const homey = {
      flow: {
        getTriggerCard: getCard,
        getConditionCard: getCard,
        getActionCard: getCard,
      },
      log() {},
      error(...args) { errors.push(args.join(' ')); },
    };

    const solar = new EventEmitter();
    solar.getElevation = () => undefined;
    solar.getAzimuth = () => undefined;
    solar.getElevationCategory = () => undefined;

    const featureFlowCards = new FeatureFlowCards(homey);
    featureFlowCards.setSolarElevation(solar);
    featureFlowCards._registerSolarCards();

    assert.doesNotThrow(() => {
      solar.emit('sunset', { timestamp: new Date('2026-06-29T20:11:04.000Z') });
    });

    await new Promise(resolve => setImmediate(resolve));

    const event = triggered.find(entry => entry.id === 'solar_sunset_detected');
    assert(event, 'sunset trigger should fire');
    assert.strictEqual(event.tokens.elevation, 0);
    assert.match(errors.join('\n'), /solar_sunset_detected trigger error/);
  });
});

describe('Crash email legacy guards', function() {
  it('keeps safeSetCapabilityValue on the legacy Tuya cluster base', function() {
    const file = path.join(__dirname, '..', 'lib', 'TuyaSpecificClusterDevice.js');
    const source = fs.readFileSync(file, 'utf8');

    assert.match(source, /async\s+safeSetCapabilityValue\s*\(/);
    assert.match(source, /async\s+setCapabilityValueSafe\s*\(/);
  });

  it('keeps soilsensor_2 independent from missing safe capability helpers', function() {
    const file = path.join(__dirname, '..', 'drivers', 'soilsensor_2', 'device.js');
    const source = fs.readFileSync(file, 'utf8');

    assert.match(source, /async\s+_safeSetSoilCapability\s*\(/);
    assert.match(source, /typeof this\.safeSetCapabilityValue === 'function'/);
    assert.match(source, /typeof this\.setCapabilityValue === 'function'/);
    assert.doesNotMatch(source, /this\.safeSetCapabilityValue\('measure_/);
    assert.doesNotMatch(source, /this\.safeSetCapabilityValue\('alarm_battery'/);
  });

  it('passes the Homey timer context into SolarElevation observers', function() {
    let scheduled = false;
    let cleared = false;
    const homey = {
      setInterval(callback, intervalMs) {
        assert.strictEqual(typeof callback, 'function');
        assert.strictEqual(intervalMs, 1234);
        scheduled = true;
        return 'solar-timer';
      },
      clearInterval(timer) {
        assert.strictEqual(timer, 'solar-timer');
        cleared = true;
      },
    };

    const solar = new SolarElevation({ homey, logger() {} });
    solar.startObserving({ checkIntervalMs: 1234 });
    solar.stopObserving();

    assert.strictEqual(scheduled, true);
    assert.strictEqual(cleared, true);
  });
});
