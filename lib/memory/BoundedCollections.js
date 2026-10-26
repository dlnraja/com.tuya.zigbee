'use strict';

/**
 * P3068: drop-in bounded collections for long-lived runtime caches (Homey heap ~64 MB).
 *
 * BoundedFifoMap / BoundedFifoSet are real Map / Set subclasses: every read, iteration,
 * Object.fromEntries(), spread and .size behave exactly like a plain Map / Set. The only
 * difference is a hard entry ceiling: inserting a NEW key when `size >= max` first drops the
 * oldest inserted key (FIFO). Updating an existing key never evicts. Below `max` the behaviour
 * is identical to Map / Set, so callers only pick a ceiling well above their normal key count.
 *
 * boundedPush(arr, item, max) is Array#push followed by dropping the oldest items beyond `max`.
 * Pure, no timers, never throws on bad input.
 */
const cap = (max, dflt) => Math.max(1, Math.floor(Number(max) || dflt));

class BoundedFifoMap extends Map {
  constructor(max = 256, entries) {
    super();
    this.max = cap(max, 256);
    this.evictions = 0;
    if (entries) { for (const [k, v] of entries) { this.set(k, v); } }
  }

  set(key, value) {
    if (!super.has(key)) {
      while (this.size >= this.max) { super.delete(super.keys().next().value); this.evictions++; }
    }
    return super.set(key, value);
  }
}

class BoundedFifoSet extends Set {
  constructor(max = 256, values) {
    super();
    this.max = cap(max, 256);
    this.evictions = 0;
    if (values) { for (const v of values) { this.add(v); } }
  }

  add(value) {
    if (!super.has(value)) {
      while (this.size >= this.max) { super.delete(super.values().next().value); this.evictions++; }
    }
    return super.add(value);
  }
}

function boundedPush(arr, item, max = 200) {
  if (!Array.isArray(arr)) { return 0; }
  arr.push(item);
  const m = cap(max, 200);
  if (arr.length > m) { arr.splice(0, arr.length - m); }
  return arr.length;
}

module.exports = { BoundedFifoMap, BoundedFifoSet, boundedPush };
