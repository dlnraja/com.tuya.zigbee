'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const FeatureFlowCards = require('../lib/flow/FeatureFlowCards');

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
});

describe('Crash email legacy guards', function() {
  it('keeps safeSetCapabilityValue on the legacy Tuya cluster base', function() {
    const file = path.join(__dirname, '..', 'lib', 'TuyaSpecificClusterDevice.js');
    const source = fs.readFileSync(file, 'utf8');

    assert.match(source, /async\s+safeSetCapabilityValue\s*\(/);
    assert.match(source, /async\s+setCapabilityValueSafe\s*\(/);
  });
});
