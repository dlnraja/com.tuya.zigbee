'use strict';

/**
 * SleepyDeviceInit — v9.0.251 (P60)
 *
 * Helpers for sleepy battery-powered EndDevices (motion sensors, presence
 * radars, contact sensors, etc.) that go to sleep within ~5 seconds of
 * pairing. The "passive mode" pattern from dlnraja v5.5.252 (forum topic
 * 140352 post #685):
 *
 *   The problem: HybridSensorBase.onNodeInit() does a lot of calculations
 *   that can timeout on the EndDevice battery who is on sleep mode just
 *   after pairing.
 *
 *   The fix: Battery sensors like ZG-204ZM now use a "passive mode"
 *   initialization:
 *   - No blocking operations during init
 *   - Only sets up listeners to receive data
 *   - Device is marked available immediately
 *   - Data will update when the sensor reports (on motion detection)
 *
 * API:
 *   - fireAndForget(device, promise, { name, timeoutMs }) — run async
 *     without blocking, with a soft timeout, log on error, never throw
 *   - passiveInit(device, fn) — wrap an init function so it runs
 *     after setAvailable() + passive listeners are wired
 *   - bindIasZone(iasCluster) — bind iasZone clusters in fire-and-forget
 *   - deferredRead(device, zclNode, readSpec, delayMs) — read attributes
 *     after a delay (when device is likely awake from motion)
 *
 * All helpers are no-ops on null / undefined input. Never throws.
 */

const ZCL_TIMEOUT_MS = 2000;          // 2s — short for sleepy devices
const DEFERRED_BATTERY_DELAY_MS = 5000; // 5s — device may wake on motion
const SAFE_SET_CAPABILITY_OPTIONS = { /* safeSetCapabilityValue options */ };

/**
 * Run a promise without awaiting it. Logs errors but never throws.
 * Optionally race with a timeout so the device init is never blocked
 * past `timeoutMs` even if the underlying call hangs.
 *
 * @param {Device} device Homey device instance (for log/error)
 * @param {Promise} promise Promise to fire-and-forget
 * @param {Object} options
 * @param {string} [options.name='op']     Label for logs
 * @param {number} [options.timeoutMs=2000] Soft timeout
 * @returns {Promise<boolean>} resolved true on success, false on error
 */
function fireAndForget(device, promise, options = {}) {
  const name = options.name || 'op';
  const timeoutMs = options.timeoutMs || ZCL_TIMEOUT_MS;

  if (!promise || typeof promise.then !== 'function') {
    return Promise.resolve(false);
  }

  let timer = null;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => {
      device?.log?.(`[SLEEPY-INIT] ⏳ ${name} timeout (${timeoutMs}ms) — device asleep, skipping`);
      resolve('timeout');
    }, timeoutMs);
  });

  return Promise.race([
    promise.then(
      (val) => { clearTimeout(timer); return val; },
      (err) => {
        clearTimeout(timer);
        device?.log?.(`[SLEEPY-INIT] ⚠️ ${name} failed: ${err?.message || err}`);
        return null;
      }
    ),
    timeoutPromise,
  ]);
}

/**
 * Mark the device as available immediately and run init `fn` in background
 * (fire-and-forget). Use this for sleepy EndDevice drivers so the user
 * sees the device as available right away, then data populates as the
 * device wakes and reports.
 *
 * @param {Device} device
 * @param {Function} fn Async function to run in background
 * @param {string} [name='init']
 */
function passiveInit(device, fn, name = 'init') {
  if (!device || typeof fn !== 'function') return;
  // Mark available FIRST so the user sees the device
  Promise.resolve(device.setAvailable?.()).catch(() => {});
  // Then run init in background
  Promise.resolve()
    .then(() => fn())
    .then(
      () => device.log?.(`[SLEEPY-INIT] ✅ ${name} complete`),
      (err) => device.log?.(`[SLEEPY-INIT] ⚠️ ${name} failed: ${err?.message || err}`)
    );
}

/**
 * Bind ZCL clusters fire-and-forget. Use this in onNodeInit of sleepy
 * devices so binding doesn't block init waiting for the device to ACK.
 *
 * @param {Object} zclNode
 * @param {string[]} clusterNames e.g. ['iasZone', 'genPowerCfg', 'msIlluminanceMeasurement']
 * @param {Object} [log] Optional logger with .log(msg)
 * @returns {number} count of clusters for which bind() was issued
 */
function bindClusters(zclNode, clusterNames, log) {
  if (!zclNode?.endpoints?.[1] || !Array.isArray(clusterNames)) return 0;
  const ep1 = zclNode.endpoints[1];
  let bound = 0;
  for (const cName of clusterNames) {
    const cl = ep1.clusters?.[cName];
    if (cl?.bind) {
      cl.bind().catch((e) => log?.(`[SLEEPY-INIT] bind ${cName}: ${e?.message || e}`));
      bound++;
    }
  }
  log?.(`[SLEEPY-INIT] 📡 Cluster binding initiated (${bound}/${clusterNames.length} clusters)`);
  return bound;
}

/**
 * Read ZCL attributes after a delay. Use this for battery/temp/humidity
 * reads on sleepy devices that fail at init time but succeed once the
 * device is awake (e.g. after a motion event).
 *
 * @param {Device} device
 * @param {Object} zclNode
 * @param {Object} readSpec { cluster: string, attributes: string[] }
 * @param {number} [delayMs=5000]
 * @returns {Promise<Object|undefined>} read attributes or undefined
 */
async function deferredRead(device, zclNode, readSpec, delayMs = DEFERRED_BATTERY_DELAY_MS) {
  if (!device || !zclNode || !readSpec) return undefined;
  await new Promise((r) => setTimeout(r, delayMs));
  try {
    const ep1 = zclNode?.endpoints?.[1];
    const clusterNames = Array.isArray(readSpec.cluster) ? readSpec.cluster : [readSpec.cluster];
    for (const cName of clusterNames) {
      const cl = ep1?.clusters?.[cName];
      if (cl?.readAttributes) {
        const attrs = await cl.readAttributes(readSpec.attributes || []);
        device.log?.(`[SLEEPY-INIT] 🔋 deferredRead ${cName}: ${JSON.stringify(attrs)}`);
        return attrs;
      }
    }
  } catch (err) {
    device.log?.(`[SLEEPY-INIT] ℹ️ deferredRead skipped (device asleep): ${err?.message || err}`);
  }
  return undefined;
}

/**
 * Send a Tuya data request after a delay. Use for TS0601 devices that
 * need a DP query to populate their state, but the device sleeps before
 * the query completes.
 *
 * @param {Device} device
 * @param {Object} zclNode
 * @param {number[]} dpIds Array of DPs to request
 * @param {number} [delayMs=5000]
 */
function deferredTuyaDataRequest(device, zclNode, dpIds, delayMs = DEFERRED_BATTERY_DELAY_MS) {
  if (!device || !zclNode || !Array.isArray(dpIds) || dpIds.length === 0) return;
  setTimeout(() => {
    if (device._destroyed) return;
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.manuSpecificTuya;
      if (!tuyaCluster) return;
      for (const dpId of dpIds) {
        if (tuyaCluster.dataRequest) {
          tuyaCluster.dataRequest({ dp: dpId }).catch((e) => {});
        }
      }
      device.log?.(`[SLEEPY-INIT] 📡 Tuya dataRequest sent for DPs [${dpIds.join(', ')}]`);
    } catch (err) {
      device.log?.(`[SLEEPY-INIT] ℹ️ Tuya dataRequest skipped: ${err?.message || err}`);
    }
  }, delayMs);
}

/**
 * Setup IAS Zone cluster for sleepy motion sensors. Mirrors the
 * non-blocking pattern: write CIE address and send enroll response
 * in fire-and-forget mode. Sets up `onZoneEnrollRequest` and
 * `onZoneStatusChangeNotification` listeners synchronously.
 *
 * @param {Device} device
 * @param {Object} iasCluster
 * @param {Object} zclNode
 * @param {Object} callbacks
 * @param {Function} [callbacks.onMotion] Called with (motion:boolean)
 * @param {Function} [callbacks.onZoneEnrollRequest] Called with payload
 */
function setupIasZoneSleepy(device, iasCluster, zclNode, callbacks = {}) {
  if (!iasCluster) return;
  const log = (msg) => device.log?.(msg);
  log('[SLEEPY-INIT] 📡 IAS Zone setup (passive mode)');

  // Listeners first (synchronous, fast)
  if (callbacks.onZoneEnrollRequest) {
    iasCluster.onZoneEnrollRequest = async (payload) => {
      log(`[SLEEPY-INIT] 📥 Zone Enroll Request: ${JSON.stringify(payload)}`);
      try {
        await iasCluster.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 23 });
      } catch (err) { log(`[SLEEPY-INIT] zoneEnrollResponse err: ${err.message}`); }
    };
  }
  if (callbacks.onMotion) {
    iasCluster.onZoneStatusChangeNotification = (payload) => {
      // v5.5.299: Mark device as awake on any motion event
      const parsed = device._parseIASZoneStatus?.(payload?.zoneStatus) || { alarm1: false, alarm2: false };
      const motion = parsed.alarm1 || parsed.alarm2;
      callbacks.onMotion(motion, payload);
    };
    if (typeof iasCluster.on === 'function') {
      iasCluster.on('attr.zoneStatus', (status) => {
        const motion = (status & 0x01) !== 0 || (status & 0x02) !== 0;
        callbacks.onMotion(motion, { raw: status });
      });
    }
  }

  // Write CIE address (fire-and-forget with timeout)
  fireAndForget(device, (async () => {
    const homeyIeee = device.homey?.zigbee?.getNetwork?.()?.ieeeAddress;
    if (homeyIeee) {
      await iasCluster.writeAttributes({ iasCieAddress: homeyIeee });
      log('[SLEEPY-INIT] 📡 CIE address written');
    }
  })(), { name: 'writeCieAddress' });

  // Proactive enroll response (fire-and-forget with timeout)
  fireAndForget(device, (async () => {
    await iasCluster.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 23 });
    log('[SLEEPY-INIT] 📡 Zone Enroll Response sent');
  })(), { name: 'zoneEnrollResponse' });

  // Bind iasZone (fire-and-forget)
  if (zclNode?.endpoints?.[1]) {
    bindClusters(zclNode, ['iasZone', 'ssIasZone'], log);
  }
}

module.exports = {
  ZCL_TIMEOUT_MS,
  DEFERRED_BATTERY_DELAY_MS,
  fireAndForget,
  passiveInit,
  bindClusters,
  deferredRead,
  deferredTuyaDataRequest,
  setupIasZoneSleepy,
};
