'use strict';
// P3363: no duplicate rendered titles per driver/locale, no obvious wrong-language
// strings, no known missing accents, published ids stay put.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');
const ROOT = path.join(__dirname, '..', '..');
const ST = require(path.join(ROOT, 'scripts/automation/store-text-coherence.js'));

describe('P3363 store-text coherence', () => {
  it('accents known unaccented French words and "linverse"', () => {
    const s = ST.accentText('App Zigbee privee, fiabilite, jamais linverse, Controleur');
    assert.match(s, /priv\u00E9e/);
    assert.match(s, /fiabilit\u00E9/);
    assert.match(s, /l'inverse/);
    assert.match(s, /Contr\u00F4leur/);
    assert.ok([...s].every((c) => c.charCodeAt(0) <= 0xFF));
  });

  it('translates Physical button titles and distinguishes a copied capability title', () => {
    const physical = ST.titlePatcher('button_wireless_2_physical_on')({ en: 'Physical button on', fr: 'Physical button on' });
    assert.equal(physical.fr, 'Bouton physique allum\u00E9');
    assert.equal(physical.en, 'Physical button on');
    const batt = ST.titlePatcher('button_wireless_2_measure_battery_changed')({
      en: 'The battery level changed', fr: 'Le niveau de la batterie a chang\u00E9',
    });
    assert.match(batt.en, /report/i);
    assert.match(batt.fr, /rapport/i);
    assert.notEqual(batt.fr, 'Le niveau de la batterie a chang\u00E9');
  });

  it('fail-before / pass-after: a temp tree with a French accent hole and a duplicate title is fixed without dropping ids', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3363-st-'));
    fs.mkdirSync(path.join(dir, '.homeycompose'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.homeycompose', 'app.json'), JSON.stringify({
      id: 'com.example', version: '1.0.0',
      description: { en: 'Private app.', fr: 'App Zigbee privee (jamais linverse).' },
    }, null, 2));
    const d = path.join(dir, 'drivers', 'demo_knob');
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'driver.compose.json'), JSON.stringify({
      name: { en: 'Smart Knob', fr: 'Bouton Rotatif Intelligent' },
      zigbee: { manufacturerName: ['_TZ3000_x'], productId: ['TS004F'] },
    }, null, 2));
    fs.writeFileSync(path.join(d, 'driver.flow.compose.json'), JSON.stringify({
      triggers: [
        { id: 'demo_knob_measure_battery_changed', title: { en: 'The battery level changed', fr: 'Le niveau de la batterie a chang\u00E9' } },
        { id: 'demo_knob_battery_report', title: { en: 'The battery level changed', fr: 'Le niveau de la batterie a chang\u00E9' } },
        { id: 'demo_knob_physical_on', title: { en: 'Physical button on', fr: 'Physical button on' } },
      ],
    }, null, 2));
    const before = ST.check(dir);
    assert.ok(before.fatal > 0, JSON.stringify(before.findings));
    ST.apply(dir);
    const after = ST.check(dir);
    assert.equal(after.fatal, 0, JSON.stringify(after.findings));
    const desc = JSON.parse(fs.readFileSync(path.join(dir, '.homeycompose', 'app.json'), 'utf8')).description.fr;
    assert.match(desc, /priv\u00E9e/);
    assert.match(desc, /l'inverse/);
    const flow = JSON.parse(fs.readFileSync(path.join(d, 'driver.flow.compose.json'), 'utf8'));
    const ids = flow.triggers.map((c) => c.id).sort();
    assert.deepStrictEqual(ids, ['demo_knob_battery_report', 'demo_knob_measure_battery_changed', 'demo_knob_physical_on']);
    const frTitles = flow.triggers.map((c) => c.title.fr);
    assert.equal(new Set(frTitles).size, frTitles.length, JSON.stringify(frTitles));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('live tree: no duplicate driver names, no known missing accents, no untranslated Physical/Gang titles', () => {
    const a = ST.check(ROOT);
    const interesting = a.findings.filter((f) => [
      'duplicate-driver-name', 'duplicate-title', 'missing-accent',
      'wrong-language-or-wording', 'en-in-fr-name', 'en-in-fr-title',
    ].includes(f.code));
    assert.deepStrictEqual(interesting, [], JSON.stringify(interesting.slice(0, 12)));
  });

  it('live compose never drops a driver or flow-card id (inventories match after a no-op apply on a copy is covered by the temp test)', () => {
    // Snapshot ids from the live tree; apply is not run here.
    const drivers = fs.readdirSync(path.join(ROOT, 'drivers')).filter((id) => {
      try { return fs.statSync(path.join(ROOT, 'drivers', id)).isDirectory(); } catch (_e) { return false; }
    });
    assert.ok(drivers.length > 20);
    let cards = 0;
    for (const id of drivers) {
      const f = path.join(ROOT, 'drivers', id, 'driver.flow.compose.json');
      if (!fs.existsSync(f)) continue;
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      for (const k of ['triggers', 'conditions', 'actions']) {
        for (const c of j[k] || []) {
          assert.ok(c.id, `${id} ${k} missing id`);
          cards++;
        }
      }
    }
    assert.ok(cards > 10);
  });

  it('syncAppJson writes compact source form and restores a built manifest from HEAD', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3363-appjson-'));
    const source = {
      _comment: 'src', id: 'demo', version: '1.0.0',
      description: { en: 'x', fr: 'y' },
      drivers: [],
      flow: { triggers: [{ id: 't1', title: { en: 'A' } }], conditions: [], actions: [] },
    };
    fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify(source) + '\n');
    fs.mkdirSync(path.join(dir, '.homeycompose'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.homeycompose', 'app.json'), JSON.stringify({
      description: { en: 'Local Zigbee', fr: 'Controle local' },
    }, null, 2));
    const { execSync } = require('child_process');
    execSync('git init && git add app.json && git -c user.email=t@t -c user.name=t -c core.hooksPath=/dev/null commit -m init', { cwd: dir });
    const built = {
      ...source,
      flow: {
        triggers: Array.from({ length: 401 }, (_, i) => ({ id: 't' + i })),
        conditions: [], actions: [],
      },
    };
    fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify(built, null, 2) + '\n');
    assert.equal(ST.looksBuiltAppJson(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'), built), true);
    const r = ST.syncAppJson(dir);
    assert.equal(r.restored, true);
    const raw = fs.readFileSync(path.join(dir, 'app.json'), 'utf8');
    assert.equal(raw.includes('\n  '), false, 'must stay compact source form');
    const out = JSON.parse(raw);
    assert.equal(out.flow.triggers.length, 1);
    assert.equal(out.description.fr, 'Controle local');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('embedded driver.compose.json flow titles win over driver.flow.compose.json on a shared id', () => {
    const fileFlow = {
      actions: [
        { id: 'curtain_calibrate', title: { en: 'Calibrate', fr: 'Calibrate' }, titleFormatted: { en: 'Calibrate', fr: 'Calibrate' } },
      ],
    };
    const embedded = {
      actions: [
        { id: 'curtain_calibrate', title: { en: 'Calibrate curtain motor', fr: 'Calibrer le moteur du rideau', nl: 'Kalibreer gordijnmotor' } },
      ],
    };
    const r = ST.overlayEmbeddedFlow(JSON.parse(JSON.stringify(fileFlow)), embedded);
    assert.equal(r.changed, true);
    const card = r.flow.actions[0];
    assert.equal(card.title.en, 'Calibrate curtain motor');
    assert.equal(card.title.fr, 'Calibrer le moteur du rideau');
    assert.equal(card.titleFormatted, undefined);
  });

  it('turns English uniqueify and flow-title suffixes into French', () => {
    assert.equal(ST.frenchHint('air purifier din'), 'purificateur d\'air din');
    assert.equal(ST.frenchHint('wall switch 1 gang tuya'), 'interrupteur mural 1 voie Tuya');
    assert.equal(ST.frenchHint('dimmer 1gang turned on'), 'variateur 1 voie allum\u00E9');
    assert.equal(ST.stripEnglishHintSuffix('Interrupteur mural 1 voie (wall switch 1 gang tuya)'), 'Interrupteur mural 1 voie');
    assert.match(ST.repairFrSuffix('Allum\u00E9 (dimmer 1gang turned on)'), /variateur 1 voie allum\u00E9/);
    assert.match(ST.frenchHint('interrupteur physique gang1 on'), /voie 1 allum\u00E9/);
    assert.match(ST.frenchHint('generic Tuya humidity chang\u00E9e'), /g\u00E9n\u00E9rique Tuya humidit\u00E9 chang\u00E9e/);
  });
});
