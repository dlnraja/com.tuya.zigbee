'use strict';

// v5.9.22: Centralized 0-indexed press type map (prevents v5.9.19 regression).
// Tuya/Z2M convention: 0=single, 1=double, 2=long. Keep numeric values 0-indexed.
const PRESS_MAP = Object.freeze({
  0: 'single', 1: 'double', 2: 'long',
  3: 'single', 4: 'double', 5: 'long',
});

// Cross-project vocabulary seen in legacy drivers, Zigbee2MQTT-style actions,
// Home Assistant/ZHA quirks, and Homey direct cluster events.
const ACTION_ALIASES = Object.freeze({
  press: 'single',
  pressed: 'single',
  click: 'single',
  clicked: 'single',
  short: 'single',
  short_press: 'single',
  single: 'single',
  single_press: 'single',
  single_click: 'single',
  single_clicked: 'single',
  on: 'single',
  set_on: 'single',
  toggle: 'single',
  set_toggle: 'single',
  commandon: 'single',
  command_on: 'single',
  command_on_with_timed_off: 'single',
  command_on_with_effect: 'single',
  brightness_step_up: 'single',
  brightness_step_down: 'single',
  brightness_move_up: 'single',
  brightness_move_down: 'single',
  brightness_set: 'single',
  rotate_left: 'single',
  rotate_right: 'single',
  rotation_left: 'single',
  rotation_right: 'single',
  double: 'double',
  double_press: 'double',
  double_click: 'double',
  double_clicked: 'double',
  commandoff: 'double',
  command_off: 'double',
  command_off_with_effect: 'double',
  hold: 'long',
  held: 'long',
  long: 'long',
  long_press: 'long',
  long_pressed: 'long',
  commandtoggle: 'long',
  command_toggle: 'long',
  command_toggle_with_effect: 'long',
  triple: 'multi',
  triple_press: 'multi',
  triple_click: 'multi',
  triple_clicked: 'multi',
  multi: 'multi',
  multi_press: 'multi',
  multiple: 'multi',
  release: 'release',
  released: 'release',
  button_release: 'release',
  stop: 'release',
  brightness_stop: 'release',
});

const BUTTON_ACTION_RE = /^(?:button_?)?(\d+)_+(.+)$/;

function normalizeToken(raw) {
  if (raw === undefined || raw === null) return '';
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/^action_/, '')
    .replace(/^button_action_/, '');
}

function resolve(raw, ctx) {
  if (raw && typeof raw === 'object') {
    const candidate = raw.action ?? raw.type ?? raw.pressType ?? raw.press_type
      ?? raw.value ?? raw.scene ?? raw.sceneId ?? raw.presentValue;
    if (candidate !== undefined) return resolve(candidate, ctx);
  }

  if (PRESS_MAP[raw]) return PRESS_MAP[raw];

  const token = normalizeToken(raw);
  if (!token) return 'single';

  const buttonAction = token.match(BUTTON_ACTION_RE);
  if (buttonAction) return resolve(buttonAction[2], ctx);

  if (PRESS_MAP[token]) return PRESS_MAP[token];
  if (ACTION_ALIASES[token]) return ACTION_ALIASES[token];

  if (token.includes('double')) return 'double';
  if (token.includes('hold') || token.includes('long')) return 'long';
  if (token.includes('triple') || token.includes('multi')) return 'multi';
  if (token.includes('release') || token.endsWith('_stop')) return 'release';

  return 'single';
}

function resolveAction(raw, fallbackButton = 1, ctx) {
  const token = normalizeToken(raw);
  const match = token.match(BUTTON_ACTION_RE);
  if (!match) {
    return { button: Number(fallbackButton) || 1, pressType: resolve(raw, ctx) };
  }

  return {
    button: Number(match[1]) || Number(fallbackButton) || 1,
    pressType: resolve(match[2], ctx),
  };
}

module.exports = { PRESS_MAP, ACTION_ALIASES, resolve, resolveAction };
