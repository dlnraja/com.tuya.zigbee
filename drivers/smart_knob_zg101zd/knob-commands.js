'use strict';

/**
 * Pure decoder + bound clusters for the HOBEIAN ZG-101ZD / Tuya ERS-10TZBVK-AA rotary knob
 * (exact couple _TZ3000_abrsvsou + TS004F).
 *
 * The knob has two firmware modes (genOnOff attribute 0x8004):
 *   - command mode (factory, native ZCL): press = onOff toggle, rotate = levelControl step (step size 13 slow /
 *     37 fast), press+rotate = colorControl stepColorTemp, hold = colorControl moveHue/moveSaturation, release =
 *     stopMoveStep.
 *   - event mode (Tuya): genOnOff cmd 0xFD value 0/1/2 = single/double/hold, cmd 0xFC value 0/1 = right/left.
 * Both are decoded all the time, so the device works whatever mode it is in; switching mode is optional.
 *
 * Hardware facts from Zigbee2MQTT (hobeian.ts ZG-101ZD + lib/tuya.ts multi_action), the ZHA quirk
 * zhaquirks/tuya/ts004f.py (TuyaSmartRemote004FROK) and the deCONZ smart-knob DDF; JohanBendz/com.tuya.zigbee
 * smart_knob_switch already pairs this couple. Our own implementation for Homey.
 */
const { BoundCluster } = require('zigbee-clusters');

const CL = { ON_OFF: 6, LEVEL: 8, COLOR: 768 };

function toBuf(data) {
  if (Buffer.isBuffer(data)) {return data;}
  if (Array.isArray(data)) {return Buffer.from(data);}
  if (data && Array.isArray(data.data)) {return Buffer.from(data.data);}
  return Buffer.alloc(0);
}

function speedOf(stepSize) {
  const s = Number(stepSize) || 0;
  if (s === 0) {return 'normal';}
  if (s <= 20) {return 'slow';}
  if (s >= 30) {return 'fast';}
  return 'normal';
}

/**
 * Decode one received command. Returns { action, mode, stepSize? } or null for frames we ignore.
 * action ∈ press | double_press | hold | release | rotate_left | rotate_right | press_rotate_left | press_rotate_right
 */
function decodeKnobCommand(clusterId, cmdId, data) {
  const b = toBuf(data);
  const cid = Number(clusterId);
  const cmd = Number(cmdId);
  if (cid === CL.ON_OFF) {
    if (cmd === 0 || cmd === 1 || cmd === 2) {return { action: 'press', mode: 'command' };}
    if (cmd === 0xFD) {
      const map = { 0: 'press', 1: 'double_press', 2: 'hold' };
      return map[b[0]] ? { action: map[b[0]], mode: 'event' } : null;
    }
    if (cmd === 0xFC) {
      const map = { 0: 'rotate_right', 1: 'rotate_left' };
      return map[b[0]] ? { action: map[b[0]], mode: 'event', stepSize: 0 } : null;
    }
    return null;
  }
  if (cid === CL.LEVEL) {
    // step / stepWithOnOff: stepMode(u8) stepSize(u8) transitionTime(u16); move / moveWithOnOff: moveMode(u8) rate(u8)
    if (cmd === 2 || cmd === 6 || cmd === 1 || cmd === 5) {
      if (b.length < 1) {return null;}
      const up = b[0] === 0;
      return { action: up ? 'rotate_right' : 'rotate_left', mode: 'command', stepSize: b.length > 1 ? b[1] : 0 };
    }
    return null; // stop / moveToLevel: nothing to report
  }
  if (cid === CL.COLOR) {
    if (cmd === 0x4C) { // stepColorTemp: stepMode(u8: 1 up, 3 down) stepSize(u16) ...
      if (b[0] === 1) {return { action: 'press_rotate_right', mode: 'command', stepSize: b.length >= 3 ? b.readUInt16LE(1) : 0 };}
      if (b[0] === 3) {return { action: 'press_rotate_left', mode: 'command', stepSize: b.length >= 3 ? b.readUInt16LE(1) : 0 };}
      return null;
    }
    if (cmd === 0x01 || cmd === 0x04 || cmd === 0x4B) { // moveHue / moveSaturation / moveColorTemp: moveMode 0 = stop
      return { action: b[0] === 0 ? 'release' : 'hold', mode: 'command' };
    }
    if (cmd === 0x47) {return { action: 'release', mode: 'command' };} // stopMoveStep
    return null;
  }
  return null;
}

/**
 * Bound clusters that hand every received frame to the decoder. handleFrame is overridden on purpose:
 * zigbee-clusters 2.6 does not define the Tuya 0xFC/0xFD commands nor colorControl moveHue/stepColorTemp,
 * so the stock dispatcher would answer them with an error; here every frame is decoded and acknowledged.
 */
function makeBound(onCommand) {
  const handle = (clusterId, frame, meta) => {
    try {
      const cmdId = frame && (frame.cmdId ?? frame.commandId);
      const decoded = decodeKnobCommand(clusterId, cmdId, frame && frame.data);
      onCommand(decoded, { clusterId, cmdId, seq: frame && frame.trxSequenceNumber, meta });
    } catch (_e) { /* never drop or reject a frame */ }
  };
  class OnOff extends BoundCluster { async handleFrame(frame, meta) { handle(CL.ON_OFF, frame, meta); } }
  class Level extends BoundCluster { async handleFrame(frame, meta) { handle(CL.LEVEL, frame, meta); } }
  class Color extends BoundCluster { async handleFrame(frame, meta) { handle(CL.COLOR, frame, meta); } }
  return { OnOff, Level, Color };
}

/** Drops a repeated frame (same cluster + ZCL sequence number within windowMs), as Tuya knobs resend. */
function makeDeduper(windowMs = 1500, now = () => Date.now()) {
  const seen = new Map();
  return (clusterId, seq) => {
    if (seq === undefined || seq === null) {return false;}
    const key = `${clusterId}:${seq}`;
    const t = now();
    const prev = seen.get(key);
    seen.set(key, t);
    if (seen.size > 64) {seen.delete(seen.keys().next().value);}
    return prev !== undefined && t - prev < windowMs;
  };
}

module.exports = { decodeKnobCommand, makeBound, makeDeduper, speedOf, CL };
