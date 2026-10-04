'use strict';

/**
 * Local backports from newer Athom libraries, kept here because the app stays on
 * zigbee-clusters 2.6.0 / homey-zigbeedriver 2.2.17: the newer releases require Node >= 22,
 * which Homey only ships from firmware v12.9.0, while the app supports >= 12.2.0.
 * Own implementation of the behaviour described upstream (credit: Athom, see CREDITS.md):
 *
 * 1. Time cluster (0x000A) attributes, ZCL spec section 3.12.2.2 (zigbee-clusters #216/#217,
 *    3.x: validUntilTime gets its own id 9). 2.6.0 declares no attribute at all, so
 *    `writeAttributes({ time })` and reads by name could never work.
 * 2. Transition durations (homey-zigbeedriver 2.2.18): a duration that is NaN or Infinity is
 *    ignored instead of turning into 0 or a two-hour fade.
 * 3. Dim read-back race (homey-zigbeedriver 2.2.18): after `onoff` true the driver reads
 *    currentLevel one second later; when a `dim` command came within 500 ms of that on/off
 *    command (either order), the explicit dim level wins and the read-back is dropped.
 *
 * Each patch is applied once per process and only while the installed library is older than
 * the release that contains the fix.
 */

const DIM_READBACK_DELAY_MS = 1000;
const DIM_COMMAND_GRACE_MS = 500;
const MAX_DIM = 254;
const ZIGBEE_EPOCH_OFFSET_S = 946684800; // 2000-01-01T00:00:00Z

const state = { applied: false, time: false, durations: false, lightDevice: false };

function versionAtLeast(version, min) {
  const a = String(version || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const b = min.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== b[i]) { return (a[i] || 0) > b[i]; }
  }
  return true;
}

function pkgVersion(name) {
  try { return require(`${name}/package.json`).version; } catch (_) { return null; }
}

/** Duration in ms that the transition helpers may use, or undefined (device default). */
function finiteDuration(opts) {
  return opts && Number.isFinite(opts.duration) ? opts.duration : undefined;
}

function withFiniteDuration(opts) {
  if (!opts || typeof opts !== 'object' || !('duration' in opts) || Number.isFinite(opts.duration)) { return opts; }
  const copy = { ...opts };
  delete copy.duration;
  return copy;
}

/** ZCL UTC time: seconds since 2000-01-01 UTC. */
function zigbeeUtcNow(nowMs = Date.now()) {
  return Math.floor(nowMs / 1000) - ZIGBEE_EPOCH_OFFSET_S;
}

function applyTimeCluster() {
  const zc = require('zigbee-clusters');
  const { Cluster, ZCLDataTypes } = zc;
  const TimeBase = typeof zc.TimeCluster === 'function' ? zc.TimeCluster : Cluster.getCluster(0x000A);
  if (typeof TimeBase !== 'function') { return false; }
  if (TimeBase.ATTRIBUTES && TimeBase.ATTRIBUTES.validUntilTime) { return false; }
  const { DataType } = require('@athombv/data-types');
  // ZCL type 0xE2 "UTCTime": 32-bit unsigned little-endian, missing from data-types 1.1.x.
  const UTC = ZCLDataTypes.UTC || new DataType(0xE2, 'UTC', 4,
    function toBuf(buf, v, i) { return buf.writeUIntLE(v, i, this.length) - i; },
    function fromBuf(buf, i) { return buf.length - i < this.length ? 0 : buf.readUIntLE(i, this.length); });
  const ATTRIBUTES = {
    time: { id: 0x0000, type: UTC },
    timeStatus: { id: 0x0001, type: ZCLDataTypes.map8('master', 'synchronized', 'masterZoneDst', 'superseding') },
    timeZone: { id: 0x0002, type: ZCLDataTypes.int32 },
    dstStart: { id: 0x0003, type: ZCLDataTypes.uint32 },
    dstEnd: { id: 0x0004, type: ZCLDataTypes.uint32 },
    dstShift: { id: 0x0005, type: ZCLDataTypes.int32 },
    standardTime: { id: 0x0006, type: ZCLDataTypes.uint32 },
    localTime: { id: 0x0007, type: ZCLDataTypes.uint32 },
    lastSetTime: { id: 0x0008, type: UTC },
    validUntilTime: { id: 0x0009, type: UTC },
  };
  class TimeClusterWithAttributes extends TimeBase {
    static get ATTRIBUTES() { return { ...super.ATTRIBUTES || {}, ...ATTRIBUTES }; }
  }
  Cluster.addCluster(TimeClusterWithAttributes);
  return true;
}

function applyDurationGuards(util) {
  for (const fn of ['calculateLevelControlTransitionTime', 'calculateColorControlTransitionTime']) {
    const orig = util[fn];
    if (typeof orig !== 'function' || orig.__finiteDuration) { continue; }
    const guarded = function guardedTransitionTime(opts = {}) { return orig.call(this, withFiniteDuration(opts)); };
    guarded.__finiteDuration = true;
    util[fn] = guarded;
  }
}

/**
 * Turn on/off, then (on) read currentLevel back after a delay unless a dim command that belongs
 * to the same user action arrived. `ctx` is the device; `levelCluster` reads currentLevel.
 */
function onOffWithDimReadback(ctx, onoff, sendOnOff, levelCluster, wait) {
  const onOffAt = Date.now();
  const dimWins = () => (ctx._dimCommandAt || 0) > onOffAt - DIM_COMMAND_GRACE_MS;
  return sendOnOff().then((result) => {
    if (onoff === false) {
      Promise.resolve(ctx.setCapabilityValue('dim', 0)).catch((e) => ctx.error && ctx.error(e));
    } else if (onoff) {
      wait(DIM_READBACK_DELAY_MS)
        .then(async () => {
          if (dimWins()) { return; }
          const cluster = typeof levelCluster === 'function' ? levelCluster() : levelCluster;
          const { currentLevel } = await cluster.readAttributes(['currentLevel']);
          if (dimWins()) { return; }
          await Promise.resolve(ctx.setCapabilityValue('dim', Math.max(0.01, currentLevel / MAX_DIM)))
            .catch((e) => ctx.error && ctx.error(e));
        })
        .catch((err) => ctx.error && ctx.error('could not update dim after onoff change', err));
    }
    return result;
  });
}

function applyLightDevice(ZigBeeLightDevice, wait) {
  const proto = ZigBeeLightDevice && ZigBeeLightDevice.prototype;
  if (!proto || proto.__zlbLight || typeof wait !== 'function') { return false; }
  const origDim = proto.changeDimLevel;
  proto.changeDimLevel = function changeDimLevel(dim, opts = {}) {
    this._dimCommandAt = Date.now();
    return origDim.call(this, dim, withFiniteDuration(opts));
  };
  for (const m of ['changeColor', 'changeColorTemperature']) {
    const orig = proto[m];
    if (typeof orig !== 'function') { continue; }
    proto[m] = function guardedColour(value, opts = {}) { return orig.call(this, value, withFiniteDuration(opts)); };
  }
  proto.changeOnOff = function changeOnOff(onoff) {
    if (typeof this.log === 'function') { this.log('changeOnOff() →', onoff); }
    return onOffWithDimReadback(this, onoff, () => this.onOffCluster[onoff ? 'setOn' : 'setOff'](),
      () => this.levelControlCluster, wait);
  };
  proto.__zlbLight = true;
  return true;
}

function apply() {
  if (state.applied) { return state; }
  state.applied = true;
  try {
    if (!versionAtLeast(pkgVersion('zigbee-clusters'), '3.0.0')) { state.time = applyTimeCluster(); }
  } catch (_) { /* never block app start */ }
  try {
    if (!versionAtLeast(pkgVersion('homey-zigbeedriver'), '2.2.18')) {
      const zd = require('homey-zigbeedriver');
      if (zd.Util) { applyDurationGuards(zd.Util); }
      state.durations = true;
      // The library's own wait helper (same timer the original changeOnOff used).
      state.lightDevice = applyLightDevice(zd.ZigBeeLightDevice, zd.Util && zd.Util.wait);
    }
  } catch (_) { /* never block app start */ }
  return state;
}

module.exports = {
  apply,
  finiteDuration,
  withFiniteDuration,
  onOffWithDimReadback,
  zigbeeUtcNow,
  versionAtLeast,
  DIM_COMMAND_GRACE_MS,
  DIM_READBACK_DELAY_MS,
};
