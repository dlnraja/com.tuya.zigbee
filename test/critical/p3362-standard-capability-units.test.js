'use strict';

/**
 * P3362 - standard units on measure_*, meter_*, target_temperature
 * for Homey Insights History and Apple Home coherence.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  standardUnitFor,
  hasDeclaredUnits,
  healSensorCapabilityGetable,
} = require('../../lib/utils/HomeyCapabilityUx');
const { scanMissingUnits, APP_FLOW_IDS, checkEagerJson } = require('../../scripts/ci/apple-home-coherence.cjs');

const ROOT = path.join(__dirname, '..', '..');

describe('P3362 standard capability units', () => {
  it('maps temperature, energy and lux, and keeps distance in metres', () => {
    assert.equal(standardUnitFor('measure_temperature'), '\u00B0C');
    assert.equal(standardUnitFor('target_temperature.ch2'), '\u00B0C');
    assert.equal(standardUnitFor('measure_humidity'), '%');
    assert.equal(standardUnitFor('measure_power.phase1'), 'W');
    assert.equal(standardUnitFor('measure_voltage'), 'V');
    assert.equal(standardUnitFor('measure_current.a'), 'A');
    assert.equal(standardUnitFor('meter_power.exported'), 'kWh');
    assert.equal(standardUnitFor('measure_luminance'), 'lx');
    assert.equal(standardUnitFor('measure_luminance.distance'), 'm');
    assert.equal(standardUnitFor('measure_luminance.distance.zone1'), 'm');
    assert.equal(standardUnitFor('measure_battery'), '%');
    assert.equal(standardUnitFor('onoff'), null);
  });

  it('accepts a string or a localized units object as already declared', () => {
    assert.equal(hasDeclaredUnits({ units: '%' }), true);
    assert.equal(hasDeclaredUnits({ units: { en: 'm' } }), true);
    assert.equal(hasDeclaredUnits({ title: { en: 'Temp' } }), false);
    assert.equal(hasDeclaredUnits({}), false);
  });

  it('compose and app.json have no missing standard units', () => {
    const { missing } = scanMissingUnits();
    assert.deepEqual(missing, []);
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const holes = [];
    for (const d of app.drivers || []) {
      const opts = d.capabilitiesOptions || {};
      for (const cap of d.capabilities || []) {
        const id = typeof cap === 'string' ? cap : cap && cap.id;
        const unit = standardUnitFor(id);
        if (!unit) {continue;}
        if (!hasDeclaredUnits(opts[id] || {})) {holes.push(`${d.id}:${id}`);}
      }
    }
    assert.deepEqual(holes, []);
  });

  it('healer restores missing units and does not overwrite an existing unit', async () => {
    const calls = [];
    const device = {
      _homeyCapabilityUxHealed: false,
      getCapabilities: () => ['measure_temperature', 'measure_humidity', 'measure_luminance.distance'],
      getCapabilityOptions: (cap) => cap === 'measure_temperature' ? { units: 'C' } : {},
      setCapabilityOptions: async (cap, opts) => { calls.push({ cap, opts }); },
      log: () => {},
    };
    const r = await healSensorCapabilityGetable(device);
    assert.ok(!calls.some((c) => c.cap === 'measure_temperature'));
    const hum = calls.find((c) => c.cap === 'measure_humidity');
    assert.equal(hum.opts.units, '%');
    assert.ok(!('getable' in hum.opts));
    const dist = calls.find((c) => c.cap === 'measure_luminance.distance');
    assert.equal(dist.opts.units, 'm');
    assert.equal(dist.opts.preventInsights, true);
    assert.ok(r.unitsHealed.includes('measure_humidity'));
  });

  it('app-level flow card ids remain available', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const ids = new Set();
    for (const kind of ['triggers', 'conditions', 'actions']) {
      for (const card of (app.flow && app.flow[kind]) || []) {
        if (card && card.id) {ids.add(card.id);}
      }
    }
    const composeDir = path.join(ROOT, '.homeycompose', 'flow');
    if (fs.existsSync(composeDir)) {
      for (const kind of ['triggers', 'conditions', 'actions']) {
        const d = path.join(composeDir, kind);
        if (!fs.existsSync(d)) {continue;}
        for (const f of fs.readdirSync(d)) {
          if (!f.endsWith('.json')) {continue;}
          try {
            const j = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
            if (j && j.id) {ids.add(j.id);}
          } catch (_e) { /* skip */ }
        }
      }
    }
    for (const id of APP_FLOW_IDS) {
      assert.ok(ids.has(id), id);
    }
  });

  it('startup does not eagerly parse huge JSON catalogs', () => {
    const bad = checkEagerJson();
    assert.deepEqual(bad, []);
  });
});
