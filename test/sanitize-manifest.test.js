'use strict';

const assert = require('assert');
const {
  stripDeviceTitleFormatted,
} = require('../scripts/maintenance/sanitize-manifest.cjs');

describe('Manifest sanitizer', function() {
  it('strips Flow titleFormatted entries that reference the device token', function() {
    const manifest = {
      flow: {
        triggers: [
          {
            id: 'button_pressed',
            titleFormatted: { en: 'Button pressed [[device]]' },
          },
          {
            id: 'safe_trigger',
            titleFormatted: { en: 'DP [[dp]] changed' },
          },
        ],
        conditions: [
          {
            id: 'virtual_presence_confidence_above',
            titleFormatted: {
              en: 'Confidence !{{is above|is not above}} [[device]] [[threshold]]',
            },
          },
        ],
        actions: [
          {
            id: 'tuya_dp_send',
            titleFormatted: { en: 'Send DP [[device]] [[dp]] [[value]]' },
          },
        ],
      },
    };

    assert.strictEqual(stripDeviceTitleFormatted(manifest), 3);
    assert.strictEqual(manifest.flow.triggers[0].titleFormatted, undefined);
    assert.deepStrictEqual(manifest.flow.triggers[1].titleFormatted, { en: 'DP [[dp]] changed' });
    assert.strictEqual(manifest.flow.conditions[0].titleFormatted, undefined);
    assert.strictEqual(manifest.flow.actions[0].titleFormatted, undefined);
  });
});
