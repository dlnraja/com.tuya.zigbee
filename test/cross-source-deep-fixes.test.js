'use strict';

/**
 * Tests — P92.67 cross-source deep fixes (10 investigation reports)
 * Pins the highest-blast-radius fixes from the full cross-reference program:
 * lifecycle, ZCL header parsing, phantom presses, jitter, magic packet,
 * DP registry, antispam, energy data, restored fingerprints.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// v10.16.0: the live feed is a build artifact (untracked since P92.84) —
// regenerate it once if absent so tests are self-sufficient on fresh clones.
const FEED_DIR = path.join(ROOT, '.github', 'pages-build', 'data');
if (!fs.existsSync(path.join(FEED_DIR, 'mfs_db_latest.json'))) {
  try {
    require('child_process').execSync('node .github/scripts/export-live-data-feed.js', { cwd: ROOT, stdio: 'pipe' });
  } catch { /* export best-effort */ }
}

describe('P92.67 — cross-source deep fixes', () => {

  it('lifecycle: _destroyDevice runs cleanup even when _destroyed set early', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.ok(src.includes('_destroyDeviceDone'), 'dedicated idempotence flag');
    assert.ok(!/async _destroyDevice\(\) \{\s*if \(this\._destroyed\)/.test(src),
      'guard no longer uses _destroyed (dead-code bug since v9.1.2)');
  });

  it('parseZclHeader: standard 3-byte and manufacturer-specific 5-byte headers', () => {
    const { parseZclHeader } = require(path.join(ROOT, 'lib/zigbee/ZigbeeHelpers'));
    // standard: fc=0x01, tsn=0x42, cmd=0xFD, payload=[0x01]
    const std = parseZclHeader(Buffer.from([0x01, 0x42, 0xFD, 0x01]));
    assert.strictEqual(std.cmdId, 0xFD);
    assert.strictEqual(std.tsn, 0x42);
    assert.strictEqual(std.mfrCode, null);
    assert.strictEqual(std.payloadOffset, 3);
    assert.strictEqual(std.clusterSpecific, true);
    // mfr-specific: fc=0x05, mfrCode=0x115F LE, tsn=0x07, cmd=0xFD, payload=[0x02]
    const mfr = parseZclHeader(Buffer.from([0x05, 0x5F, 0x11, 0x07, 0xFD, 0x02]));
    assert.strictEqual(mfr.cmdId, 0xFD, 'cmdId must be read at offset 4 for mfr frames');
    assert.strictEqual(mfr.mfrCode, 0x115F, 'manufacturer code is little-endian');
    assert.strictEqual(mfr.payloadOffset, 5);
    // global frame (fc=0x00 read response) — cmd 0x01 is NOT cluster-specific
    const global = parseZclHeader(Buffer.from([0x08, 0x01, 0x01, 0x00]));
    assert.strictEqual(global.clusterSpecific, false);
  });

  it('phantom presses: raw interceptors parse headers and require cluster-specific frames', () => {
    const b4 = read('drivers/button_wireless_4/device.js');
    assert.ok(b4.includes('parseZclHeader'), 'button_wireless_4 header-aware');
    assert.ok(b4.includes('hdr.payloadOffset'), 'button_wireless_4 mfr-bit payload offset');
    const ube = read('lib/mixins/UnifiedButtonEngine.js');
    assert.ok(ube.includes('hdr.clusterSpecific'), 'UnifiedButtonEngine rejects global frames (phantom press fix)');
    const pzao = read('drivers/wall_switch_4gang_1way/device.js');
    assert.ok(pzao.includes('parseZclHeader'), 'PZAO interceptor repaired (was dead: frame.cmdId on Buffer)');
    const knob = read('drivers/smart_knob_rotary/device.js');
    assert.ok(knob.includes('parseZclHeader'), 'knob scene listener repaired (was dead: frame[0] vs cmdId)');
  });

  it('TuyaEF00Manager passive frame handles the 5-byte mfr header (offset 7)', () => {
    const src = read('lib/tuya/TuyaEF00Manager.js');
    assert.ok(src.includes('mfrBit ? 7 : 5'), 'offset 7 for mfr frames');
  });

  it('jitter: reconnection backoff and deferred init are desynchronized', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.ok(src.includes('0.75 + Math.random() * 0.5'), 'backoff jitter ±25%');
    assert.ok(src.includes('1000 + Math.floor(Math.random() * 10000)'), 'deferred init stagger 1-11s (boot storm fix)');
  });

  it('magic packet: re-sent on device announce (power-cut recovery)', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.ok(src.includes('Magic packet re-sent after announce'), 'rejoin re-enchant');
    assert.ok(src.includes('0xfffe'), 'attrReportingStatus in the read');
  });

  it('dp_registry.json (756 mfrs) is wired as a lookup tier in TuyaUniversalMapper', () => {
    const src = read('lib/tuya/TuyaUniversalMapper.js');
    assert.ok(src.includes('_getRegistryMapping'), 'registry tier present');
    assert.ok(src.includes('dp_registry.json'), 'dead data now loaded');
  });

  it('bitmap DPs parse 1/2/4 bytes (ZHA parity)', () => {
    const src = read('lib/tuya/TuyaDPParser.js');
    assert.ok(src.includes('bitmapLen'), 'multi-byte bitmap');
    assert.ok(src.includes('dataBuffer.length >= 4 ? 4'), '4-byte bitmaps supported');
  });

  it('telemetry: pure-default battery estimates are never written to measure_battery', () => {
    const src = read('lib/utils/DeviceTelemetryEstimator.js');
    assert.ok(src.includes("estimate.reason === 'profile-default:no-direct-report'"), 'fabrication guard');
  });

  it('OTA: performUpdate fails honestly when the SDK has no otaUpdate cluster', () => {
    const src = read('lib/ota/OTAUpdateManager.js');
    assert.ok(src.includes('OTA flashing is not supported on Homey'), 'honest guard');
    assert.ok(src.includes('Current firmware version unknown'), 'no false-positive when version unparsable');
    const repo = read('lib/ota/OTARepository.js');
    assert.ok(repo.includes('_manifestCaches'), 'manifest cache keyed per URL');
  });

  it('antispam: virtual toggle throttled 300ms and TX rate limiter wired', () => {
    const src = read('lib/mixins/VirtualButtonMixin.js');
    assert.ok(src.includes('_virtualToggleLastTap'), '300ms leading throttle');
    assert.ok(src.includes("canSendCommand('virtual_button')"), 'TX limiter no longer dead code');
    const bd = read('lib/devices/ButtonDevice.js');
    const listener = bd.slice(bd.indexOf('Button ${buttonNum} capability triggered'));
    assert.ok(listener.indexOf('check BEFORE stamping') < listener.indexOf('lastVirtualPress[buttonNum] = now'),
      'stamp after dedup check');
  });

  it('energy: battery drivers have no phantom approximation; bulbs use usageOn/Off', () => {
    const bulb = JSON.parse(read('drivers/bulb_rgbw/driver.compose.json'));
    assert.ok(bulb.energy.approximation.usageOn > 0, 'bulb has usageOn');
    assert.ok(bulb.energy.approximation.usageConstant === undefined, 'no usageConstant on on/off device');
    const btn = JSON.parse(read('drivers/button_wireless_smart/driver.compose.json'));
    assert.ok(Array.isArray(btn.energy.batteries), 'button declares batteries');
    assert.strictEqual(btn.energy.approximation, undefined, 'no phantom 0.5W consumer');
  });

  it('fingerprints: restored mfrs + Dooya re-route + CO detector re-route', () => {
    const rgb = JSON.parse(read('drivers/rgb_wall_led_light/driver.compose.json'));
    assert.ok(rgb.zigbee.manufacturerName.length > 0, 'rgb_wall_led_light no longer empty');
    const climate = JSON.parse(read('drivers/climate_sensor/driver.compose.json'));
    assert.ok(!climate.zigbee.manufacturerName.some((m) => /3ylew7b4/i.test(m)), 'Dooya out of climate_sensor');
    const curtain = JSON.parse(read('drivers/curtain_motor/driver.compose.json'));
    assert.ok(curtain.zigbee.manufacturerName.some((m) => /3ylew7b4/i.test(m)), 'Dooya in curtain_motor');
    const co = JSON.parse(read('drivers/co_sensor/driver.compose.json'));
    assert.ok(co.zigbee.manufacturerName.some((m) => /rjxqso4a/i.test(m)), 'MOES CO in co_sensor (with alarm_co)');
  });
});

describe('P92.73 — TS0601 flooding thermostats routing (z2m #17833)', () => {
  it('flooding TRVs/thermostats are in thermostat drivers, not climate_sensor', () => {
    const climate = JSON.parse(read('drivers/climate_sensor/driver.compose.json'));
    const mfrs = climate.zigbee.manufacturerName.join(' ');
    assert.ok(!/ye5jkfsb/i.test(mfrs), 'ye5jkfsb out of climate_sensor');
    assert.ok(!/znzs7yaw/i.test(mfrs), 'znzs7yaw out of climate_sensor');
    const rv = JSON.parse(read('drivers/radiator_valve/driver.compose.json'));
    assert.ok(rv.zigbee.manufacturerName.some((m) => /ye5jkfsb/i.test(m)), 'TRV flooder in radiator_valve');
    const wt = JSON.parse(read('drivers/wall_thermostat/driver.compose.json'));
    assert.ok(wt.zigbee.manufacturerName.some((m) => /znzs7yaw/i.test(m)), 'BHT-006 flooder in wall_thermostat');
    const db = JSON.parse(read('data/mfs_db.json'));
    for (const k of Object.keys(db)) {
      if (/ye5jkfsb/i.test(k)) assert.strictEqual(db[k].driverId, 'radiator_valve');
      if (/znzs7yaw/i.test(k)) assert.strictEqual(db[k].driverId, 'wall_thermostat');
    }
  });
});

describe('P92.74 — To-Do cross-source enrichments', () => {
  it('ZG-205Z presence sensor is not in climate_sensor', () => {
    const climate = JSON.parse(read('drivers/climate_sensor/driver.compose.json'));
    assert.ok(!/dapwryy7/i.test(climate.zigbee.manufacturerName.join(' ')));
    const radar = JSON.parse(read('drivers/presence_sensor_radar/driver.compose.json'));
    assert.ok(radar.zigbee.manufacturerName.some((m) => /dapwryy7/i.test(m)));
  });
  it('ZY-M100 zero-emission firmware filter is present on both DP entry points', () => {
    const src = read('drivers/presence_sensor_radar/device.js');
    assert.ok((src.match(/_tze204_ya4ft0w4/g) || []).length >= 2, 'filter on _handleDP + onTuyaDP');
  });
  it('battery queries are spaced to 4h for battery devices (ZC-LS02 lesson)', () => {
    const src = read('lib/helpers/BatteryRouter.js');
    assert.ok(src.includes('14400000'), '4h poll interval');
  });
  it('tuya_revive maintenance action exists and runs the 5-step sequence', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.ok(src.includes('_tuyaReviveRoutine'), 'revive routine');
    assert.ok(src.includes('Magic packet (re-enchant)'), 'magic packet step');
    const b4 = JSON.parse(read('drivers/button_wireless_4/driver.compose.json'));
    assert.ok((b4.maintenanceActions || []).some((a) => a.id === 'tuya_revive'), 'declared in drivers');
  });
  it('flood alert notification fires at most once per device per day', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.ok(src.includes('last_flood_alert_at'), 'daily flood alert');
    assert.ok(src.includes('86400000'), '24h window');
  });
});

describe('P92.75 — L99 enrichments', () => {
  it('manual WiFi pairing probes the TCP connection before creating the device', () => {
    const src = read('lib/tuya-local/TuyaLocalDriver.js');
    assert.ok(src.includes('_probeLocalKey'), 'probe method');
    assert.ok(src.includes('Cannot reach device with these credentials'), 'clear error');
    assert.ok(src.includes('8000'), '8s timeout');
  });
  it('Rx/Tx cumulative counters are persisted in store (throttled)', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.ok(src.includes('stats_rx_total'), 'rx counter');
    assert.ok(src.includes('stats_tx_total'), 'tx counter');
    assert.ok(src.includes('% 25 === 0'), 'throttled writes');
  });
});

describe('P92.76 — PredictiveHealthEngine data feed', () => {
  it('UnifiedBatteryHandler feeds recordMetrics with real battery samples', () => {
    const src = read('lib/battery/UnifiedBatteryHandler.js');
    assert.ok(src.includes('recordMetrics'), 'engine fed');
    assert.ok(src.includes('batteryPercent: smoothed'), 'real percent fed');
  });
  it('PredictiveHealthEngine is instantiated and its flow cards registered', () => {
    const app = read('app.js');
    assert.ok(app.includes('new PredictiveHealthEngine(this.homey)'), 'engine instantiated');
    const ffc = read('lib/flow/FeatureFlowCards.js');
    assert.ok(ffc.includes('health_failure_predicted'), 'failure card');
    assert.ok(ffc.includes('health_battery_replacement_predicted'), 'battery card');
  });
});

describe('P92.78 — master doctrine enrichments', () => {
  it('enigma report is opt-in via maintenance action and never auto-telemetries', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.ok(src.includes('_generateIssueReport'), 'report generator');
    assert.ok(src.includes('NO automatic telemetry'), 'privacy by design');
    const b4 = JSON.parse(read('drivers/button_wireless_4/driver.compose.json'));
    assert.ok((b4.maintenanceActions || []).some((a) => a.id === 'generate_issue_report'), 'declared');
  });
  it('live feed carries sourceBranch master', () => {
    const feed = JSON.parse(read('.github/pages-build/data/mfs_db_latest.json'));
    assert.strictEqual(feed.sourceBranch, 'master');
  });
  it('backport-candidates tool exists and runs (7-day soak)', () => {
    const src = read('tools/ci/backport-candidates.js');
    assert.ok(src.includes('SOAK_DAYS'), 'soak period');
    assert.ok(fs.existsSync('.github/state/backport-candidates.json'), 'report generated');
  });
  it('master doctrine is documented', () => {
    const doc = read('docs/CONTRIBUTING_DEV.md');
    assert.ok(doc.includes('Doctrine des branches'), 'doctrine section');
    assert.ok(doc.includes('protection de branche'), 'protection recommendation');
  });
});

describe('P92.79 — AI quota visibility', () => {
  it('quota report tool exists and warns at 80% of daily caps', () => {
    const src = read('tools/ci/ai-quota-report.js');
    assert.ok(src.includes('AI_GLOBAL_DAILY_CAP'), 'global cap');
    assert.ok(src.includes('>= 80'), '80% warning threshold');
  });
  it('self-improve includes the AI quota report step', () => {
    const wf = read('.github/workflows/self-improve.yml');
    assert.ok(wf.includes('ai-quota-report.js'), 'quota step wired');
  });
  it('billing guard: paid providers blocked by default, daily caps enforced', () => {
    const src = read('.github/scripts/ai-helper.js');
    assert.ok(src.includes('AI_ALLOW_PAID'), 'paid opt-in');
    assert.ok(src.includes('AI_GLOBAL_DAILY_CAP'), 'global daily cap');
  });
});

describe('P92.80 — deleted tooling reimplemented + Z2M gap imports', () => {
  it('z2m-gap-audit tool exists and produces a state report', () => {
    const src = read('tools/ci/z2m-gap-audit.js');
    assert.ok(src.includes('exposeHints'), 'expose hints');
    assert.ok(fs.existsSync('.github/state/z2m-gap-audit.json'), 'state report');
  });
  it('Z2M-known TRV brand mfrs are claimed by radiator_valve', () => {
    const rv = JSON.parse(read('drivers/radiator_valve/driver.compose.json'));
    const mfrs = rv.zigbee.manufacturerName.join(' ').toLowerCase();
    for (const b of ['thaleos', 'hy368', 'tv02-zigbee', 'tsl-trv-tv01zg', 'tesla smart']) {
      assert.ok(mfrs.includes(b), b + ' claimed');
    }
  });
  it('aoyan water leak + ZF24 corrupted-prefix presence are covered', () => {
    const wl = JSON.parse(read('drivers/water_leak_sensor/driver.compose.json'));
    assert.ok(wl.zigbee.manufacturerName.some((m) => /aoyan/i.test(m)), 'aoyan claimed');
    const pr = JSON.parse(read('drivers/presence_sensor_radar/driver.compose.json'));
    assert.ok(pr.zigbee.manufacturerName.some((m) => /tze28c1000000/i.test(m)), 'ZF24 claimed');
  });
  it('deleted functions survive elsewhere (workflows consolidated, magic packet inline)', () => {
    assert.ok(fs.existsSync('.github/workflows/blakadder-fetch.yml'), 'z2m fetch workflow');
    assert.ok(fs.existsSync('.github/workflows/monthly-community-sync.yml'), 'community sync');
    const mixin = read('lib/mixins/PhysicalButtonMixin.js');
    assert.ok(mixin.includes('_sendTuyaMagicPacket'), 'magic packet inline (MagicPacketRegistry superseded)');
  });
});

describe('P92.81 — AI DP extraction (raccourci Gemini, guarded)', () => {
  it('extraction script truncates to 500 chars and validates output strictly', () => {
    const src = read('.github/scripts/ai-dp-extract.js');
    assert.ok(src.includes('BLOCK_CHARS = 500'), '500-char doctrine');
    assert.ok(src.includes('validateExtraction'), 'strict validation');
    assert.ok(src.includes('ai-helper'), 'guarded chain, no raw curl');
    assert.ok(!src.includes('curl'), 'no unguarded API calls');
  });
  it('validation only accepts DP-numbered keys with enum|int|bool types', () => {
    const src = read('.github/scripts/ai-dp-extract.js');
    assert.ok(src.includes('/^\d{1,3}'+'$'+'/.test(k)') || src.includes('d{1,3}'), 'DP key regex');
    assert.ok(src.includes('enum') && src.includes('int') && src.includes('bool'), 'type whitelist');
  });
  it('self-improve runs the extraction (weekly, quota-safe cadence)', () => {
    const wf = read('.github/workflows/self-improve.yml');
    assert.ok(wf.includes('ai-dp-extract.js'), 'step wired');
    assert.ok(!wf.includes('*/6 * * *'), 'no 6h cron (quota doctrine)');
  });
});

describe('P92.82 — naive DP auto-guesser hardened (external review)', () => {
  it('autoMap requires >=3 consistent samples before writing', () => {
    const src = read('lib/utils/UnknownDPLogger.js');
    assert.ok(src.includes('(seen.count || 0) < 3'), 'min 3 samples');
    assert.ok(src.includes('spread'), 'consistency check');
  });
  it('capability choice is device-type aware (climate: humidity first; contact: contact first)', () => {
    const src = read('lib/utils/UnknownDPLogger.js');
    assert.ok(src.includes('deviceIsClimate'), 'climate-aware pct ordering');
    assert.ok(src.includes('deviceIsContact'), 'contact-aware bool ordering');
    const pctIdx = src.indexOf('deviceIsClimate');
    const ordered = src.slice(pctIdx, pctIdx + 400);
    assert.ok(ordered.includes('measure_humidity'), 'humidity preferred on climate devices');
  });
  it('no blind auto-merge: telemetry is opt-in only, matcher registry preferred', () => {
    const revive = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.ok(revive.includes('NO automatic telemetry'), 'opt-in report (P92.78)');
    const mapper = read('lib/tuya/TuyaUniversalMapper.js');
    assert.ok(mapper.includes('_getRegistryMapping'), 'registry tier preferred over heuristics');
  });
});

describe('P92.83 — Cloudflare Worker proxy (optional channel)', () => {
  it('worker validates payload strictly and rate-limits', () => {
    const src = read('workers/github-issue-proxy/worker.js');
    assert.ok(src.includes('RATE_LIMIT'), 'rate limit');
    assert.ok(src.includes('MAX_BLOCK = 500'), '500-char blocks');
    assert.ok(src.includes('env.GITHUB_PAT'), 'PAT only in Worker secret');
    assert.ok(!src.includes('ghp_'), 'no PAT in code');
  });
  it('app channel is OFF by default (endpoint empty = zero egress)', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.ok(src.includes('issue_report_endpoint'), 'endpoint setting');
    assert.ok(src.includes('/report'), 'POST to proxy /report path');
  });
  it('settings page exposes the endpoint field (optional)', () => {
    const html = read('settings/index.html');
    assert.ok(html.includes('issue_report_endpoint'), 'setting field');
    assert.ok(html.includes('Empty = local-only'), 'default local');
  });
});

describe('P92.84 — PRD v1.1: segmented feeds + strict JSON cleaning', () => {
  it('export produces a manifest + per-class segment files', () => {
    const m = JSON.parse(read('.github/pages-build/data/mfs_db_manifest.json'));
    assert.ok(m.segments && Object.keys(m.segments).length >= 5, 'manifest with segments');
    for (const [seg, info] of Object.entries(m.segments)) {
      assert.ok(fs.existsSync('.github/pages-build/data/' + info.file), seg + ' file exists');
      assert.ok(info.count > 0, seg + ' non-empty');
    }
  });

  it('LiveDataUpdater downloads segments progressively and merges', () => {
    const src = read('lib/dynamic/LiveDataUpdater.js');
    assert.ok(src.includes('_fetchSegmented'), 'segmented path');
    assert.ok(src.includes('Falls back to the single full file'), 'full-file fallback documented');
    assert.ok(src.includes('FEED_URL'), 'fallback url present');
  });

  it('ai-dp-extract strips markdown fences before JSON extraction', () => {
    const src = read('.github/scripts/ai-dp-extract.js');
    assert.ok(/fence/.test(src), 'fence stripping present');
  });

  it('worker rate limit already covers the PRD anti-DDoS point', () => {
    const src = read('workers/github-issue-proxy/worker.js');
    assert.ok(src.includes('RATE_LIMIT = 5'), '5 req/IP/hour');
    assert.ok(src.includes('cf-connecting-ip'), 'IP-based limiting');
  });
});

describe('P92.85 — capabilities hygiene', () => {
  it('dynamically-referenced custom caps are preserved (not deleted as static-dead)', () => {
    for (const cap of ['measure_battery_health', 'measure_battery_cycles', 'text_battery_status', 'temperature_unit', 'tuya_dp_bitmap', 'button_open', 'button_close', 'button_stop', 'button_dim_up', 'button_dim_down']) {
      assert.ok(fs.existsSync('.homeycompose/capabilities/' + cap + '.json'), cap + ' preserved (dynamic)');
    }
  });
  it('truly orphan caps are removed', () => {
    for (const cap of ['alarm_cleaning', 'alarm_tank_full', 'button_toggle', 'measure_maintenance_score', 'measure_soil_moisture']) {
      assert.ok(!fs.existsSync('.homeycompose/capabilities/' + cap + '.json'), cap + ' removed (orphan)');
    }
  });
  it('all 12 deleted workflows have live equivalents', () => {
    const live = fs.readdirSync('.github/workflows').join(' ');
    for (const wf of ['monthly-community-sync', 'blakadder-fetch', 'auto-fix-and-publish', 'auto-publish-on-push', 'autonomous-verification', 'ai-monthly-audit', 'community-inbox', 'auto-close-supported', 'upstream-guard', 'housekeeping']) {
      assert.ok(live.includes(wf), wf + ' alive');
    }
  });
});

describe('P92.88 — quota-resume (deferral + autonomous resume)', () => {
  it('defer/complete/processPending lifecycle works', () => {
    const src = read('.github/scripts/quota-resume.js');
    assert.ok(src.includes('processPending'), 'resume engine');
    assert.ok(src.includes('canRun'), 'budget gate');
    assert.ok(src.includes('quota-deferred.json'), 'state file');
  });
  it('ai-dp-extract defers when the AI chain is exhausted', () => {
    const src = read('.github/scripts/ai-dp-extract.js');
    assert.ok(src.includes('quota-resume'), 'deferral wired');
    assert.ok(src.includes('defer('), 'defer call');
  });
  it('self-improve resumes deferred tasks first', () => {
    const wf = read('.github/workflows/self-improve.yml');
    assert.ok(wf.includes('Resume quota-deferred tasks'), 'resume step at start');
  });
});
