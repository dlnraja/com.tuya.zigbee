'use strict';

/**
 * Tests — Community smart features / Daylight Atmosphere (L99)
 * Legacy flow ids hue_* remain for Homey compatibility; UI is brand-free.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const DaylightAtmosphere = require('../lib/features/DaylightAtmosphere');

describe('Daylight Atmosphere curve', () => {
  it('night elevation is warm and dim', () => {
    const c = DaylightAtmosphere.compute({ elevation: -20 });
    assert.ok(c.temperature >= 0.7);
    assert.ok(c.dim <= 0.35);
  });

  it('high sun is cool and bright', () => {
    const c = DaylightAtmosphere.compute({ elevation: 55 });
    assert.ok(c.dim >= 0.85);
    assert.ok(c.temperature <= 0.4);
  });

  it('clock evening warms vs midday', () => {
    const noon = DaylightAtmosphere.compute({ date: new Date(2026, 0, 1, 13, 0) });
    const late = DaylightAtmosphere.compute({ date: new Date(2026, 0, 1, 23, 0) });
    assert.ok(noon.dim >= late.dim);
    assert.ok(late.temperature >= noon.temperature);
  });

  it('app delegates circadian to DaylightAtmosphere SSOT', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.match(src, /_hueCircadianCurve/);
    assert.match(src, /DaylightAtmosphere/);
    assert.match(src, /_registerCommunitySmartFlowCards/);
  });
});

describe('Community smart flow cards', () => {
  it('legacy action card ids exist in app.json', () => {
    const app = require(path.join(ROOT, 'app.json'));
    const ids = new Set((app.flow?.actions || []).map(a => a.id));
    for (const id of ['hue_motion_lighting', 'hue_circadian_apply', 'hue_wakeup']) {
      assert.ok(ids.has(id), `${id} missing`);
    }
  });

  it('listeners are registered in app.js', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    for (const id of ['hue_motion_lighting', 'hue_circadian_apply', 'hue_wakeup']) {
      assert.ok(src.includes(`getActionCard('${id}')`), `listener ${id} missing`);
    }
  });

  it('compose titles are brand-free (sample)', () => {
    const circ = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/flow/actions/hue_circadian_apply.json'), 'utf8'));
    assert.ok(!/Hue|Philips|IKEA/i.test(JSON.stringify(circ.title)));
    assert.match(circ.title.en, /Solar Sync|Daylight/i);
  });
});
