'use strict';
/**
 * P2933 — Tuya MCU time & housekeeping service (optional overlay, additive).
 * Behaviour summarised in our own words from:
 *  - Koenkk/zigbee-herdsman-converters src/lib/tuya.ts (MIT): mcuSyncTime answer =
 *    payloadSize(2) + UTC(4 BE) + local(4 BE); some firmwares count from 2000-01-01;
 *    mcuGatewayConnectionStatus answered "connected"; mcuVersionRequest/Response.
 *  - zigpy/zha-device-handlers tuya/__init__.py (Apache-2.0): set_time answer, MCU version.
 *  - dresden-elektronik/deconz-rest-plugin tuya.cpp (BSD-3): time request answered with
 *    local time + UTC, periodic push for TRV/LCD clocks.
 *  - ZCL spec 3.12 Time cluster: UTC seconds since 2000, timeStatus, timeZone, DST.
 * Rules: never duplicates an existing answer path (TuyaEF00Manager / _respondToTimeSyncRequest),
 * bounded per-device throttle, native clusters untouched. 0x28 is not documented as a time
 * command in these sources: it is logged as a lead and not answered.
 */
const EPOCH_2000 = 946684800;
const MIN_GAP_MS = 10000;          // per-device throttle for answers
const PERIODIC_MS = 6 * 3600 * 1000; // clocks / TRVs / LCD sensors
const MAX_DQ_PER_HOUR = 4;

/** UTC offset (minutes, DST-aware) of an IANA zone at a given instant. */
function tzOffsetMinutes(timeZone, date = new Date()) {
  if (!timeZone) {return -date.getTimezoneOffset();}
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  } catch (_e) { return -date.getTimezoneOffset(); }
}

/** 4+4 big-endian EF00 time answer with the 2-byte size prefix. */
function buildEf00TimePayload({ now = Date.now(), timeZone = null, epoch = 1970 } = {}) {
  const unix = Math.floor(now / 1000);
  const off = tzOffsetMinutes(timeZone, new Date(now)) * 60;
  const utc = epoch === 2000 ? unix - EPOCH_2000 : unix;
  const local = utc + off;
  const b = Buffer.alloc(10);
  b.writeUInt16BE(8, 0); b.writeUInt32BE(utc >>> 0, 2); b.writeUInt32BE(local >>> 0, 6);
  return { buffer: b, utc, local, offsetSec: off, epoch };
}

/** Decode an incoming 0x24 request: sequence number when present (2 bytes). */
function parseTimeRequest(payload) {
  const buf = payload && (payload.payload || payload.data || payload);
  if (!Buffer.isBuffer(buf)) {return { seq: null, variant: 'empty' };}
  if (buf.length >= 2) {return { seq: buf.readUInt16BE(0), variant: buf.length === 2 ? 'seq' : `len${buf.length}` };}
  return { seq: null, variant: `len${buf.length}` };
}

/** MCU version answer (0x11): seq(2) + version byte (bits MMmmpppp). */
function parseMcuVersion(payload) {
  const buf = payload && (payload.payload || payload.data || payload);
  if (!Buffer.isBuffer(buf) || buf.length < 1) {return null;}
  const v = buf.length >= 3 ? buf[2] : buf[buf.length - 1];
  return { raw: v, version: `${(v >> 6) & 3}.${(v >> 4) & 3}.${v & 15}` };
}

/** "connected" answer for 0x25: size(2)=1 + status 0x01. */
function buildGatewayStatusPayload() { return Buffer.from([0x00, 0x01, 0x01]); }

/** ZCL Time cluster server values (ZCL 3.12.2.2). */
function zclTimeValues({ now = Date.now(), timeZone = null } = {}) {
  const t = Math.floor(now / 1000) - EPOCH_2000;
  const off = tzOffsetMinutes(timeZone, new Date(now)) * 60;
  const jan = tzOffsetMinutes(timeZone, new Date(Date.UTC(new Date(now).getUTCFullYear(), 0, 1))) * 60;
  const jul = tzOffsetMinutes(timeZone, new Date(Date.UTC(new Date(now).getUTCFullYear(), 6, 1))) * 60;
  const std = Math.min(jan, jul);
  return { time: t, timeStatus: 0b0010 /* synchronized */, timeZone: std, dstShift: off - std, standardTime: t + std, localTime: t + off };
}

function needsPeriodicPush(device) {
  try { return require('../zigbee/TimeClusterPolicy').shouldProactiveTimeSync(device) === true; } catch (_e) { return false; }
}

function _hasExistingTimeAnswer(device) {
  return Boolean(device && (device.tuyaEF00Manager || typeof device._respondToTimeSyncRequest === 'function'));
}

function _epochFor(device) {
  try {
    const mfr = (device.getSettings && device.getSettings().zb_manufacturer_name) || (device.getData && device.getData().manufacturerName) || '';
    return require('../TuyaSpecificCluster').needsEpoch2000(mfr) ? 2000 : 1970;
  } catch (_e) { return 1970; }
}

function _tz(device) { try { return device.homey.clock.getTimezone(); } catch (_e) { return null; } }

const WAKE_PUSH_GAP_MS = 30 * 60 * 1000; // opportunistic push on wake, per device
const PENDING_MAX = 20;
const DIAG_MAX = 20;

/** ZCL header → { mfr, cmd, global } (frame control bit 2 = manufacturer specific). */
function zclCmdOf(frame) {
  if (!Buffer.isBuffer(frame) || frame.length < 3) {return null;}
  const fc = frame[0]; const mfr = (fc & 0x04) !== 0; const idx = mfr ? 4 : 2;
  if (frame.length <= idx) {return null;}
  return { cmd: frame[idx], global: (fc & 0x03) === 0, mfr };
}

function _isSleepy(device) {
  try {
    if (typeof device.hasCapability === 'function' && (device.hasCapability('measure_battery') || device.hasCapability('alarm_battery'))) {return true;}
    return require('../zigbee/TimeClusterPolicy').isSleepyRemote(device) === true;
  } catch (_e) { return false; }
}
function _isRemote(device) { try { return require('../zigbee/TimeClusterPolicy').isSleepyRemote(device) === true; } catch (_e) { return false; } }

class TuyaMcuTimeService {
  constructor(device, cluster, opts = {}) {
    this.device = device; this.cluster = cluster; this.opts = opts;
    this.pending = []; this.diag = []; this.lastWakePush = 0;
    this.lastAnswer = 0; this.dqTimes = []; this.leads = []; this.mcuVersion = null;
    this._h = {}; this._timer = null;
  }

  start() {
    const c = this.cluster;
    if (!c || typeof c.on !== 'function') {return this;}
    this._h.time = (p) => { this.onTimeRequest(p).catch(() => {}); };
    this._h.ver = (p) => { this.mcuVersion = parseMcuVersion(p); this._log(`MCU version ${this.mcuVersion ? this.mcuVersion.version : '?'}`); };
    this._h.gw = () => { this.onGatewayStatus().catch(() => {}); };
    this._h.ota = (p) => { this._lead('0x12 mcuOtaNotify', p); this.onWake('mcu_0x12').catch(() => {}); };
    this._h.hb = () => { this.onWake('mcu_heartbeat').catch(() => {}); };
    c.on('timeSync', this._h.time); c.on('mcuVersionResponse', this._h.ver);
    c.on('mcuGatewayConnectionStatus', this._h.gw); c.on('mcuOtaNotify', this._h.ota);
    c.on('mcuVersionRequest', this._h.hb); // MCU-initiated 0x10 acts as a heartbeat on some firmwares
    if (needsPeriodicPush(this.device)) {
      const setI = this.device.homey && this.device.homey.setInterval ? this.device.homey.setInterval.bind(this.device.homey) : setInterval;
      this._timer = setI(() => { this.push('periodic').catch(() => {}); }, this.opts.periodicMs || PERIODIC_MS);
    }
    return this;
  }

  _log(m) { try { this.device.log(`[MCU-TIME] ${m}`); } catch (_e) { /* noop */ } }
  _lead(kind, p) {
    if (this.leads.length < 10) {this.leads.push({ kind, at: Date.now() });}
    this._log(`lead ${kind} ${p && Buffer.isBuffer(p.payload) ? p.payload.toString('hex') : ''}`);
  }

  _diag(kind, detail) {
    this.diag.push({ at: new Date().toISOString(), kind, detail: detail || null });
    if (this.diag.length > DIAG_MAX) {this.diag.shift();}
    try { if (this.device.setStoreValue) {this.device.setStoreValue('tuya_time_sync_diag', this.diag).catch?.(() => {});} } catch (_e) { /* soft */ }
  }

  /** Queue a write/sync for a sleepy device; flushed on the next wake sign. Bounded. */
  enqueue(label, fn) {
    if (typeof fn !== 'function') {return false;}
    const i = this.pending.findIndex((x) => x.label === label);
    if (i >= 0) {this.pending.splice(i, 1);} // latest wins per label
    if (this.pending.length >= PENDING_MAX) {this.pending.shift();}
    this.pending.push({ label, fn, at: Date.now() });
    return true;
  }

  async flush() {
    const items = this.pending.splice(0);
    let ok = 0;
    for (const it of items) {
      try { await it.fn(); ok++; } catch (_e) { if (this.pending.length < PENDING_MAX) {this.pending.push(it);} }
    }
    if (items.length) {this._diag('flush', `${ok}/${items.length}`);}
    return { flushed: ok, kept: this.pending.length };
  }

  /**
   * Any wake sign (frame from a sleepy node, pollControl check-in, MCU heartbeat, announce):
   * flush the queue first, then an opportunistic time+date push (30 min per device).
   * Pure remotes (no clock) only flush.
   */
  async onWake(sign) {
    const res = { sign, flush: await this.flush(), time: null };
    if (_isRemote(this.device)) {return res;}
    if (Date.now() - this.lastWakePush < (this.opts.wakeGapMs || WAKE_PUSH_GAP_MS)) {res.time = { skipped: 'wake_throttled' }; return res;}
    this.lastWakePush = Date.now();
    res.time = await this.push(`wake:${sign}`, null, { allowWithExisting: true }).catch(() => ({ skipped: 'error' }));
    return res;
  }

  /** Inspect any incoming raw frame for time requests / wake signs. */
  async onFrame(clusterId, frame) {
    const h = zclCmdOf(frame);
    if (clusterId === 0xEF00 && h && !h.global) {
      if (h.cmd === 0x24) {return { request: await this.onTimeRequest({ raw: true }) };}
      if (h.cmd === 0x28) {this._lead('EF00 0x28 (undocumented time-like command)'); this._diag('lead', 'ef00_0x28');}
    }
    if ((clusterId === 0xE000 || clusterId === 0xE001) && h && !h.global) {this._lead(`0x${clusterId.toString(16)} cmd 0x${h.cmd.toString(16)}`);}
    if (clusterId === 0x0020 && h && !h.global && h.cmd === 0x00) {return { wake: await this.onWake('checkin') };}
    if (_isSleepy(this.device)) {return { wake: await this.onWake(`frame:0x${Number(clusterId).toString(16)}`) };}
    return null;
  }

  _throttled() { return Date.now() - this.lastAnswer < (this.opts.minGapMs || MIN_GAP_MS); }

  async onTimeRequest(p) {
    if (_hasExistingTimeAnswer(this.device)) {return { skipped: 'existing_path' };}
    return this.push('request', p);
  }

  async push(reason, _p, o = {}) {
    if (this.device._destroyed) {return { skipped: 'destroyed' };}
    try { if (!require('./TimeSyncPolicy').timeSyncAllowed(this.device)) {return { skipped: 'disabled' };} } catch (_e) { /* allowed */ }
    if (this._throttled()) {return { skipped: 'throttled' };}
    if (reason !== 'request' && !o.allowWithExisting && _hasExistingTimeAnswer(this.device)) {return { skipped: 'existing_path' };}
    const t = buildEf00TimePayload({ timeZone: _tz(this.device), epoch: _epochFor(this.device) });
    this.lastAnswer = Date.now();
    if (typeof this.cluster.timeSync !== 'function') {return { skipped: 'no_cmd' };}
    await this.cluster.timeSync({ payload: t.buffer }, { waitForResponse: false, disableDefaultResponse: true });
    this._log(`time ${reason}: utc=${t.utc} local=${t.local} (epoch ${t.epoch}, offset ${t.offsetSec}s)`);
    this._diag('time', `${reason} utc=${t.utc} local=${t.local} off=${t.offsetSec}`);
    return { sent: true, ...t };
  }

  async onGatewayStatus() {
    if (typeof this.cluster.mcuGatewayConnectionStatus !== 'function') {return { skipped: 'no_cmd' };}
    await this.cluster.mcuGatewayConnectionStatus({ payload: buildGatewayStatusPayload() }, { waitForResponse: false, disableDefaultResponse: true });
    this._log('0x25 answered connected');
    return { sent: true };
  }

  async requestMcuVersion() {
    if (this.mcuVersion || typeof this.cluster.mcuVersionRequest !== 'function') {return { skipped: true };}
    await this.cluster.mcuVersionRequest({ payload: Buffer.from([0x00, 0x00]) }, { waitForResponse: false });
    return { sent: true };
  }

  /** After a re-join / wake: re-query DPs (0x03, bounded per hour) and push time. */
  async onRejoin() {
    const now = Date.now();
    this.dqTimes = this.dqTimes.filter((x) => now - x < 3600000);
    let dq = false;
    if (this.dqTimes.length < MAX_DQ_PER_HOUR && typeof this.cluster.dataQuery === 'function') {
      this.dqTimes.push(now);
      try { await this.cluster.dataQuery({}, { waitForResponse: false }); dq = true; } catch (_e) { /* sleepy */ }
    }
    const flush = await this.flush();
    const t = await this.push('rejoin', null, { allowWithExisting: true }).catch(() => ({ skipped: 'error' }));
    this._diag('rejoin', `dq=${dq}`);
    return { dataQuery: dq, time: t, flush };
  }

  stop() {
    const c = this.cluster;
    if (c && c.removeListener) {
      if (this._h.time) {c.removeListener('timeSync', this._h.time);}
      if (this._h.ver) {c.removeListener('mcuVersionResponse', this._h.ver);}
      if (this._h.gw) {c.removeListener('mcuGatewayConnectionStatus', this._h.gw);}
      if (this._h.ota) {c.removeListener('mcuOtaNotify', this._h.ota);}
      if (this._h.hb) {c.removeListener('mcuVersionRequest', this._h.hb);}
    }
    if (this._timer) {
      const clr = this.device.homey && this.device.homey.clearInterval ? this.device.homey.clearInterval.bind(this.device.homey) : clearInterval;
      try { clr(this._timer); } catch (_e) { /* noop */ }
      this._timer = null;
    }
  }
}

module.exports = { TuyaMcuTimeService, zclCmdOf, tzOffsetMinutes, buildEf00TimePayload, parseTimeRequest, parseMcuVersion, buildGatewayStatusPayload, zclTimeValues, EPOCH_2000 };
