'use strict';

/**
 * Publish-hold release (P2830c): a one-shot way to retry a held driver without editing
 * config/publish-hold-drivers.json. Used by workflow_dispatch input `release_held`
 * (env PUBLISH_HOLD_RELEASE = comma/space separated driver ids).
 *
 * Rules: an id that is not currently held is ignored; the committed config is never changed,
 * so the next normal push holds the driver again (a failed retry cannot stick).
 * Bisect plan when a released driver fails with AggregateError: release ONE id per dispatch;
 * "socket hang up" / ETIMEDOUT are transport errors = plain retry, not a bisect.
 */

function parseRelease(value) {
  return new Set(String(value || '').split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean));
}

function effectiveHoldIds(hold, releaseValue) {
  const release = parseRelease(releaseValue);
  const held = (hold && Array.isArray(hold.drivers) ? hold.drivers : []).map((d) => d && d.id).filter(Boolean);
  const ids = new Set(held.filter((id) => !release.has(id)));
  const released = held.filter((id) => release.has(id));
  return { ids, released };
}

module.exports = { parseRelease, effectiveHoldIds };
