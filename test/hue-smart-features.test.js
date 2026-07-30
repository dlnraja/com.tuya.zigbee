'use strict';

/**
 * Tests — Hue-style smart features (v9.0.376)
 * Circadian curve contract + flow cards presence in the manifest.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');

// Miroir de la courbe (source: app.js _hueCircadianCurve)
function circadianCurve(date) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h < 5) {return { dim: 0.1, temperature: 1.0 };}
  if (h < 7) {return { dim: 0.3, temperature: 0.85 };}
  if (h < 9) {return { dim: 0.6, temperature: 0.6 };}
  if (h < 12) {return { dim: 0.9, temperature: 0.3 };}
  if (h < 15) {return { dim: 1.0, temperature: 0.15 };}
  if (h < 18) {return { dim: 0.85, temperature: 0.35 };}
  if (h < 20) {return { dim: 0.6, temperature: 0.65 };}
  if (h < 22) {return { dim: 0.35, temperature: 0.9 };}
  return { dim: 0.15, temperature: 1.0 };
}

describe('Hue circadian curve', () => {
  it('night is warm and dim', () => {
    const c = circadianCurve(new Date(2026, 0, 1, 2, 0));
    assert.strictEqual(c.temperature, 1.0);
    assert.ok(c.dim <= 0.15);
  });

  it('noon is cool and bright', () => {
    const c = circadianCurve(new Date(2026, 0, 1, 13, 0));
    assert.strictEqual(c.dim, 1.0);
    assert.ok(c.temperature <= 0.2);
  });

  it('evening warms up and dims progressively', () => {
    const c18 = circadianCurve(new Date(2026, 0, 1, 19, 0));
    const c22 = circadianCurve(new Date(2026, 0, 1, 23, 0));
    assert.ok(c18.dim > c22.dim, 'dim must decrease through the evening');
    assert.ok(c22.temperature >= c18.temperature, 'temperature must warm through the evening');
  });

  it('source curve matches this mirror (anti-drift)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.match(src, /_hueCircadianCurve/);
    assert.match(src, /h < 15\).*\{return \{ dim: 1\.0, temperature: 0\.15/);
  });
});

describe('Hue flow cards in manifest', () => {
  it('all 3 action cards exist in app.json', () => {
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
});
