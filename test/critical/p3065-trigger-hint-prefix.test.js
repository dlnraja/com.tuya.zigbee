'use strict';
// P3065 D19 — driver trigger hints no longer open with "Triggers when / Se déclenche quand / Wird ausgelöst,
// wenn / Triggert wanneer": the card already sits in the "When" column, so "When …" says the same thing.
// About 9 KB off the upload manifest; card ids, titles and the rest of each hint unchanged.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const BOILER = {
  en: /^(?:Triggers|Fires|Triggered) when /,
  fr: /^Se déclenche (?:quand|lorsque |lorsqu['’])/,
  de: /^Wird ausgelöst, wenn /,
  nl: /^(?:Triggert|Activeert|Geactiveerd|Wordt geactiveerd) (?:wanneer|als) /,
};

test('no driver trigger hint opens with the "Triggers when" boilerplate again', () => {
  const bad = [];
  let hints = 0;
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const f = path.join(ROOT, 'drivers', d, 'driver.flow.compose.json');
    if (!fs.existsSync(f)) continue;
    for (const c of JSON.parse(fs.readFileSync(f, 'utf8')).triggers || []) {
      if (!c.hint || typeof c.hint !== 'object') continue;
      hints++;
      for (const [l, re] of Object.entries(BOILER)) if (typeof c.hint[l] === 'string' && re.test(c.hint[l])) bad.push(`${d}:${c.id}:${l}`);
      assert.ok(typeof c.hint.en === 'string' && c.hint.en.length > 4, `${d}:${c.id} hint.en kept`);
    }
  }
  // D19b: app-level triggers too (.homeycompose/flow/triggers, mirrored in app.json)
  const T = path.join(ROOT, '.homeycompose/flow/triggers');
  for (const f of fs.readdirSync(T)) {
    const c = JSON.parse(fs.readFileSync(path.join(T, f), 'utf8'));
    if (!c.hint || typeof c.hint !== 'object') continue;
    hints++;
    for (const [l, re] of Object.entries(BOILER)) if (typeof c.hint[l] === 'string' && re.test(c.hint[l])) bad.push(`app:${c.id}:${l}`);
  }
  assert.ok(hints > 300, `hints seen ${hints}`);
  assert.deepStrictEqual(bad, []);
});
