'use strict';
// P3075 D26: the upload copy drops driver maintainer notes (metadata, per-driver version, _notes, empty
// subDevices). This checks that the visible manifest (settings, capabilities, options, flows, pairing,
// Zigbee ids, names, images) is identical before and after, and that app code never reads those keys.
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { compactSharedText } = require('../../scripts/maintenance/compact-shared-text.cjs');

const manifest = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const isDoc = (k, v) => k === 'metadata' || k === 'version' || k.startsWith('_') || (k === 'subDevices' && Array.isArray(v) && v.length === 0);

describe('P3075 D26 upload drops driver maintainer notes only', () => {
  it('visible settings, capabilities, flows and pairing are identical with and without the strip', () => {
    const a = manifest();
    const stats = compactSharedText(a);
    const plain = manifest();
    compactSharedText(plain, { keepDocKeys: true });
    assert.ok(stats.docDropped > 0 && stats.docBytes > 10 * 1024, `saves ${stats.docBytes} bytes`);
    for (const [i, d] of plain.drivers.entries()) {
      const kept = Object.fromEntries(Object.entries(d).filter(([k, v]) => !isDoc(k, v)));
      assert.deepStrictEqual(a.drivers[i], kept, `${d.id} visible manifest changed`);
      for (const k of Object.keys(d)) {
        if (!(k in a.drivers[i])) { assert.ok(isDoc(k, d[k]), `${d.id}.${k} must not be dropped`); }
      }
    }
    assert.deepStrictEqual(a.flow, plain.flow);
    assert.deepStrictEqual(a.capabilities, plain.capabilities);
  });

  it('no app code reads the dropped keys from a driver manifest', () => {
    const hits = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'assets') { walk(p); } continue; }
        if (!e.name.endsWith('.js')) { continue; }
        const t = fs.readFileSync(p, 'utf8');
        if (/manifest\??\.(metadata|subDevices|_notes)\b|driver\.manifest\??\.version\b/.test(t)) { hits.push(path.relative(ROOT, p)); }
      }
    };
    walk(path.join(ROOT, 'lib'));
    walk(path.join(ROOT, 'drivers'));
    assert.deepStrictEqual(hits, []);
  });
});
