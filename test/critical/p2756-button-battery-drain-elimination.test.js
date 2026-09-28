'use strict';

/**
 * P2756 — Button Battery Drain Elimination
 *
 * Verifies that all radio transmission and polling storms on battery buttons/remotes
 * (TS0041, TS0042, TS0043, TS0044, TS004F, wireless remotes) are strictly eliminated:
 * 1. shouldSkipSleepyRemoteBatteryTx detects battery buttons/remotes via driverId,
 *    productId, _forcedDeviceType, and isBatteryDevice().
 * 2. BaseUnifiedDevice:
 *    - Background init skips _batteryConfigTimer, _batteryInitTimer, forceInitialRead,
 *      scheduleAttributePolling, and retryBatteryRead for sleepy remotes.
 *    - scheduleAttributePolling skips setting pollingTimer on sleepy remotes.
 * 3. PhysicalButtonMixin:
 *    - _scheduleSceneModeRecovery skips setting periodic recovery timer on battery devices.
 *    - Button press handler skips awake battery read if UI already has valid battery.
 * 4. ButtonDevice:
 *    - _scheduleSceneModeRecovery skips periodic recovery timer on battery devices.
 *    - _readBatteryWhileAwake skips active ZCL readAttributes when UI has battery (>0%).
 *    - METHOD 2 Tuya DP query is not executed when device does not declare tuyaBatteryDp.
 *    - Boot battery timer skips awake read on boot for sleepy remotes.
 * 5. BatteryReportingManager:
 *    - configureStandardZigbee skips configureReporting on sleepy remotes.
 * 6. Wireless Button driver:
 *    - _forceInitialBatteryRead skips active ZCL read when battery already present or cached.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');

describe('P2756 Button Battery Drain Elimination', () => {

  const { shouldSkipSleepyRemoteBatteryTx } = require(path.join(ROOT, 'lib', 'zigbee', 'PowerClusterPolicy'));

  it('1. shouldSkipSleepyRemoteBatteryTx identifies all battery buttons and remotes', () => {
    // Mains-powered devices must NEVER be skipped
    assert.equal(shouldSkipSleepyRemoteBatteryTx({ mainsPowered: true }), false);
    assert.equal(shouldSkipSleepyRemoteBatteryTx(null, { device: { mainsPowered: true } }), false);

    // Standard TS004x buttons
    assert.equal(shouldSkipSleepyRemoteBatteryTx({ productId: 'TS0041' }), true);
    assert.equal(shouldSkipSleepyRemoteBatteryTx({ productId: 'TS0042' }), true);
    assert.equal(shouldSkipSleepyRemoteBatteryTx({ productId: 'TS0043' }), true);
    assert.equal(shouldSkipSleepyRemoteBatteryTx({ productId: 'TS0044' }), true);
    assert.equal(shouldSkipSleepyRemoteBatteryTx({ productId: 'TS004F' }), true);

    // Driver ID based detection
    const fakeButtonDev = {
      driver: { id: 'button_wireless_4' },
      mainsPowered: false,
    };
    assert.equal(shouldSkipSleepyRemoteBatteryTx(null, { device: fakeButtonDev }), true);

    const fakeSosDev = {
      driver: { id: 'button_emergency_sos' },
      mainsPowered: false,
    };
    assert.equal(shouldSkipSleepyRemoteBatteryTx(null, { device: fakeSosDev }), true);

    const fakeRemoteDev = {
      driver: { id: 'remote_button_wireless_smart' },
      mainsPowered: false,
    };
    assert.equal(shouldSkipSleepyRemoteBatteryTx(null, { device: fakeRemoteDev }), true);

    // _forcedDeviceType & isBatteryDevice
    const forcedBtn = {
      _forcedDeviceType: 'BUTTON',
      mainsPowered: false,
    };
    assert.equal(shouldSkipSleepyRemoteBatteryTx(null, { device: forcedBtn }), true);

    const battDev = {
      isBatteryDevice: () => true,
      mainsPowered: false,
    };
    assert.equal(shouldSkipSleepyRemoteBatteryTx(null, { device: battDev }), true);
  });

  it('2. BaseUnifiedDevice: background init and scheduleAttributePolling guard against sleepy remotes', () => {
    const code = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'BaseUnifiedDevice.js'), 'utf8');

    // Background init must check shouldSkipSleepyRemoteBatteryTx
    assert.ok(
      code.includes('isSleepyRemoteBatt = shouldSkipSleepyRemoteBatteryTx'),
      'BaseUnifiedDevice background init must check shouldSkipSleepyRemoteBatteryTx'
    );
    assert.ok(
      code.includes('Skipping forceInitialRead, polling, and retryBatteryRead for sleepy remote'),
      'BaseUnifiedDevice must log and skip proactive TX for sleepy remotes'
    );

    // scheduleAttributePolling must skip for sleepy remotes
    assert.ok(
      code.includes('Skipping polling for sleepy remote/button (preserves battery)'),
      'scheduleAttributePolling must skip polling for sleepy remote/button'
    );

    // onEndDeviceAnnounce must pass device
    assert.ok(
      code.includes('shouldSkipSleepyRemoteBatteryTx(p, { device: this, homey: this.homey })'),
      'onEndDeviceAnnounce must pass device to shouldSkipSleepyRemoteBatteryTx'
    );
  });

  it('3. PhysicalButtonMixin: scene recovery timer and button press wake read guard battery life', () => {
    const code = fs.readFileSync(path.join(ROOT, 'lib', 'mixins', 'PhysicalButtonMixin.js'), 'utf8');

    // _scheduleSceneModeRecovery must skip for battery devices
    assert.ok(
      code.includes('Skipping periodic scene recovery for battery device (preserves CR2032 life; mode re-applied on wake)'),
      'PhysicalButtonMixin must skip periodic scene recovery timer on battery devices'
    );

    // Button press must check UI battery before scheduling awake read
    assert.ok(
      code.includes('if (!skipSleepy || !hasUi)'),
      'PhysicalButtonMixin must skip scheduling _readBatteryWhileAwake if UI has battery'
    );
  });

  it('4. ButtonDevice: scene recovery timer, awake battery read, and Tuya DP queries guarded', () => {
    const code = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'ButtonDevice.js'), 'utf8');

    // _scheduleSceneModeRecovery must skip for battery devices
    assert.ok(
      code.includes('if (!this.mainsPowered || this.hasCapability?.(\'measure_battery\') || this.isBatteryDevice?.())'),
      'ButtonDevice _scheduleSceneModeRecovery must return early for battery devices'
    );

    // _readBatteryWhileAwake must skip when UI has battery and stamp last_battery_time if 0
    assert.ok(
      code.includes('UI already has battery (${curVal}%) - skip active TX to preserve CR2032'),
      'ButtonDevice must skip active TX when UI already has battery percentage'
    );

    // METHOD 2 must require hasTuyaBatteryDp
    assert.ok(
      code.includes('const hasTuyaBatteryDp = !!(profile?.tuyaBatteryDp || profile?.batteryDp);'),
      'ButtonDevice METHOD 2 must require explicit tuyaBatteryDp in profile'
    );

    // Boot timer must check shouldSkipSleepyRemoteBatteryTx
    assert.ok(
      code.includes('P2733/P2756 skip init ZCL read (sleepy remote / skipBatteryReporting)'),
      'ButtonDevice boot battery timer must skip for sleepy remotes'
    );
  });

  it('5. BatteryReportingManager: configureStandardZigbee skips configureReporting on sleepy remotes', () => {
    const code = fs.readFileSync(path.join(ROOT, 'lib', 'utils', 'battery-reporting-manager.js'), 'utf8');

    assert.ok(
      code.includes('Skipping configureReporting on sleepy remote/button (preserves battery)'),
      'BatteryReportingManager must skip configureReporting on sleepy remotes'
    );
  });

  it('6. Drivers: button_wireless, smart remote, wall remote, and sos button guard battery reads', () => {
    const bwCode = fs.readFileSync(path.join(ROOT, 'drivers', 'button_wireless', 'device.js'), 'utf8');
    assert.ok(
      bwCode.includes('Battery already present (${cur}%) - skipping initial read to preserve battery'),
      'button_wireless must skip initial read if battery is already present'
    );

    const smartCode = fs.readFileSync(path.join(ROOT, 'drivers', 'remote_button_wireless_smart', 'device.js'), 'utf8');
    assert.ok(
      smartCode.includes('if (!hasBattery && !skipSleepy && this._powerCluster'),
      'remote_button_wireless_smart must guard battery read on wake'
    );

    const wallCode = fs.readFileSync(path.join(ROOT, 'drivers', 'remote_button_wireless_wall', 'device.js'), 'utf8');
    assert.ok(
      wallCode.includes('if (!hasBattery && !skipSleepy && this._powerCluster'),
      'remote_button_wireless_wall must guard battery read on wake'
    );

    const sosCode = fs.readFileSync(path.join(ROOT, 'drivers', 'button_emergency_sos', 'device.js'), 'utf8');
    assert.ok(
      sosCode.includes('Battery already fresh (${prev}%) - skipping read to preserve battery'),
      'button_emergency_sos must skip reading if battery was read within 24h'
    );
  });

});
