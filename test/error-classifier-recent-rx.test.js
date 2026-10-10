'use strict';
// GH#550: a failed write must not flip a device that is still talking to unavailable.
const assert = require('assert');
const { writeAttrCatch, ERROR_CATEGORY, classifyError } = require('../lib/utils/ErrorClassifier');

function fakeDevice(lastRx) {
  return { _lastRxTimestamp: lastRx, unavailable: 0, log() {}, error() {},
    setUnavailable() { this.unavailable += 1; return Promise.resolve(); } };
}
describe('ErrorClassifier recent-RX guard (#550)', () => {
  const err = new Error('Timeout: Expected Response');
  it('does not mark unavailable when data was received recently', () => {
    if (classifyError(err) !== ERROR_CATEGORY.REACHABILITY) return;
    const d = fakeDevice(Date.now());
    writeAttrCatch(d, 't')(err);
    assert.strictEqual(d.unavailable, 0);
  });
  it('still marks unavailable when nothing was heard for long', () => {
    if (classifyError(err) !== ERROR_CATEGORY.REACHABILITY) return;
    const d = fakeDevice(Date.now() - 10 * 60000);
    writeAttrCatch(d, 't')(err);
    assert.strictEqual(d.unavailable, 1);
  });
});
