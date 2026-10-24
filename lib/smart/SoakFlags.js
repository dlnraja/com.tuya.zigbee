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
  adaptiveDedup: true, // RawFrameDeduplicator learns per-cluster windows from real repeat gaps
  adaptiveBackoff: true, // MethodChain re-probe delay from success history + sleepy devices
  coupleKnowledge: true, // app-level learning shared by devices of the same mfr|pid
  bayesConfidence: true, // UnknownLearning confirm/contradict (Beta posterior) confidence
  anomalyCorrect: true, // ValueAnomaly may auto-correct a confirmed scale confusion
  pacerPriority: true, // ZigbeeCommandPacer: user commands before polls/re-probes
});
