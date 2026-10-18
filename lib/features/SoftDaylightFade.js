'use strict';

/**
 * SoftDaylightFade (P2563/P2564) — full branding-free daytime white / Adaptive-Lighting feel.
 *
 * Modes:
 *   - one-shot fade (planFade + startOnDevice)
 *   - continuous auto (re-plans toward Daylight Atmosphere on an interval)
 *   - dawn ramp / dusk fade (shared ease engine)
 *
 * MASTER_ONLY. No commercial UI names.
 */

const DaylightAtmosphere = require('./DaylightAtmosphere');

function clamp01(x) {
  return Math.max(0, Math.min(1, Number(x) || 0));
}

function lerp(a, b, t) {
  return a + (b - a) * clamp01(t);
}

function easeInOut(t) {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function planFade(opts = {}) {
  const minutes = Math.max(1, Math.min(180, Number(opts.minutes) || 30));
  const steps = Math.max(4, Math.min(90, Number(opts.steps) || Math.round(minutes)));
  const stepMs = Math.max(500, Math.round((minutes * 60 * 1000) / steps));

  const curve = DaylightAtmosphere.compute({
    date: opts.date instanceof Date ? opts.date : new Date(),
    solar: opts.solar || null,
    lux: typeof opts.lux === 'number' ? opts.lux : null,
  });

  const toDim = clamp01(opts.toDim != null ? opts.toDim : curve.dim);
  const toTemp = clamp01(opts.toTemperature != null ? opts.toTemperature : curve.temperature);
  const fromDim = clamp01(opts.fromDim != null ? opts.fromDim : toDim);
  const fromTemp = clamp01(opts.fromTemperature != null ? opts.fromTemperature : toTemp);

  const out = [];
  for (let i = 1; i <= steps; i++) {
    const ease = easeInOut(i / steps);
    out.push({
      dim: Math.round(lerp(fromDim, toDim, ease) * 1000) / 1000,
      temperature: Math.round(lerp(fromTemp, toTemp, ease) * 1000) / 1000,
      kelvin: Math.round(lerp(
        DaylightAtmosphere.KELVIN_COLD - fromTemp * (DaylightAtmosphere.KELVIN_COLD - DaylightAtmosphere.KELVIN_WARM),
        DaylightAtmosphere.KELVIN_COLD - toTemp * (DaylightAtmosphere.KELVIN_COLD - DaylightAtmosphere.KELVIN_WARM),
        ease,
      )),
      progress: Math.round(ease * 1000) / 1000,
    });
  }

  return {
    steps: out,
    stepMs,
    minutes,
    target: { dim: toDim, temperature: toTemp, kelvin: curve.kelvin, source: curve.source },
  };
}

async function _setLight(app, light, step, { forceOn = true } = {}) {
  if (typeof app._hueSetLight === 'function') {
    await app._hueSetLight(light, {
      onoff: forceOn ? true : undefined,
      dim: step.dim,
      temperature: step.temperature,
    });
    return;
  }
  const set = light.safeSetCapabilityValue?.bind(light) || light.setCapabilityValue?.bind(light);
  if (!set) return;
  if (forceOn && light.hasCapability?.('onoff')) await set('onoff', true).catch(() => {});
  if (light.hasCapability?.('dim') && step.dim != null) await set('dim', step.dim).catch(() => {});
  if (light.hasCapability?.('light_temperature') && step.temperature != null) {
    await set('light_temperature', step.temperature).catch(() => {});
  } else if (light.hasCapability?.('light_color_temp') && step.temperature != null) {
    await set('light_color_temp', step.temperature).catch(() => {});
  }
}

function _clearTimer(app, light, key) {
  const t = light?.[key];
  if (!t) return;
  try { app?.homey?.clearInterval?.(t); } catch (_e) { /* */ }
  try { app?.homey?.clearTimeout?.(t); } catch (_e) { /* */ }
  light[key] = null;
}

function startOnDevice(app, light, opts = {}) {
  if (!app?.homey || !light) return null;
  const plan = planFade({
    ...opts,
    fromDim: opts.fromDim != null ? opts.fromDim : light.getCapabilityValue?.('dim'),
    fromTemperature: opts.fromTemperature != null
      ? opts.fromTemperature
      : (light.getCapabilityValue?.('light_temperature')
        ?? light.getCapabilityValue?.('light_color_temp')),
    solar: opts.solar || app.solarElevation,
    lux: typeof opts.lux === 'number' ? opts.lux : light.getStoreValue?.('room_balance_lux'),
  });

  stopOnDevice(app, light);

  let i = 0;
  light.__softDaylightFade = app.homey.setInterval(async () => {
    if (light._destroyed) {
      stopOnDevice(app, light);
      return;
    }
    const step = plan.steps[i++];
    if (!step) {
      stopOnDevice(app, light);
      return;
    }
    try { await _setLight(app, light, step, { forceOn: opts.forceOn !== false }); } catch (_e) { /* soft */ }
    if (i >= plan.steps.length) stopOnDevice(app, light);
  }, plan.stepMs);

  _setLight(app, light, plan.steps[0], { forceOn: opts.forceOn !== false }).catch(() => {});
  return plan;
}

function stopOnDevice(app, light) {
  _clearTimer(app, light, '__softDaylightFade');
}

/**
 * Continuous Soft Daylight — full Adaptive-Lighting-style follow of Daylight Atmosphere.
 */
function enableAuto(app, light, opts = {}) {
  if (!app?.homey || !light) return false;
  disableAuto(app, light);
  const intervalMin = Math.max(2, Math.min(30, Number(opts.intervalMinutes) || 5));
  const fadeMin = Math.max(1, Math.min(15, Number(opts.fadeMinutes) || 3));

  const tick = () => {
    if (light._destroyed) {
      disableAuto(app, light);
      return;
    }
    // Only nudge lights that are ON (same as CircadianEngine)
    if (light.hasCapability?.('onoff') && light.getCapabilityValue?.('onoff') !== true) return;
    startOnDevice(app, light, {
      minutes: fadeMin,
      steps: Math.max(6, fadeMin * 2),
      forceOn: false,
      solar: app.solarElevation,
    });
  };

  light.__softDaylightAuto = app.homey.setInterval(tick, intervalMin * 60 * 1000);
  light.__softDaylightAutoOpts = { intervalMin, fadeMin };
  tick();
  return true;
}

function disableAuto(app, light) {
  _clearTimer(app, light, '__softDaylightAuto');
  if (light) light.__softDaylightAutoOpts = null;
  stopOnDevice(app, light);
}

function isAutoEnabled(light) {
  return !!(light && light.__softDaylightAuto);
}

/** Dawn Ramp — soft rise to target dim with warming→atmosphere CCT */
function startDawnRamp(app, light, opts = {}) {
  if (!app?.homey || !light) return null;
  const minutes = Math.max(1, Math.min(120, Number(opts.minutes) || 15));
  const targetDim = clamp01(opts.targetDim != null ? opts.targetDim : 1);
  const curve = DaylightAtmosphere.compute({
    solar: app.solarElevation,
    lux: light.getStoreValue?.('room_balance_lux'),
  });
  return startOnDevice(app, light, {
    minutes,
    steps: Math.max(8, Math.min(60, minutes * 2)),
    fromDim: 0.01,
    fromTemperature: Math.min(1, curve.temperature + 0.2),
    toDim: targetDim,
    toTemperature: curve.temperature,
    forceOn: true,
  });
}

/** Dusk Fade — soft dim + warm then off */
function startDuskFade(app, light, opts = {}) {
  if (!app?.homey || !light) return null;
  const minutes = Math.max(1, Math.min(120, Number(opts.minutes) || 15));
  const fromDim = clamp01(
    opts.fromDim != null
      ? opts.fromDim
      : (light.getCapabilityValue?.('dim') || 1),
  );
  const fromTemp = clamp01(
    light.getCapabilityValue?.('light_temperature')
      ?? light.getCapabilityValue?.('light_color_temp')
      ?? 0.7,
  );

  stopOnDevice(app, light);
  const plan = planFade({
    minutes,
    steps: Math.max(8, Math.min(60, minutes * 2)),
    fromDim,
    fromTemperature: fromTemp,
    toDim: 0.01,
    toTemperature: Math.min(1, fromTemp + 0.25),
  });

  let i = 0;
  light.__softDaylightFade = app.homey.setInterval(async () => {
    if (light._destroyed) {
      stopOnDevice(app, light);
      return;
    }
    const step = plan.steps[i++];
    if (!step) {
      stopOnDevice(app, light);
      return;
    }
    try {
      await _setLight(app, light, step, { forceOn: true });
    } catch (_e) { /* soft */ }
    if (i >= plan.steps.length) {
      stopOnDevice(app, light);
      try {
        if (typeof app._hueSetLight === 'function') {
          await app._hueSetLight(light, { onoff: false });
        } else if (light.hasCapability?.('onoff')) {
          await (light.safeSetCapabilityValue || light.setCapabilityValue)?.('onoff', false);
        }
      } catch (_e2) { /* soft */ }
    }
  }, plan.stepMs);

  _setLight(app, light, plan.steps[0], { forceOn: true }).catch(() => {});
  return plan;
}

module.exports = {
  planFade,
  startOnDevice,
  stopOnDevice,
  enableAuto,
  disableAuto,
  isAutoEnabled,
  startDawnRamp,
  startDuskFade,
  easeInOut,
};
