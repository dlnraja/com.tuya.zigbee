'use strict';

/**
 * Tuya MCU brightness scale (0-1000).
 *
 * Z2M #32305 / Avatto ZDMS16-2 (`_TZE28C1000000_jtbgusdc`): the MCU reboots if the
 * scaled brightness exceeds 1000. Home Assistant's 0-255 path overflows
 * (255 * 1000 / 254 ≈ 1004). Homey is 0-1, but we still clamp both ends.
 */
function toTuyaBrightness(value) {
  const ratio = Math.min(1, Math.max(0, Number(value) || 0));
  return Math.min(1000, Math.max(0, Math.round(ratio * 1000)));
}

function fromTuyaBrightness(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {return 0;}
  return Math.min(1, Math.max(0, n / 1000));
}

module.exports = { toTuyaBrightness, fromTuyaBrightness };
