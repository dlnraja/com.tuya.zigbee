'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  compactZigbeeIdentifiers,
  loadMfsDatabase,
} = require('../scripts/maintenance/compact-zigbee-identifiers.cjs');

const ROOT = path.join(__dirname, '..');
const SYNTHETIC_RE = /unknown|dummy|placeholder|needs_device_assignment|^_generic_|^_GENERIC_|^_hybrid_|^_HYBRID_|^_master_|^_MASTER_/;

function miniMfsDb() {
  return {
    devices: {
      _obs_high: {
        manufacturerId: '_OBS_HIGH',
        modelIds: ['TS0601'],
        driverHint: 'broad',
        confidence: 0.7,
      },
      _obs_low: {
        manufacturerId: '_OBS_LOW',
        modelIds: ['TS0201'],
        driverHint: 'broad',
        confidence: 0.1,
      },
      _rescued: {
        manufacturerId: '_RESCUED',
        modelIds: ['TS0001'],
        driverHint: 'empty_driver',
        confidence: 0.5,
      },
    },
    driverMapping: {},
  };
}

describe('Prioritized Zigbee identifier compaction (mfs_db evidence)', function() {
  it('keeps observed manufacturers before speculative ones, confidence first', function() {
    const manifest = {
      drivers: [{
        id: 'broad',
        zigbee: {
          manufacturerName: ['SPEC_A', '_obs_low', 'SPEC_B', '_OBS_HIGH'],
          productId: ['TS0601', 'TS0201', 'P_UNUSED'],
        },
      }],
    };
    // Budget: 2 mfrs x 2 observed pids = 4 combos.
    const result = compactZigbeeIdentifiers(manifest, {
      mfsDb: miniMfsDb(),
      pidReduceOver: 0,
      maxDriverCombos: 4,
      maxTotalCombos: 1000,
    });
    const kept = manifest.drivers[0].zigbee.manufacturerName;
    assert.deepStrictEqual(kept, ['_OBS_HIGH', '_obs_low']);
    assert.deepStrictEqual(manifest.drivers[0].zigbee.productId, ['TS0601', 'TS0201']);
    assert.strictEqual(result.observedKept, 2);
    assert.strictEqual(result.observedBefore, 2);
    assert.strictEqual(result.observedDropped.length, 0);
  });

  it('never drops an observed manufacturer while a speculative one is kept', function() {
    const manifest = {
      drivers: [{
        id: 'broad',
        zigbee: {
          manufacturerName: ['SPEC_A', 'SPEC_B', '_obs_low', '_OBS_HIGH'],
          productId: ['TS0601', 'TS0201'],
        },
      }],
    };
    // Budget: 3 mfrs x 2 pids = 6 combos -> 1 speculative must go, observed stay.
    const result = compactZigbeeIdentifiers(manifest, {
      mfsDb: miniMfsDb(),
      pidReduceOver: 0,
      maxDriverCombos: 6,
      maxTotalCombos: 1000,
    });
    const kept = manifest.drivers[0].zigbee.manufacturerName;
    assert.ok(kept.includes('_OBS_HIGH'));
    assert.ok(kept.includes('_obs_low'));
    assert.strictEqual(kept.length, 3);
    assert.strictEqual(result.observedDropped.length, 0);
  });

  it('never empties productId when mfs_db has no matching modelIds', function() {
    const manifest = {
      drivers: [{
        id: 'broad',
        zigbee: {
          manufacturerName: ['_OBS_HIGH'],
          productId: ['SOMETHING_ELSE', 'OTHER'],
        },
      }],
    };
    const result = compactZigbeeIdentifiers(manifest, {
      mfsDb: miniMfsDb(),
      pidReduceOver: 0,
      maxDriverCombos: 1, // force the compaction path
      maxTotalCombos: 1000,
    });
    assert.ok(manifest.drivers[0].zigbee.productId.length > 0);
    assert.strictEqual(result.observedDropped.length, 0);
  });

  it('rescues all-synthetic drivers with mfs_db manufacturers (driverHint)', function() {
    const manifest = {
      drivers: [{
        id: 'empty_driver',
        zigbee: {
          manufacturerName: ['_generic_empty_driver'],
          productId: ['TS0001'],
        },
      }],
    };
    const result = compactZigbeeIdentifiers(manifest, {
      mfsDb: miniMfsDb(),
      pidReduceOver: 0,
      maxDriverCombos: 100,
      maxTotalCombos: 1000,
    });
    assert.strictEqual(result.pruned, 0);
    assert.strictEqual(result.rescuedDrivers.length, 1);
    assert.deepStrictEqual(manifest.drivers[0].zigbee.manufacturerName, ['_RESCUED']);
  });

  it('drops all-synthetic drivers without mfs_db match, as before', function() {
    const manifest = {
      drivers: [{
        id: 'nowhere',
        zigbee: {
          manufacturerName: ['_generic_nowhere'],
          productId: ['TS0601'],
        },
      }],
    };
    const result = compactZigbeeIdentifiers(manifest, {
      mfsDb: miniMfsDb(),
      pidReduceOver: 0,
      maxDriverCombos: 100,
      maxTotalCombos: 1000,
    });
    assert.strictEqual(result.pruned, 1);
    assert.strictEqual(result.prunedDrivers[0].rescue, 'no-mfs-db-match');
    assert.strictEqual(manifest.drivers.length, 0);
  });

  it('falls back to legacy order-based truncation without mfs_db', function() {
    const manifest = {
      drivers: [{
        id: 'broad',
        zigbee: {
          manufacturerName: ['SPEC_A', '_obs_low', 'SPEC_B', '_OBS_HIGH'],
          productId: ['TS0601', 'TS0201'],
        },
      }],
    };
    const result = compactZigbeeIdentifiers(manifest, {
      mfsDb: null,
      maxDriverCombos: 4,
      maxTotalCombos: 1000,
    });
    assert.strictEqual(result.mfsDbLoaded, false);
    // Legacy: first 2 mfrs by array order, pids untouched.
    assert.deepStrictEqual(manifest.drivers[0].zigbee.manufacturerName, ['SPEC_A', '_obs_low']);
    assert.deepStrictEqual(manifest.drivers[0].zigbee.productId, ['TS0601', 'TS0201']);
  });

  it('reports budget-forced observed drops explicitly', function() {
    const manifest = {
      drivers: [{
        id: 'broad',
        zigbee: {
          manufacturerName: ['_obs_low', '_OBS_HIGH'],
          productId: ['TS0601', 'TS0201'],
        },
      }],
    };
    // Budget fits only 1 mfr x 2 pids -> one observed cannot survive.
    const result = compactZigbeeIdentifiers(manifest, {
      mfsDb: miniMfsDb(),
      pidReduceOver: 0,
      maxDriverCombos: 2,
      maxTotalCombos: 1000,
    });
    assert.strictEqual(result.observedDropped.length, 1);
    assert.deepStrictEqual(manifest.drivers[0].zigbee.manufacturerName, ['_OBS_HIGH']);
  });
});

describe('Publish manifest regression gate (real app.json + mfs_db)', function() {
  this.timeout(30000);

  const appJsonPath = path.join(ROOT, 'app.json');
  const mfsDbPath = path.join(ROOT, 'data', 'mfs_db.json');

  it('preserves every observed manufacturer of over-cap drivers, _TZE284_hodyryli included, under 4MB', function() {
    if (!fs.existsSync(appJsonPath) || !fs.existsSync(mfsDbPath)) {
      this.skip();
      return;
    }
    const source = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const mfsDb = loadMfsDatabase(mfsDbPath);
    assert.ok(mfsDb && mfsDb.byMfr.size > 0, 'mfs_db must load');

    // Observed, non-synthetic manufacturers per driver BEFORE compaction.
    const observedByDriver = new Map();
    for (const driver of source.drivers || []) {
      if (!driver.zigbee) continue;
      const observed = [...new Set(driver.zigbee.manufacturerName || [])]
        .filter(m => !SYNTHETIC_RE.test(m) && mfsDb.byMfr.has(m.toLowerCase()));
      if (observed.length > 0) observedByDriver.set(driver.id, observed);
    }

    const manifest = JSON.parse(JSON.stringify(source));
    const result = compactZigbeeIdentifiers(manifest, { mfsDb });

    // 1) Sacred keep couples never lost under Athom publish budget.
    assert.deepStrictEqual(result.sacredMissing || [], [],
      `sacred keep couples dropped: ${JSON.stringify(result.sacredMissing)}`);
    for (const [driverId] of observedByDriver) {
      const driver = (manifest.drivers || []).find(d => d.id === driverId);
      assert.ok(driver, `driver ${driverId} with observed mfrs must survive`);
      assert.ok((driver.zigbee?.manufacturerName || []).length > 0, `${driverId} must retain manufacturers`);
    }

    // 2) Issue #513 regression: _TZE284_hodyryli must stay in climate_sensor.
    const sourceClimate = (source.drivers || []).find(d => d.id === 'climate_sensor');
    if (sourceClimate
        && (sourceClimate.zigbee.manufacturerName || []).some(m => m.toLowerCase() === '_tze284_hodyryli')) {
      const climate = manifest.drivers.find(d => d.id === 'climate_sensor');
      assert.ok(climate, 'climate_sensor must survive compaction');
      assert.ok(
        (climate.zigbee.manufacturerName || []).some(m => m.toLowerCase() === '_tze284_hodyryli'),
        '_TZE284_hodyryli (issue #513) must be preserved in climate_sensor',
      );
    }

    // 3) Payload stays publishable.
    const sizeMB = Buffer.byteLength(JSON.stringify(manifest)) / (1024 * 1024);
    assert.ok(sizeMB < 4, `compacted manifest is ${sizeMB.toFixed(2)} MB, over the 4 MB Athom limit`);
    assert.ok(result.afterTotal <= result.maxTotalCombos,
      `total combos ${result.afterTotal} exceed limit ${result.maxTotalCombos}`);
  });
});
