'use strict';
const assert = require('assert');
const { EventEmitter } = require('events');
const MemwarnGuard = require('../lib/utils/MemwarnGuard');
describe('MemwarnGuard', () => {
  it('runs cleaners on memwarn and records the event', () => {
    const h = new EventEmitter(); let n = 0;
    const g = new MemwarnGuard().register('a', () => { n++; }).register('bad', () => { throw new Error('x'); });
    assert.strictEqual(g.attach(h), true);
    h.emit('memwarn', { count: 1, limit: 3 });
    assert.strictEqual(n, 1);
    assert.deepStrictEqual(g.events[0].cleaners, ['a']);
    assert.strictEqual(g.events[0].limit, 3);
  });
  it('tolerates missing homey / data', () => {
    const g = new MemwarnGuard();
    assert.strictEqual(g.attach(null), false);
    assert.strictEqual(g.handle().count, 0);
  });
});
