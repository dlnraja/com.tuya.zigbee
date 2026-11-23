'use strict';

/**
 * P3362 / forum 26439 post 5540 (read-only lesson): LCD / Tuya humidity
 * is sometimes sent raw 0-100 and sometimes x10 (or rarely x100).
 * `_TZE200_bjawzodf` + TS0601 is the known x10 case. Adaptive: a value
 * above 100 is scaled down, never invented. Credit: Johan topic 26439
 * reporters; Z2M TS0601_temperature_humidity_sensor_1.
 *
 * @param {number} raw
 * @returns {number|null}
 */
function scaleHumidity(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {return null;}
  let v = n;
  if (v > 100 && v <= 1000) {v = v / 10;}
  else if (v > 1000 && v <= 10000) {v = v / 100;}
  if (v < 0 || v > 100) {return null;}
  return v;
}

module.exports = { scaleHumidity };
