'use strict';

/**
 * P2487c — Homey Pro 2023 onboard IR TX (third Intelligent IR path).
 * WHY: Toolkit-style UX can also blast via Homey Sphere IR when no Zigbee/WiFi blaster nearby.
 * Contre quoi: hard-fail on HP2019 / Bridge; invent RX learn on TX-only hardware.
 *
 * Soft-call chain (firmware varies):
 *  1) ManagerRF.txInfraredProntohex / aliases
 *  2) SignalInfrared('intelligent_ir_pronto').tx(pronto|buffer)
 * Learn stays on Zigbee/WiFi — Homey path is TX-only.
 */

const SENDER_ID = 'homey_infrared';
const SIGNAL_ID = 'intelligent_ir_pronto';

function normalizeProntoPayload(pronto) {
  return String(pronto || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * Soft probe — never throw. True when RF manager exists (permission + local Homey).
 * @param {object} homey
 * @returns {boolean}
 */
function isHomeyInfraredAvailable(homey) {
  try {
    if (!homey || !homey.rf) return false;
    if (typeof homey.rf.getSignalInfrared !== 'function'
      && typeof homey.rf.txInfraredProntohex !== 'function'
      && typeof homey.rf.sendInfraredProntohex !== 'function') {
      // Still list if rf exists — TX may soft-fail later with clear message
      return !!homey.rf;
    }
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Virtual sender descriptor for IntelligentIRRouter.listSenders().
 * @param {object} homey
 * @returns {object|null}
 */
function getHomeyInfraredSender(homey) {
  if (!isHomeyInfraredAvailable(homey)) return null;
  return {
    id: SENDER_ID,
    driverId: SENDER_ID,
    name: 'Homey onboard IR (Pro 2023)',
    transport: 'homey',
    device: null,
    available: true,
    learnSupported: false,
  };
}

/**
 * TX ProntoHex via Homey onboard IR.
 * @param {object} homey
 * @param {string} pronto
 * @param {{ repetitions?: number }} [opts]
 */
async function sendPronto(homey, pronto, opts = {}) {
  const payload = normalizeProntoPayload(pronto);
  if (!payload || !/^0000\s/i.test(payload)) {
    throw new Error('Homey IR TX requires Pronto Hex (0000 …)');
  }

  // WHY(P2501): Homey RF also needs flood guard when called outside IntelligentIRRouter
  if (!opts.skipFloodGuard) {
    try {
      const { getGuard } = require('./IRFloodGuard');
      const flood = getGuard(homey).checkSend({
        senderKey: SENDER_ID,
        transport: 'homey',
        payload,
        repetitions: opts.repetitions,
      });
      if (!flood.allow) {
        if (flood.hard) {
          throw new Error(`IR flood guard: ${flood.reason}`);
        }
        return { ok: true, skipped: true, reason: flood.reason, retryAfterMs: flood.retryAfterMs || 0 };
      }
      opts = { ...opts, repetitions: flood.repetitions };
    } catch (err) {
      if (String(err && err.message || '').includes('IR flood guard')) throw err;
      /* soft — guard load must never block TX */
    }
  }

  const repetitions = Math.max(1, Math.min(3, Number(opts.repetitions) || 1));
  const rf = homey && homey.rf;
  if (!rf) {
    throw new Error('Homey RF manager unavailable (need local Homey + homey:wireless:ir)');
  }

  for (const name of ['txInfraredProntohex', 'sendInfraredProntohex', 'txProntohex']) {
    if (typeof rf[name] === 'function') {
      return rf[name].call(rf, { payload, repetitions });
    }
  }

  let signal = null;
  try {
    if (typeof rf.getSignalInfrared === 'function') {
      signal = rf.getSignalInfrared(SIGNAL_ID);
    }
  } catch (err) {
    signal = null;
  }

  if (signal && typeof signal.tx === 'function') {
    try {
      return await signal.tx(payload, { repetitions });
    } catch (_) {
      /* try buffer form */
    }
    try {
      const hexOnly = payload.replace(/\s+/g, '');
      return await signal.tx(Buffer.from(hexOnly, 'hex'), { repetitions });
    } catch (_) {
      /* fall through */
    }
  }

  if (signal && typeof signal.cmd === 'function') {
    // Manifest may only have TEST — useful for smoke, not arbitrary paste
    try {
      if (typeof signal.setCommand === 'function') {
        await signal.setCommand('TX', payload);
        return signal.cmd('TX', { repetitions });
      }
    } catch (_) {
      /* ignore */
    }
  }

  throw new Error(
    'Homey onboard IR TX unavailable on this unit (Homey Pro 2023 Pronto TX required). Use a Zigbee/WiFi IR blaster, or update Homey.',
  );
}

module.exports = {
  SENDER_ID,
  SIGNAL_ID,
  isHomeyInfraredAvailable,
  getHomeyInfraredSender,
  sendPronto,
  normalizeProntoPayload,
};
