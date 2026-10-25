'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');


const { Cluster, BoundCluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/tuya/TuyaSpecificCluster');
const TuyaOnOffCluster = require('../../lib/clusters/TuyaOnOffCluster');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_FINGER_BOT_DATA_POINTS } = require('../../lib/tuya/TuyaDataPointsJohan');
const { buildDpCommandArgs } = require('../../lib/tuya/TuyaDpCommandArgs');
const { getManufacturerName, getModelId } = require('../../lib/helpers/ManufacturerNameHelper');

Cluster.addCluster(TuyaSpecificCluster);
Cluster.addCluster(TuyaOnOffCluster);

const MODE = {
  click: 0,
  switch: 1,
  program: 2,
};

const DEFAULT_MODE = 'click';
const LOCAL_PRESS_SUPPRESS_MS = 2000;
const LOCAL_REPORT_IGNORE_MS = 3500;
const LOCAL_UI_RESET_DELAY_MS = 100;
const REMOTE_PRESS_DEBOUNCE_MS = 800;
const MOMENTARY_GUI_PULSE_MS = 700;
const BATTERY_LOW_THRESHOLD = 20;
const ZIGBEE_EPOCH_MS = Date.UTC(2000, 0, 1, 0, 0, 0);

// P3050 (PR #577 by iassael + Z2M TS0001_fingerbot): exact TS0001 couples whose MCU only
// accepts DP writes as cmd 0x04 (sendData). Source: zigbee-herdsman-converters
// src/devices/tuya.ts, model TS0001_fingerbot, meta.tuyaSendCommand = 'sendData'.
const SENDDATA_TS0001_COUPLES = new Set([
  '_tz3210_dse8ogfy', '_tz3210_j4pdtz9v', '_tz3210_7vgttna6', '_tz3210_a04acm9s', '_tz3210_cm9mbpr1',
]);
// Same source: lower 50-100 %, upper 0-50 %, sustain 0-10 s, touch is a bool DP (107).
const SENDDATA_LIMITS = { lower: [50, 100], upper: [0, 50], delay: [0, 10] };
const DIRECT_SEND_TIMEOUT_MS = 12000;  // hang guard above zigbee-clusters' own 10 s response timeout
const FALLBACK_SEND_TIMEOUT_MS = 12000; // whole inherited cascade, capped
const SETTINGS_REPLAY_DELAY_MS = 30000;
const SETTINGS_CONFIRMED_KEY = 'fingerbot_settings_confirmed';
const SETTINGS_DPS = [102, 103, 104, 106, 107];

// Errors raised before any byte left Homey: safe to retry through the inherited path.
function isPreSendError(err) {
  if (!err) {return false;}
  if (err.code === 'P3050_PRESEND') {return true;}
  return /unexpected property|is not a function|Cannot read propert/i.test(String(err.message || ''));
}

function withTimeout(promise, ms, homey) {
  let timer;
  const t = new Promise((_, reject) => {
    const set = homey && typeof homey.setTimeout === 'function' ? homey.setTimeout.bind(homey) : setTimeout;
    timer = set(() => reject(Object.assign(new Error(`timeout after ${ms} ms`), { code: 'P3050_TIMEOUT' })), ms);
  });
  return Promise.race([promise, t]).finally(() => {
    try { (homey && typeof homey.clearTimeout === 'function' ? homey.clearTimeout.bind(homey) : clearTimeout)(timer); } catch (_e) { /* noop */ }
  });
}

const ZCL_STATUS_SUCCESS = 0x00;
const ZCL_STATUS_UNSUPPORTED_ATTRIBUTE = 0x01;
const ZCL_TYPE_UTC_TIME = 0xE2;
const ZCL_TYPE_BITMAP8 = 0x18;
const ZCL_TYPE_INT32 = 0x2B;

/**
 * Bound Time cluster responder.
 * The device binds cluster 10 (time) and periodically reads attribute 0x0007 (localTime).
 * We return a raw readAttributes response buffer to avoid the built-in parser issues.
 */
class FingerBotTimeBoundCluster extends BoundCluster {

  async readAttributes({ attributes }) {
    const chunks = [];

    for (const attributeId of attributes) {
      switch (attributeId) {
      case 0x0007: { // localTime
        const localTime =
            Math.floor((Date.now() - ZIGBEE_EPOCH_MS) / 1000) +
(-new Date().getTimezoneOffset() * 60);

        const buf = Buffer.alloc(8);
        buf.writeUInt16LE(0x0007, 0);
        buf.writeUInt8(ZCL_STATUS_SUCCESS, 2);
        buf.writeUInt8(ZCL_TYPE_UTC_TIME, 3);
        buf.writeUInt32LE(localTime >>> 0, 4);
        chunks.push(buf);
        break;
      }

      case 0x0000: { // time
        const utcTime = Math.floor((Date.now() - ZIGBEE_EPOCH_MS) / 1000);

        const buf = Buffer.alloc(8);
        buf.writeUInt16LE(0x0000, 0);
        buf.writeUInt8(ZCL_STATUS_SUCCESS, 2);
        buf.writeUInt8(ZCL_TYPE_UTC_TIME, 3);
        buf.writeUInt32LE(utcTime >>> 0, 4);
        chunks.push(buf);
        break;
      }

      case 0x0001: { // timeStatus
        const buf = Buffer.alloc(5);
        buf.writeUInt16LE(0x0001, 0);
        buf.writeUInt8(ZCL_STATUS_SUCCESS, 2);
        buf.writeUInt8(ZCL_TYPE_BITMAP8, 3);
        buf.writeUInt8(0x02, 4); // synchronized
        chunks.push(buf);
        break;
      }

      case 0x0002: { // timeZone
        const timeZone =-new Date().getTimezoneOffset() * 60;

        const buf = Buffer.alloc(8);
        buf.writeUInt16LE(0x0002, 0);
        buf.writeUInt8(ZCL_STATUS_SUCCESS, 2);
        buf.writeUInt8(ZCL_TYPE_INT32, 3);
        safeMultiply(buf.writeInt32LE(timeZone, 4));
        chunks.push(buf);
        break;
      }

      default: {
        const buf = Buffer.alloc(3);
        buf.writeUInt16LE(attributeId, 0);
        buf.writeUInt8(ZCL_STATUS_UNSUPPORTED_ATTRIBUTE, 2);
        chunks.push(buf);
        break;
      }
      }
    }

    return {
      attributes: Buffer.concat(chunks),
    };
  }
}

class FingerBot extends TuyaSpecificClusterDevice {

  getTuyaCommandName(_dp) {
    const mfr = String(
      (typeof this.getManufacturerName === 'function' ? this.getManufacturerName() : '')
      || this.getSetting?.('zb_manufacturer_name')
      || this.getData?.()?.manufacturerName
      || ''
    ).toLowerCase();

    // Fingerbot variants requiring cmd 0x04 (sendData) instead of cmd 0x00 (datapoint)
    if (mfr.includes('j4pdtz9v') || mfr.includes('7vgttna6') || mfr.includes('a04acm9s') || mfr.includes('dse8ogfy') || mfr.includes('cm9mbpr1')) {
      return 'sendData';
    }
    return 'datapoint';
  }

  /**
   * P3050: exact couple check (mfr + productId), not mfr alone.
   */
  _isSendDataCouple() {
    const mfr = String(getManufacturerName(this) || '').trim().toLowerCase();
    const pid = String(getModelId(this) || '').trim().toUpperCase();
    return SENDDATA_TS0001_COUPLES.has(mfr) && (pid === 'TS0001' || pid === 'TS0001_FINGERBOT' || pid === '');
  }

  /**
   * P3050, from iassael's PR #577 (aa6b56c, earlier 0739b32 + 274111e, tested on Homey Pro fw 13.5.0 with
   * _TZ3210_j4pdtz9v). For the exact sendData couples, write the DP as ONE cmd 0x04 frame
   * straight to the cluster, with args that follow the live schema, the same call he tested.
   * The inherited cascade sends 0x00 frames that this firmware ignores, and waits out
   * timeouts on a sleepy end device. If the frame may have left (any send or response error,
   * or the hang guard), we never re-send it, because that would press twice. We fall back to
   * the inherited path, capped in time, only when nothing could be sent at all (no cluster,
   * args refused). Every other manufacturer keeps the inherited path unchanged.
   */
  async _sendTuyaDatapoint(dp, datatype, length, data, ...rest) {
    if (!this._isSendDataCouple()) {
      return super._sendTuyaDatapoint(dp, datatype, length, data, ...rest);
    }
    this._lastUserTxAt = Date.now();
    try {
      await withTimeout(this._sendDataDirect(dp, datatype, data), DIRECT_SEND_TIMEOUT_MS, this.homey);
      return true;
    } catch (err) {
      if (!isPreSendError(err)) {throw err;}
      this.log(`[P3050] direct sendData DP${dp} failed (${err && err.message}), bounded fallback`);
    }
    return withTimeout(super._sendTuyaDatapoint(dp, datatype, length, data, 1, 200), FALLBACK_SEND_TIMEOUT_MS, this.homey);
  }

  async _sendDataDirect(dp, datatype, data) {
    const ep = this.zclNode?.endpoints?.[1];
    const cluster = ep?.clusters?.tuya || ep?.clusters?.manuSpecificTuya;
    if (!cluster || typeof cluster.sendData !== 'function') {
      throw Object.assign(new Error('no tuya.sendData on ep1'), { code: 'P3050_PRESEND' });
    }
    const seq = this.transactionID;
    this.transactionID = seq + 1;
    const args = buildDpCommandArgs(cluster, 'sendData', { dp, datatype, data, transid: seq });
    return cluster.sendData(args);
  }

  /** Z2M ranges for the sendData couples; other couples are written as configured. */
  _clampForCouple(kind, value) {
    if (typeof value !== 'number' || !this._isSendDataCouple() || !SENDDATA_LIMITS[kind]) {return value;}
    const [min, max] = SENDDATA_LIMITS[kind];
    return Math.min(max, Math.max(min, Math.round(value)));
  }

  /** Touch (DP107) is a bool on the Z2M couples; keep the historical enum write for the others. */
  async _writeTouch(on) {
    if (this._isSendDataCouple()) {return this.writeBool(V1_FINGER_BOT_DATA_POINTS.touch, !!on);}
    return this.writeEnum(V1_FINGER_BOT_DATA_POINTS.touch, on ? 1 : 0);
  }

  /**
   * P3050: settings replay, deferred and non-blocking. Runs once per init, only while the device
   * never confirmed its settings, after the first frame from the device (it is awake then) or a
   * delay, and yields to any user command sent meanwhile.
   */
  _scheduleSettingsReplay() {
    if (this._settingsReplayTimer || this._settingsReplayDone) {return;}
    if (this.getStoreValue?.(SETTINGS_CONFIRMED_KEY) === true) {
      this._settingsReplayDone = true;
      return;
    }
    const scheduledAt = Date.now();
    const run = () => {
      this._settingsReplayTimer = null;
      if (this._destroyed || this._settingsReplayDone) {return;}
      if ((this._lastUserTxAt || 0) > scheduledAt) {
        this.log('[P3050] settings replay skipped: a user command went first');
        this._settingsReplayDone = true;
        return;
      }
      this._settingsReplayDone = true;
      this.applyConfiguredSettings({ includeMode: true })
        .catch(err => this.log('[P3050] deferred settings replay failed:', err && err.message));
    };
    this._settingsReplayRun = run;
    this._settingsReplayTimer = this.homey.setTimeout(run, SETTINGS_REPLAY_DELAY_MS);
  }

  _onDeviceFrame(dp) {
    if (SETTINGS_DPS.includes(dp)) {
      this._settingsSeen = this._settingsSeen || new Set();
      this._settingsSeen.add(dp);
      if (this._settingsSeen.size >= 2 && this.getStoreValue?.(SETTINGS_CONFIRMED_KEY) !== true) {
        this.setStoreValue?.(SETTINGS_CONFIRMED_KEY, true)?.catch?.(() => {});
      }
    }
    // Device just talked: it is awake, run a pending replay now instead of waiting.
    if (this._settingsReplayTimer && typeof this._settingsReplayRun === 'function') {
      try { this.homey.clearTimeout(this._settingsReplayTimer); } catch (_e) { /* noop */ }
      this._settingsReplayRun();
    }
  }

  /** genPowerCfg reporting: optional, fire-and-forget, only if the cluster is really on ep1. */
  _configureBatteryReportingOptional(zclNode) {
    const ep = zclNode?.endpoints?.[1];
    if (!ep?.clusters?.powerConfiguration) {
      this.log('[P3050] no genPowerCfg on ep1, battery comes from DP105');
      return;
    }
    Promise.resolve()
      .then(() => this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        },
      ]))
      .catch(err => this.log('Attribute reporting config failed:', err && err.message));
  }

  async onNodeInit({ zclNode }) {
    this.log('Initializing FingerBot device...');
    
    // v7.2.4: CRITICAL  Register listeners BEFORE super.onNodeInit()
    // This ensures capability listeners are active even if initialization timeouts
    this._suppressUntil = 0;
    this._ignoreOnOffReportsUntil = 0;
    this._lastBatteryLowState = false;
    this._lastRemotePressAt = 0;
    this._guiPulseTimeout = null;
    this._timeBoundCluster = null;

    // this._registerOnOffHandling(zclNode); // Moved below after super.onNodeInit
    this._registerTuyaListeners(zclNode);
    this._registerTimeBoundCluster(zclNode);

    try {
      // P3050: battery reporting stays, but optional and never awaited (PR #577 noted that
      // _TZ3210_j4pdtz9v has no genPowerCfg and reports battery as DP105).
      this._configureBatteryReportingOptional(zclNode);

      await super.onNodeInit({ zclNode });

      this._registerOnOffHandling(zclNode);

      this.printNode();

      await zclNode.endpoints[1].clusters.basic.readAttributes([
        'manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus',
      ]).catch(err => this.error('Error reading attributes:', err));

      // P3050: settings replay deferred + non-blocking (was awaited here and held user commands).
      this._scheduleSettingsReplay();

    } catch (err) {
      this.error('FingerBot initialization error:', err.message);
    }

    this.log('FingerBot initialization complete.');
  }

  /**
   * P3050: the turn on/off/toggle Flow cards called device.sendTuyaDP(), which this class does not
   * have (found with the Push-card check from iassael's PR #577, aa6b56c). These TS0001 bots switch through
   * the ZCL onOff cluster, so the cards now take the same path as the onoff capability (mode-aware).
   */
  async flowSetOnOff(value) {
    if (typeof this.triggerCapabilityListener === 'function' && this.hasCapability('onoff')) {
      return this.triggerCapabilityListener('onoff', !!value);
    }
    const onOff = this.zclNode?.endpoints?.[1]?.clusters?.onOff;
    if (!onOff) {throw new Error('onOff cluster not available');}
    return value ? onOff.setOn() : onOff.setOff();
  }

  _registerOnOffHandling(zclNode) {
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async value => {
        this.log('FingerBot onoff triggered:', value);

        const mode = this._getConfiguredMode();

        if (mode === 'click') {
          // In click mode only "true" should trigger a physical press.
          // "false" is only the GUI reset and must not send a command.
          if (value !== true) {return;}
          await this.triggerFingerBotPress();
          return;
        }

        // In switch/program mode, pass through both states.
        try {
          if (value) {
            await zclNode.endpoints[1].clusters.onOff.setOn();
          } else {
            await zclNode.endpoints[1].clusters.onOff.setOff();
          }
        } catch (err) {
          this.error(`Failed to set FingerBot onoff (${value})`, err);
          throw err;
        }
      });
    }

    if (this.hasCapability('button.push')) {
      this.registerCapabilityListener('button.push', async () => {
        this.log('FingerBot button.push triggered');
        await this.triggerFingerBotPress();
      });
    }

    if (zclNode?.endpoints?.[1]?.clusters?.onOff) {
      zclNode.endpoints[1].clusters.onOff.on('attr.onOff', value => {
        const now = Date.now();
        const mode = this._getConfiguredMode();

        if (mode === 'click') {
          // Ignore echo reports from our own local press.
          if (now < this._ignoreOnOffReportsUntil) {
            this.log('Ignoring onOff attr report during local press window:', value);
            return;
          }

          // In click mode, treat both true and false from the physical device
          // as a momentary button press, not as persistent state.
          if (now - this._lastRemotePressAt < REMOTE_PRESS_DEBOUNCE_MS) {
            this.log('Ignoring duplicated remote press report:', value);
            return;
          }

          this._lastRemotePressAt = now;
          this.log('Remote FingerBot press detected from onOff attr report:', value);

          this._pulseMomentaryGui();
          this._triggerFlowCard('fingerbot_button_pressed');
          return;
        }

        // In switch/program mode, use real persistent state.
        this.log('onOff attr report:', value);
        this._setCapabilitySafe('onoff', value, 'Failed to update onoff from onOff cluster');
      });
    }

    if (this.hasCapability('finger_bot_mode')) {
      this.registerCapabilityListener('finger_bot_mode', async value => {
        this.log(`FingerBot mode change requested: ${value}`);
        // Mode: 0=click, 1=switch, 2=program
        const modeEnum = MODE[value] !== undefined ? MODE[value] : 0;
        
        // Write to BOTH standard DP101 and alternative DP8 to cover all variants
        try {
          if (this.zclNode && this.zclNode.endpoints[1]) {
            await this.writeEnum(V1_FINGER_BOT_DATA_POINTS.mode || 101, modeEnum).catch(() => {});
            await this.writeEnum(8, modeEnum).catch(() => {}); // Fallback for alternative devices
          }
        } catch (e) {
          this.log('Could not write mode DP:', e.message);
        }
      });
    }
  }

  _registerTuyaListeners(zclNode) {
    const tuyaCluster = zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (!tuyaCluster) {
      this.error('FingerBot: Tuya cluster not available on endpoint 1');
      return;
    }

    if (this._tuyaListenersAttached) {return;}

    tuyaCluster.on('reporting', async data => {
      try {
        await this.processDatapoint(data);
      } catch (err) {
        this.error('Error processing Tuya reporting frame:', err);
      }
    });

    tuyaCluster.on('response', async data => {
      try {
        await this.processDatapoint(data);
      } catch (err) {
        this.error('Error processing Tuya response frame:', err);
      }
    });

    tuyaCluster.on('dataReport', async data => {
      try {
        await this.processDatapoint(data);
      } catch (err) {
        this.error('Error processing Tuya dataReport frame:', err);
      }
    });

    tuyaCluster.on('reportingConfiguration', async data => {
      try {
        await this.processDatapoint(data);
      } catch (err) {
        this.error('Error processing Tuya reportingConfiguration frame:', err);
      }
    });

    tuyaCluster.on('statusReport', async data => {
      try {
        await this.processDatapoint(data);
      } catch (err) {
        this.error('Error processing Tuya statusReport frame:', err);
      }
    });

    tuyaCluster.on('reporting_0x05', async data => {
      try {
        await this.processDatapoint(data);
      } catch (err) {
        this.error('Error processing Tuya reporting_0x05 frame:', err);
      }
    });

    this._tuyaListenersAttached = true;
  }

  _registerTimeBoundCluster(zclNode) {
    try {
      if (typeof zclNode?.endpoints?.[1]?.bind === 'function') {
        this._timeBoundCluster = new FingerBotTimeBoundCluster();
        zclNode.endpoints[1].bind('time', this._timeBoundCluster);
      }
    } catch (err) {
      this.error('Failed to register Time bound cluster', err);
    }
  }

  async triggerFingerBotPress() {
    if (Date.now() < this._suppressUntil) {
      this.log('FingerBot press suppressed');
      return;
    }

    this._suppressUntil = Date.now() + LOCAL_PRESS_SUPPRESS_MS;
    this._ignoreOnOffReportsUntil = Date.now() + LOCAL_REPORT_IGNORE_MS;

    try {
      // For app-triggered presses we ensure click mode.
      if (this._getConfiguredMode() !== 'click') {
        await this.writeEnum(V1_FINGER_BOT_DATA_POINTS.mode, MODE.click);
      }

      await this.zclNode.endpoints[1].clusters.onOff.setOn();

      this._triggerFlowCard('fingerbot_button_pressed');

      // Reset GUI shortly after success.
      this.homey.setTimeout(() => {
        if (this._destroyed) {return;}
        this._setCapabilitySafe(
          'onoff',
          false,
          'Failed to reset onoff after successful press',
        );
      }, LOCAL_UI_RESET_DELAY_MS);
    } catch (err) {
      this.error('Failed to trigger FingerBot press', err);
      throw err;
    }
  }

  _pulseMomentaryGui() {
    this._setCapabilitySafe('onoff', true, 'Failed to set momentary GUI state');

    if (this._guiPulseTimeout) {
      this.homey.clearTimeout(this._guiPulseTimeout);
    }

    this._guiPulseTimeout = this.homey.setTimeout(() => {
      if (this._destroyed) {return;}
      this._setCapabilitySafe('onoff', false, 'Failed to reset momentary GUI state' );
    }, MOMENTARY_GUI_PULSE_MS);
  }

  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);

    this.log(`FingerBot DP ${dp}:`, parsedValue);
    try { this._onDeviceFrame(dp); } catch (_e) { /* never block RX */ }

    switch (dp) {
    case V1_FINGER_BOT_DATA_POINTS.battery:
    case 12: { // Alternative DP12 for Battery
      if (this.hasCapability('measure_battery')) {
        await this._setCapabilitySafe(
          'measure_battery',
          parsedValue,
          'Failed to update battery',
        );
      }

      const isLow =
          typeof parsedValue === 'number' && parsedValue <= BATTERY_LOW_THRESHOLD;

      if (isLow && !this._lastBatteryLowState) {
        this._triggerFlowCard('fingerbot_battery_low');
      }

      this._lastBatteryLowState = isLow;
      break;
    }

    case V1_FINGER_BOT_DATA_POINTS.mode:
    case 8: { // Alternative DP8 for Mode
      this.log('FingerBot mode DP report:', parsedValue);
      // Map 0 -> click, 1 -> switch, 2 -> program
      const modes = ['click', 'switch', 'program'];
      const modeString = modes[parsedValue] || 'click';
      if (this.hasCapability('finger_bot_mode')) {
        await this._setCapabilitySafe('finger_bot_mode', modeString, 'Failed to update mode');
      }
      break;
    }

    case V1_FINGER_BOT_DATA_POINTS.lowerLimit:
      this.log('FingerBot lower limit DP report:', parsedValue);
      break;

    case V1_FINGER_BOT_DATA_POINTS.delay:
      this.log('FingerBot delay DP report:', parsedValue);
      break;

    case V1_FINGER_BOT_DATA_POINTS.reverse:
      this.log('FingerBot reverse DP report:', parsedValue);
      break;

    case V1_FINGER_BOT_DATA_POINTS.upperLimit:
      this.log('FingerBot upper limit DP report:', parsedValue);
      break;

    case V1_FINGER_BOT_DATA_POINTS.touch:
      this.log('FingerBot touch DP report:', parsedValue);
      break;

    case 109: // Z2M TS0001_fingerbot: program (raw), read-only here
      this.log('FingerBot program DP report:', parsedValue);
      break;

    default:
      this.log('Unhandled FingerBot DP:', dp, 'value:', parsedValue);
    }
  }

  async applyConfiguredSettings({ includeMode = false } = {}) {
    const mode = this._getConfiguredMode();
    const lower = this.getSetting('lower_limit');
    const upper = this.getSetting('upper_limit');
    const delay = this.getSetting('sustain_time') ?? this.getSetting('delay');
    const reverse = this.getSetting('reverse_direction') ?? this.getSetting('reverse');
    const touch = this.getSetting('touch');

    try {
      if (includeMode) {
        await this.writeEnum(V1_FINGER_BOT_DATA_POINTS.mode, MODE[mode]);
      }

      if (typeof lower === 'number') {
        await this.writeData32(V1_FINGER_BOT_DATA_POINTS.lowerLimit, this._clampForCouple('lower', lower));
      }

      if (typeof upper === 'number') {
        await this.writeData32(V1_FINGER_BOT_DATA_POINTS.upperLimit, this._clampForCouple('upper', upper));
      }

      if (typeof delay === 'number') {
        await this.writeData32(V1_FINGER_BOT_DATA_POINTS.delay, this._clampForCouple('delay', delay));
      }

      if (typeof reverse === 'boolean') {
        await this.writeEnum(
          V1_FINGER_BOT_DATA_POINTS.reverse,
          reverse ? 1 : 0,
        );
      }

      if (typeof touch === 'boolean') {
        await this._writeTouch(touch);
      }
    } catch (err) {
      this.error('Failed to apply FingerBot settings', err);
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    this.log('FingerBot settings changed:', changedKeys);

    for (const key of changedKeys) {
      switch (key) {
      case 'fingerbot_mode':
        await this.writeEnum(
          V1_FINGER_BOT_DATA_POINTS.mode,
          MODE[this._normalizeMode(newSettings.fingerbot_mode)],
        );
        break;

      case 'lower_limit':
        await this.writeData32(
          V1_FINGER_BOT_DATA_POINTS.lowerLimit,
          this._clampForCouple('lower', newSettings.lower_limit),
        );
        break;

      case 'upper_limit':
        await this.writeData32(
          V1_FINGER_BOT_DATA_POINTS.upperLimit,
          this._clampForCouple('upper', newSettings.upper_limit),
        );
        break;

      case 'sustain_time':
      case 'delay':
        await this.writeData32(
          V1_FINGER_BOT_DATA_POINTS.delay,
          this._clampForCouple('delay', newSettings.sustain_time ?? newSettings.delay),
        );
        break;

      case 'reverse_direction':
      case 'reverse': {
        const reverse = newSettings.reverse_direction ?? newSettings.reverse;
        if (typeof reverse === 'boolean') {
          await this.writeEnum(
            V1_FINGER_BOT_DATA_POINTS.reverse,
            reverse ? 1 : 0,
          );
        }
        break;
      }

      case 'touch':
        if (typeof newSettings.touch === 'boolean') {
          await this._writeTouch(newSettings.touch);
        }
        break;

      default:
        this.log('Unhandled FingerBot setting change:', key);
      }
    }
  }

  _getConfiguredMode() {
    return this._normalizeMode(this.getSetting('fingerbot_mode'));
  }

  _normalizeMode(mode) {
    if (mode === 'switch' || mode === 'program') {return mode;}
    return DEFAULT_MODE;
  }

  async _setCapabilitySafe(capabilityId, value, errorMessage) {
    try {
      await this.safeSetCapabilityValue(capabilityId, value);
    } catch (err) {
      this.error(errorMessage, err);
    }
  }

  /**
   * Helper to safely trigger flow cards without crashing the driver.
   */
  _triggerFlowCard(id, tokens = {}, state = {}) {
    try {
      const card = this.homey.flow.getDeviceTriggerCard(id);
      if (card) {
        card.trigger(this, tokens, state)
          .catch(err => this.error(`Failed to trigger flow card "${id}"`, err));
      }
    } catch (err) {
      this.error(`Flow card "${id}" is not available`, err);
    }
  }

  _getFlowCard(id, type = 'trigger') {
    try {
      if (type === 'action') {return this.homey.flow.getActionCard(id);}
      if (type === 'condition') {return this.homey.flow.getConditionCard(id);}
      return this.homey.flow.getDeviceTriggerCard(id);
    } catch (err) {
      return null;
    }
  }

  onDeleted() {
    super.onDeleted();
    if (this._guiPulseTimeout) {
      this.homey.clearTimeout(this._guiPulseTimeout);
    }
    if (this._settingsReplayTimer) {
      this.homey.clearTimeout(this._settingsReplayTimer);
      this._settingsReplayTimer = null;
    }

    this.log('FingerBot device removed from Homey.');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') {this._updateLastSeen();}
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager?.forceRecovery?.();
    }
  }
}

module.exports = FingerBot;
