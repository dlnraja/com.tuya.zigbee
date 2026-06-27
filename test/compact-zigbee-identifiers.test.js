'use strict';

const assert = require('assert');
const {
  comboCount,
  compactZigbeeIdentifiers,
} = require('../scripts/maintenance/compact-zigbee-identifiers.cjs');

function range(prefix, count) {
  return Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);
}

describe('Publish Zigbee identifier compaction', function() {
  it('caps broad manufacturer/product matrices per driver', function() {
    const manifest = {
      drivers: [
        {
          id: 'broad_driver',
          zigbee: {
            manufacturerName: range('M', 12),
            productId: range('P', 5),
          },
        },
        {
          id: 'small_driver',
          zigbee: {
            manufacturerName: ['Known', 'Known', ''],
            productId: ['Model'],
          },
        },
      ],
    };

    const result = compactZigbeeIdentifiers(manifest, {
      maxDriverCombos: 20,
      maxTotalCombos: 100,
    });

    assert.strictEqual(result.beforeTotal, 61);
    assert.strictEqual(result.afterTotal, 21);
    assert.strictEqual(result.changed, 1);
    assert.strictEqual(comboCount(manifest.drivers[0]), 20);
    assert.deepStrictEqual(manifest.drivers[0].zigbee.productId, range('P', 5));
    assert.strictEqual(manifest.drivers[0].zigbee.manufacturerName.length, 4);
    assert.strictEqual(result.overTotalLimit, false);
  });

  it('reports when total publish combinations remain over budget', function() {
    const manifest = {
      drivers: [
        {
          id: 'first',
          zigbee: {
            manufacturerName: range('A', 12),
            productId: range('P', 5),
          },
        },
        {
          id: 'second',
          zigbee: {
            manufacturerName: range('B', 12),
            productId: range('P', 5),
          },
        },
      ],
    };

    const result = compactZigbeeIdentifiers(manifest, {
      maxDriverCombos: 20,
      maxTotalCombos: 30,
    });

    assert.strictEqual(result.afterTotal, 40);
    assert.strictEqual(result.changed, 2);
    assert.strictEqual(result.overTotalLimit, true);
  });
});
