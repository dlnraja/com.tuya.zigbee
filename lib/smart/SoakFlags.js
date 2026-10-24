'use strict';

/**
 * P3023: behaviour changes that SOAK on master before reaching stable-v5 / bastien-home.
 *
 * Every P3023 "smart" layer that changes observable behaviour is gated here, so the three
 * branches can share byte-identical modules and only this file differs:
 *   master       → all true (soak);
 *   stable-v5    → all false (pure helpers + memory fixes only);
 *   bastien-home → all false.
 * Memory caps / leaks / the memory budget are NOT gated: they ship everywhere.
 */
module.exports = Object.freeze({
  adaptiveDedup: false, // RawFrameDeduplicator learns per-cluster windows from real repeat gaps
  adaptiveBackoff: false, // MethodChain re-probe delay from success history + sleepy devices
  coupleKnowledge: false, // app-level learning shared by devices of the same mfr|pid
  bayesConfidence: false, // UnknownLearning confirm/contradict (Beta posterior) confidence
  anomalyCorrect: false, // ValueAnomaly may auto-correct a confirmed scale confusion
  pacerPriority: false, // ZigbeeCommandPacer: user commands before polls/re-probes
});
