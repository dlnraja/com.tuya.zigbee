'use strict';

/**
 * SoftDaylightFade (P2563) — branding-free continuous white/dim fade toward Daylight Atmosphere.
 *
 * WHY: commercial “daytime TruTone / Adaptive Lighting” feel = many small steps, not jumps.
 * Pure math + optional timer driver; no vendor names in UI.
 * MASTER_ONLY feature engine.
 */

const DaylightAtmosphere = require('./DaylightAtmosphere');

function clamp01(x) {
  return Math.max(0, Math.min(1, Number(x) || 0));
}

function lerp(a, b, t) {
  return a + (b - a) * clamp01(t);
}

/**
 * Build N intermediate targets from current → atmosphere curve.
 * @returns {{ steps: Array<{ dim: number, temperature: number, kelvin: number }>, stepMs: number }}
 */
function planFade(opts = {}) {
  const minutes = Math.max(1, Math.min(180, Number(opts.minutes) || 30));
  const steps = Math.max(4, Math.min(60, Number(opts.steps) || Math.round(minutes)));
  const stepMs = Math.round((minutes * 60 * 1000) / steps);

  const curve = DaylightAtmosphere.compute({
    date: opts.date instanceof Date ? opts.date : new Date(),
    solar: opts.solar || null,
    lux: typeof opts.lux === 'number' ? opts.lux : null,
  });

  const fromDim = clamp01(opts.fromDim != null ? opts.fromDim : curve.dim);
  const fromTemp = clamp01(opts.fromTemperature != null ? opts.fromTemperature : curve.temperature);
  const toDim = clamp01(curve.dim);
  const toTemp = clamp01(curve.temperature);

  const out = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Ease-in-out for natural feel (pseudo TruTone)
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    out.push({
      dim: Math.round(lerp(fromDim, toDim, ease) * 1000) / 1000,
      temperature: Math.round(lerp(fromTemp, toTemp, ease) * 1000) / 1000,
      kelvin: Math.round(lerp(
        DaylightAtmosphere.KELVIN_COLD - fromTemp * (DaylightAtmosphere.KELVIN_COLD - DaylightAtmosphere.KELVIN_WARM),
        curve.kelvin,
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

/**
 * Attach a soft fade runner on a Homey light device (uses app timers).
 */
function startOnDevice(app, light, opts = {}) {
  if (!app?.homey || !light) return null;
  const plan = planFade({
    ...opts,
    fromDim: light.getCapabilityValue?.('dim'),
    fromTemperature: light.getCapabilityValue?.('light_temperature')
      ?? light.getCapabilityValue?.('light_color_temp'),
    solar: app.solarElevation,
    lux: typeof opts.lux === 'number' ? opts.lux : light.getStoreValue?.('room_balance_lux'),
  });

  stopOnDevice(app, light);

  let i = 0;
  const setLight = async (step) => {
    if (typeof app._hueSetLight === 'function') {
      await app._hueSetLight(light, {
        onoff: true,
        dim: step.dim,
        temperature: step.temperature,
      });
    }
  };

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
      await setLight(step);
    } catch (_e) { /* soft */ }
    if (i >= plan.steps.length) stopOnDevice(app, light);
  }, plan.stepMs);

  // Kick first step soon
  setLight(plan.steps[0]).catch(() => {});
  return plan;
}

function stopOnDevice(app, light) {
  if (!light?.__softDaylightFade) return;
  try {
    app?.homey?.clearInterval?.(light.__softDaylightFade);
  } catch (_e) { /* */ }
  light.__softDaylightFade = null;
}

module.exports = {
  planFade,
  startOnDevice,
  stopOnDevice,
};
