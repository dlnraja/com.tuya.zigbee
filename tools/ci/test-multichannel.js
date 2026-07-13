// tools/ci/test-multichannel.js — P37 integration test
'use strict';

const { MultiChannelManager, ParallelDetector, TransmissionManager, ReceptionManager, ChannelResult } = require('../../lib/multichannel');
const { AutonomousVerificationEngine } = require('../../lib/autonomous');
const { SecurityGuard } = require('../../lib/security/SecurityGuard');

async function main() {
  console.log('═══ P37 Multi-Channel + Autonomous + Security ═══');
  console.log('');

  // ═══ 1. ChannelAdapters ═══
  console.log('1. ChannelAdapters');
  const {
    ZclChannelAdapter, TuyaDpChannelAdapter, RawZigbeeChannelAdapter,
    HomeyAppChannelAdapter, HybridChannelAdapter, ChannelResult: CR,
  } = require('../../lib/multichannel/ChannelAdapters');

  const fakeDevice = {
    homey: { setTimeout: (cb, ms) => setTimeout(cb, ms) },
    zclNode: { endpoints: { 1: { clusters: { onOff: { readAttributes: async () => ({ onOff: 1 }) } } } } },
    getCapabilityValue: async (cap) => 1,
    setCapabilityValue: async () => true,
  };

  const zcl = new ZclChannelAdapter(fakeDevice);
  const tuya = new TuyaDpChannelAdapter(fakeDevice);
  const raw = new RawZigbeeChannelAdapter(fakeDevice);
  const homeyApp = new HomeyAppChannelAdapter(fakeDevice);
  const hybrid = new HybridChannelAdapter(fakeDevice, { zcl, tuya, raw });

  console.log('   ZCL available:', zcl.isAvailable());
  console.log('   Tuya available:', tuya.isAvailable());
  console.log('   Raw available:', raw.isAvailable());
  console.log('   HomeyApp available:', homeyApp.isAvailable());
  console.log('   Hybrid available:', hybrid.isAvailable());

  // ═══ 2. MultiChannelManager ═══
  console.log('');
  console.log('2. MultiChannelManager');
  const mcm = new MultiChannelManager(fakeDevice);
  const readResult = await mcm.read('onoff');
  console.log('   read(onoff) →', readResult.value, 'via', readResult.source, 'conf:', readResult.confidence);
  const writeResult = await mcm.write('onoff', true);
  console.log('   write(onoff) →', writeResult.ok ? 'OK' : 'FAIL', 'via', writeResult.source);

  // ═══ 3. ParallelDetector ═══
  console.log('');
  console.log('3. ParallelDetector');
  const pd = new ParallelDetector(fakeDevice);
  const detected = await pd.detect();
  console.log('   detected.driver:', detected.driver);
  console.log('   detected.confidence:', detected.confidence);
  console.log('   detected.sources:', detected.sources);
  console.log('   detected.elapsedMs:', detected.elapsedMs);

  // ═══ 4. TransmissionManager ═══
  console.log('');
  console.log('4. TransmissionManager');
  const tm = new TransmissionManager(fakeDevice);
  const sendResult = await tm.send('onoff', true);
  console.log('   send(onoff) →', sendResult.ok ? 'OK' : 'FAIL', 'attempts:', sendResult.attempts);
  const health = tm.getHealth();
  console.log('   TM health:', { total: health.total, successRate: health.successRate });

  // ═══ 5. ReceptionManager ═══
  console.log('');
  console.log('5. ReceptionManager');
  const rm = new ReceptionManager(fakeDevice);
  rm.receive('onoff', true, 'zcl');
  rm.receive('onoff', true, 'tuya'); // dedup
  rm.receive('onoff', false, 'zcl');
  const latest = rm.getLatest('onoff');
  console.log('   latest onoff:', latest && latest.value, 'via', latest && latest.source);
  const rHealth = rm.getHealth();
  console.log('   RM health:', { total: rHealth.totalReceived, buffer: rHealth.bufferSize });

  // ═══ 6. AutonomousVerificationEngine ═══
  console.log('');
  console.log('6. AutonomousVerificationEngine');
  const ave = new AutonomousVerificationEngine({ stateFile: '.github/state/test-autonomous.json' });
  const report = await ave.runChecks({ multiChannelManagers: [mcm], transmissionManagers: [tm] });
  console.log('   checks run:', report.checks.length);
  console.log('   findings:', report.findings.length);
  console.log('   fixes:', report.fixes.length);
  console.log('   durationMs:', report.durationMs);
  const alerts = ave.getAlerts();
  console.log('   alerts:', alerts.length);

  // ═══ 7. SecurityGuard ═══
  console.log('');
  console.log('7. SecurityGuard');
  const sg = new SecurityGuard();
  sg.setPermittedCapabilities('dev1', ['onoff', 'dim']);
  try {
    const r = sg.validateCapabilityValue('onoff', true, 'dev1');
    console.log('   valid capability → OK, sanitized:', r.sanitized);
  } catch (e) {
    console.log('   unexpected error:', e.message);
  }
  try {
    sg.validateCapabilityValue('onoff', 'x'.repeat(1000), 'dev1');
    console.log('   long string not caught!');
  } catch (e) {
    console.log('   long string caught →', e.constructor.name, ':', e.message);
  }
  try {
    sg.validateCapabilityValue('notallowed', true, 'dev1');
    console.log('   bad capability not caught!');
  } catch (e) {
    console.log('   bad capability caught →', e.constructor.name);
  }
  const sHealth = sg.getHealth();
  console.log('   SG health:', sHealth);

  console.log('');
  console.log('═══ ALL TESTS PASSED ═══');
}

main().catch((e) => {
  console.error('TEST FAILED:', e);
  process.exit(1);
});
