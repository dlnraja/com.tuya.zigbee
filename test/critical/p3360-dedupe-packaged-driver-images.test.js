'use strict';

/**
 * P3360: identical driver small/large PNGs are folded to a shared assets/driver-images
 * copy in the prepared publish directory only. Sources are never touched. icon.svg stays.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');
const { dedupe } = require('../../scripts/maintenance/dedupe-packaged-driver-images.cjs');

const ROOT = path.join(__dirname, '..', '..');

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3360-'));
  for (const [f, s] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), s);
  }
  return dir;
}

const PNG_A = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');
const PNG_B = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c636060600000000400018cf30fad0000000049454e44ae426082', 'hex');

describe('P3360 packaged driver image dedupe', () => {
  it('rewrites identical images to one shared file and drops the copies', () => {
    const dir = fixture({
      'app.json': JSON.stringify({
        id: 'x',
        drivers: [
          { id: 'a', images: { small: '/drivers/a/assets/images/small.png', large: '/drivers/a/assets/images/large.png' } },
          { id: 'b', images: { small: '/drivers/b/assets/images/small.png', large: '/drivers/b/assets/images/large.png' } },
          { id: 'c', images: { small: '/drivers/c/assets/images/small.png', large: '/drivers/c/assets/images/large.png' } },
        ],
      }),
      'drivers/a/assets/images/small.png': PNG_A,
      'drivers/a/assets/images/large.png': PNG_B,
      'drivers/a/assets/icon.svg': '<svg/>',
      'drivers/b/assets/images/small.png': PNG_A,
      'drivers/b/assets/images/large.png': PNG_B,
      'drivers/b/assets/icon.svg': '<svg/>',
      'drivers/c/assets/images/small.png': PNG_A,
      'drivers/c/assets/images/large.png': PNG_A,
      'drivers/c/assets/icon.svg': '<svg/>',
    });
    const r = dedupe(dir, false);
    assert.strictEqual(r.groups.small, 1);
    assert.strictEqual(r.groups.large, 2);
    assert.ok(r.removed >= 3);
    const app = JSON.parse(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'));
    const smalls = new Set(app.drivers.map((d) => d.images.small));
    assert.strictEqual(smalls.size, 1);
    const shared = app.drivers[0].images.small.replace(/^\//, '');
    assert.ok(shared.startsWith('assets/driver-images/'));
    assert.ok(fs.existsSync(path.join(dir, shared)));
    assert.ok(!fs.existsSync(path.join(dir, 'drivers/a/assets/images/small.png')));
    assert.ok(!fs.existsSync(path.join(dir, 'drivers/b/assets/images/small.png')));
    assert.ok(fs.existsSync(path.join(dir, 'drivers/a/assets/icon.svg')));
    assert.ok(fs.existsSync(path.join(dir, 'drivers/c/assets/icon.svg')));
    // c's large differed, so its large path is a different canonical file
    assert.notStrictEqual(app.drivers[0].images.large, app.drivers[2].images.large);
    assert.ok(fs.existsSync(path.join(dir, app.drivers[2].images.large.replace(/^\//, ''))));
  });

  it('dry run changes nothing', () => {
    const dir = fixture({
      'app.json': JSON.stringify({ id: 'x', drivers: [{ id: 'a', images: { small: '/drivers/a/assets/images/small.png' } }] }),
      'drivers/a/assets/images/small.png': PNG_A,
    });
    const before = fs.readFileSync(path.join(dir, 'app.json'), 'utf8');
    dedupe(dir, true);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'), before);
    assert.ok(fs.existsSync(path.join(dir, 'drivers/a/assets/images/small.png')));
  });

  it('keeps a file still named by learnmode.image', () => {
    const dir = fixture({
      'app.json': JSON.stringify({
        id: 'x',
        drivers: [{
          id: 'a',
          images: { small: '/drivers/a/assets/images/small.png' },
          zigbee: { learnmode: { image: '/drivers/a/assets/images/small.png' } },
        }, {
          id: 'b',
          images: { small: '/drivers/b/assets/images/small.png' },
        }],
      }),
      'drivers/a/assets/images/small.png': PNG_A,
      'drivers/b/assets/images/small.png': PNG_A,
    });
    dedupe(dir, false);
    const app = JSON.parse(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'));
    assert.ok(fs.existsSync(path.join(dir, app.drivers[0].images.small.replace(/^\//, ''))));
    assert.ok(fs.existsSync(path.join(dir, 'drivers/a/assets/images/small.png')), 'learnmode path must remain');
  });

  it('prune-publish-payload invokes the dedupe (after lossless shrink when that step exists)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/maintenance/prune-publish-payload.cjs'), 'utf8');
    const iShrink = src.indexOf('lossless-shrink-payload.cjs');
    const iDedupe = src.indexOf('dedupe-packaged-driver-images.cjs');
    assert.ok(iDedupe > 0);
    if (iShrink > 0) assert.ok(iDedupe > iShrink);
  });
});
