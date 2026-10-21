'use strict';
const assert = require('assert');
const V = require('../../lib/tuya-local/TuyaProtocolVersions');
const { buildProtocolFallbackChain } = require('../../lib/tuya-local/UdpDiscoveryKeys');

describe('P2930b Tuya protocol versions', () => {
  for (const v of ['3.1', '3.2', '3.3', '3.4', '3.5']) {
    it(`documented ${v}: declared first, neighbours next, full probe`, () => {
      const r = V.resolve(v);
      assert.strictEqual(r.status, 'documented');
      assert.strictEqual(r.chain[0], v);
      assert.deepStrictEqual(r.chain.slice(1, 1 + V.neighbours(v).length), V.neighbours(v));
      assert.deepStrictEqual([...r.chain].sort(), [...V.ORDER].sort());
      assert.strictEqual(buildProtocolFallbackChain(v)[0], v);
    });
  }
  it('3.22 is the documented device22 alias of 3.3', () => {
    const r = V.resolve('3.22');
    assert.strictEqual(r.lan, '3.3'); assert.strictEqual(r.variant, 'device22');
    assert.strictEqual(buildProtocolFallbackChain('3.22')[0], '3.3');
  });
  for (const v of ['1.0', '2.1', '2.2']) {
    it(`${v} is a non-LAN label and probes documented versions`, () => {
      const r = V.resolve(v);
      assert.strictEqual(r.status, 'non_lan'); assert.strictEqual(r.lan, null);
      assert.deepStrictEqual(r.chain, [...V.PROBE]);
      assert.ok(V.ORDER.includes(buildProtocolFallbackChain(v)[0]));
    });
  }
  it('undocumented 3.6 is a lead, never a new protocol', () => {
    const r = V.resolve('3.6');
    assert.strictEqual(r.status, 'lead'); assert.strictEqual(r.lan, '3.5');
    assert.ok(r.chain.every((x) => V.ORDER.includes(x)));
    assert.strictEqual(V.resolve('x9').status, 'lead');
    assert.strictEqual(V.resolve('').status, 'auto');
  });
  it('detects 3.5 (6699) and tagged 55AA frames', () => {
    assert.strictEqual(V.detectFromFrame(Buffer.from('000066990000', 'hex')), '3.5');
    const b = Buffer.alloc(32); b.writeUInt32BE(0x55aa, 0); b.write('3.3', 20, 'latin1');
    assert.strictEqual(V.detectFromFrame(b), '3.3');
    b.write('3.4', 20, 'latin1'); assert.strictEqual(V.detectFromFrame(b), '3.4');
    assert.strictEqual(V.detectFromFrame(Buffer.from('deadbeef', 'hex')), null);
  });
});
