'use strict';

/**
 * P2628 — Intelligent same-page Flow UX for X-gang remotes/walls
 * 1) Fix FlowCardHelper runListener (device cards have no args.device)
 * 2) Add button dropdown on main press cards so all buttons share one Flow page
 * 3) Register short remote_button_wireless_wall btn_* IDs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function buttonDropdownValues(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    out.push({
      id: String(i),
      title: {
        en: `Button ${i}`,
        fr: `Bouton ${i}`,
        nl: `Knop ${i}`,
        de: `Taste ${i}`,
      },
    });
  }
  return out;
}

function buttonDropdownArg(n) {
  return {
    name: 'button',
    type: 'dropdown',
    title: {
      en: 'Button',
      fr: 'Bouton',
      nl: 'Knop',
      de: 'Taste',
    },
    values: buttonDropdownValues(n),
  };
}

function titleFmt(en, fr) {
  return {
    en: `${en} [[button]]`,
    fr: `${fr} [[button]]`,
    nl: `${en} [[button]]`,
    de: `${en} [[button]]`,
  };
}

const MAIN_SPECS = [
  {
    suffix: 'button_pressed',
    title: { en: 'Button pressed', fr: 'Bouton appuyé' },
    highlight: true,
  },
  {
    suffix: 'button_double_press',
    title: { en: 'Button double-pressed', fr: 'Bouton double-cliqué' },
  },
  {
    suffix: 'button_long_press',
    title: { en: 'Button long-pressed', fr: 'Bouton pressé longtemps' },
  },
  {
    suffix: 'button_multi_press',
    title: { en: 'Button multi-pressed', fr: 'Bouton multi-cliqué' },
    extraTokens: true,
  },
];

function ensureMainDropdownCards(flow, driverId, gangCount) {
  if (gangCount < 2) return { added: 0, patched: 0 };
  let added = 0;
  let upgraded = 0;
  const triggers = Array.isArray(flow.triggers) ? flow.triggers : [];
  flow.triggers = triggers;

  for (const spec of MAIN_SPECS) {
    const id = `${driverId}_button_${gangCount}gang_${spec.suffix}`;
    let card = triggers.find((t) => t && t.id === id);
    if (!card) {
      card = {
        id,
        title: {
          en: spec.title.en,
          fr: spec.title.fr,
          nl: spec.title.en,
          de: spec.title.en,
        },
        args: [buttonDropdownArg(gangCount)],
        tokens: [
          {
            name: 'button',
            type: 'string',
            title: { en: 'Button', fr: 'Bouton', nl: 'Knop', de: 'Taste' },
            example: '1',
          },
        ],
        titleFormatted: titleFmt(spec.title.en, spec.title.fr),
      };
      if (spec.highlight) card.highlight = true;
      if (spec.extraTokens) {
        card.tokens.push({
          name: 'count',
          type: 'number',
          title: { en: 'Count', fr: 'Nombre' },
          example: 3,
        });
      }
      // Insert at front so same-page dropdown cards appear first in Flow UX
      triggers.unshift(card);
      added++;
      continue;
    }
    // Upgrade existing: add dropdown if missing / empty args
    const hasDropdown = Array.isArray(card.args)
      && card.args.some((a) => a && a.name === 'button' && a.type === 'dropdown');
    if (!hasDropdown) {
      card.args = [buttonDropdownArg(gangCount)];
      card.titleFormatted = titleFmt(spec.title.en, spec.title.fr);
      if (spec.highlight) card.highlight = true;
      upgraded++;
    } else {
      // Ensure values cover 1..gangCount (UNION)
      const arg = card.args.find((a) => a.name === 'button');
      const have = new Set((arg.values || []).map((v) => String(v.id)));
      for (const v of buttonDropdownValues(gangCount)) {
        if (!have.has(v.id)) {
          arg.values = arg.values || [];
          arg.values.push(v);
        }
      }
      if (card.titleFormatted) {
        // Prefer [[button]] for dropdown UX (not token {button})
        for (const lang of Object.keys(card.titleFormatted)) {
          const s = String(card.titleFormatted[lang] || '');
          if (s.includes('{button}') && !s.includes('[[button]]')) {
            card.titleFormatted[lang] = s.replace(/\{button\}/g, '[[button]]');
          }
        }
      } else {
        card.titleFormatted = titleFmt(spec.title.en, spec.title.fr);
      }
    }
  }
  return { added, upgraded };
}

// --- 1) Fix FlowCardHelper ---
const helperPath = path.join(ROOT, 'lib/FlowCardHelper.js');
let helper = fs.readFileSync(helperPath, 'utf8');
const oldFn = `function shouldRunForDeviceAndButton(args = {}, state = {}) {
  if (!args.device) {
    return false;
  }
  if (args.button !== undefined && state.button !== undefined) {
    return String(args.button) === String(state.button);
  }
  return true;
}`;
const newFn = `function shouldRunForDeviceAndButton(args = {}, state = {}) {
  // WHY(P2628): Homey device trigger cards are already device-scoped —
  // args.device is often absent. Requiring it made ALL button Flows never start.
  if (args.button !== undefined && state.button !== undefined) {
    return String(args.button) === String(state.button);
  }
  if (args.device && state.device) {
    try {
      const a = args.device.id || args.device;
      const s = state.device.id || state.device;
      if (a && s) return String(a) === String(s);
    } catch (_e) { /* soft */ }
  }
  return true;
}`;
if (helper.includes('if (!args.device)')) {
  helper = helper.replace(oldFn, newFn);
  // Also register short remote wall IDs + scene_switch style
  if (!helper.includes('remote_button_wireless_wall_btn_pressed')) {
    helper = helper.replace(
      'driver.log(`[FLOW] Flow cards registration complete for ${driverId}`);',
      `// WHY(P2628): short Athom-safe IDs for remote_button_wireless_wall
  if (/remote_button_wireless_wall/i.test(driverId)) {
    for (const id of [
      'remote_button_wireless_wall_btn_pressed',
      'remote_button_wireless_wall_btn_double',
      'remote_button_wireless_wall_btn_long',
      'remote_button_wireless_wall_btn_multi',
      'remote_button_wireless_wall_btn1_pressed',
      'remote_button_wireless_wall_btn1_double',
      'remote_button_wireless_wall_btn1_long',
      'remote_button_wireless_wall_btn1_triple',
      'remote_button_wireless_wall_btn1_release',
      'remote_button_wireless_wall_scene_recall',
      'remote_button_wireless_wall_battery_low',
    ]) {
      registerDeviceTrigger(driver, id, shouldRunForDeviceAndButton);
    }
  }
  // WHY(P2628): scene_switch_N uses *_button_pressed with dropdown (no Ngang in id)
  if (/^scene_switch_/i.test(driverId)) {
    for (const press of ['button_pressed', 'button_double_press', 'button_long_press', 'button_multi_press']) {
      registerDeviceTrigger(driver, \`\${driverId}_\${press}\`, shouldRunForDeviceAndButton);
    }
  }

  driver.log(\`[FLOW] Flow cards registration complete for \${driverId}\`);`,
    );
  }
  fs.writeFileSync(helperPath, helper);
  console.log('FlowCardHelper patched');
} else {
  console.log('FlowCardHelper already patched or unexpected shape');
}

// --- 2) Enrich flow compose for X-gang remotes / walls ---
const TARGETS = [
  ['button_wireless_2', 2],
  ['button_wireless_3', 3],
  ['button_wireless_4', 4],
  ['button_wireless_6', 6],
  ['button_wireless_8', 8],
  ['wall_remote_3_gang', 3],
  ['wall_remote_4_gang', 4],
  ['wall_remote_6_gang', 6],
  ['scene_switch_4', 4],
  ['handheld_remote_4_buttons', 4],
  ['remote_button_wireless', 3],
];

for (const [driverId, n] of TARGETS) {
  const fp = path.join(ROOT, 'drivers', driverId, 'driver.flow.compose.json');
  if (!fs.existsSync(fp)) {
    console.log('skip missing', driverId);
    continue;
  }
  const flow = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const r = ensureMainDropdownCards(flow, driverId, n);
  fs.writeFileSync(fp, `${JSON.stringify(flow, null, 2)}\n`);
  console.log(driverId, r);
}

console.log('P2628 enrich done');
