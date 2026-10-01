'use strict';

/**
 * ContactSourceLatch — single source of truth for alarm_contact (P2763).
 *
 * WHY: hybrid contact sensors report the same state twice: a Tuya DP1 (0xEF00)
 * and an IAS zoneStatus bitmap (0x0500). Some firmwares send an IAS bitmap with
 * alarm1=false (keep-alive / restore report) while DP1 still says OPEN, or the
 * reverse. Applying both flips alarm_contact back and forth.
 *
 * Rule (deterministic, per device):
 *  - The first source that reports becomes the owner ('dp' or 'ias').
 *  - DP1 outranks IAS: once a DP contact report arrives, DP owns the state
 *    (on Tuya MCU sensors IAS is the leftover/keep-alive path).
 *  - A non-owner report that AGREES with the latched value is accepted (no-op).
 *  - A non-owner report that CONTRADICTS the latched value is ignored + logged.
 *  - If the owner has been silent longer than staleMs, the other source takes
 *    over (never locks a device whose primary path died).
 * Complementary only: no TX, no capability added/removed.
 */

const DEFAULT_STALE_MS = 6 * 60 * 60 * 1000; // 6h
const RANK = { dp: 2, ias: 1 };

function createLatchState(saved) {
  const s = saved && typeof saved === 'object' ? saved : {};
  return {
    owner: s.owner === 'dp' || s.owner === 'ias' ? s.owner : null,
    value: typeof s.value === 'boolean' ? s.value : null,
    lastSeen: { dp: Number(s.lastSeen?.dp) || 0, ias: Number(s.lastSeen?.ias) || 0 },
  };
}

/**
 * Pure decision.
 * @param {object} state from createLatchState (mutated)
 * @param {'dp'|'ias'} source
 * @param {boolean} value final (polarity-applied) contact value
 * @param {{ now?: number, staleMs?: number }} [opts]
 * @returns {{ accept: boolean, reason: string, ownerChanged: boolean }}
 */
function decide(state, source, value, opts = {}) {
  const now = Number(opts.now) || Date.now();
  const staleMs = Number(opts.staleMs) || DEFAULT_STALE_MS;
  const src = source === 'dp' ? 'dp' : 'ias';
  const v = !!value;
  const prevOwner = state.owner;
  state.lastSeen[src] = now;

  let ownerChanged = false;
  if (!state.owner) {
    state.owner = src;
    ownerChanged = true;
  } else if (state.owner !== src) {
    const ownerAge = now - (state.lastSeen[state.owner] || 0);
    if (RANK[src] > RANK[state.owner]) {
      state.owner = src; // DP outranks IAS
      ownerChanged = true;
    } else if (ownerAge > staleMs) {
      state.owner = src; // primary path silent → hand over
      ownerChanged = true;
    }
  }

  if (state.owner === src) {
    state.value = v;
    return { accept: true, reason: ownerChanged ? `owner:${prevOwner || 'none'}->${src}` : 'owner', ownerChanged };
  }
  if (state.value === null || state.value === v) {
    if (state.value === null) state.value = v;
    return { accept: true, reason: 'non_owner_agrees', ownerChanged };
  }
  return { accept: false, reason: `non_owner_contradicts(owner=${state.owner})`, ownerChanged };
}

module.exports = { createLatchState, decide, DEFAULT_STALE_MS };
