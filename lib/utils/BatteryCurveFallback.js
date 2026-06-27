'use strict';

const THREE_V_LITHIUM_CURVE = [
  [3.30, 100],
  [3.10, 98],
  [3.00, 95],
  [2.95, 90],
  [2.90, 85],
  [2.85, 75],
  [2.80, 65],
  [2.75, 50],
  [2.70, 40],
  [2.60, 25],
  [2.50, 15],
  [2.40, 8],
  [2.30, 4],
  [2.20, 2],
  [2.10, 0],
];

function estimate3VLithiumBattery(voltage) {
  const value = Number(voltage);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (value >= THREE_V_LITHIUM_CURVE[0][0]) {
    return 100;
  }

  const last = THREE_V_LITHIUM_CURVE[THREE_V_LITHIUM_CURVE.length - 1];
  if (value <= last[0]) {
    return 0;
  }

  for (let i = 0; i < THREE_V_LITHIUM_CURVE.length - 1; i++) {
    const [highVoltage, highPercent] = THREE_V_LITHIUM_CURVE[i];
    const [lowVoltage, lowPercent] = THREE_V_LITHIUM_CURVE[i + 1];

    if (value <= highVoltage && value >= lowVoltage) {
      const voltageRange = highVoltage - lowVoltage;
      const percentRange = highPercent - lowPercent;
      const ratio = (value - lowVoltage) / voltageRange;
      return Math.round(Math.max(0, Math.min(100, lowPercent + (ratio * percentRange))));
    }
  }

  return 0;
}

module.exports = {
  estimate3VLithiumBattery,
};
