'use strict';

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const {
  shouldDrop,
  markStart,
  POST_RESTART_MS,
  SINGLE_WINDOW_MS,
} = require('../lib/utils/PostRestartPressDedup');

describe('P3384 PostRestartPressDedup (forum 156967)', () => {
  it('drops a second single about 1s later during the post-restart window', () => {
    const state = markStart({}, 1000);
    const first = shouldDrop(state, 1, 'single', 1500);
    const second = shouldDrop(state, 1, 'single', 1500 + 1000);
    assert.strictEqual(first.drop, false);
    assert.strictEqual(second.drop, true);
    assert.strictEqual(second.reason, 'post-restart-single');
  });

  it('never treats two typed double events as bounce', () => {
    const state = markStart({}, 1000);
    const first = shouldDrop(state, 1, 'double', 1500);
    const second = shouldDrop(state, 1, 'double', 1500 + 200);
    assert.strictEqual(first.drop, false);
    assert.strictEqual(second.drop, false);
    assert.strictEqual(second.reason, 'typed-action');
  });

  it('does not debounce singles after the post-restart window', () => {
    const state = markStart({}, 1000);
    const t = 1000 + POST_RESTART_MS + 10;
    const first = shouldDrop(state, 1, 'single', t);
    const second = shouldDrop(state, 1, 'single', t + SINGLE_WINDOW_MS - 100);
    assert.strictEqual(first.drop, false);
    assert.strictEqual(second.drop, false);
    assert.strictEqual(second.reason, 'outside-window');
  });

  it('keeps different endpoints independent', () => {
    const state = markStart({}, 1000);
    shouldDrop(state, 1, 'single', 1500);
    const other = shouldDrop(state, 2, 'single', 1600);
    assert.strictEqual(other.drop, false);
  });
});
