'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const {
  isMemoryPressure,
  trimMapCache,
  boundedHttpsTextGet,
  createNetworkBreaker,
} = require(path.join(ROOT, 'lib/utils/NetworkResilience'));

describe('NetworkResilience shared guards', () => {
  it('exports memory pressure helper', () => {
    assert.strictEqual(typeof isMemoryPressure, 'function');
    assert.strictEqual(typeof isMemoryPressure(), 'boolean');
  });

  it('trimMapCache enforces max entries', () => {
    const map = new Map();
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    trimMapCache(map, 2);
    assert.strictEqual(map.size, 2);
    assert.ok(!map.has('a'));
  });

  it('createNetworkBreaker opens after failures', async () => {
    const breaker = createNetworkBreaker('test-breaker', { failureThreshold: 2, resetTimeout: 60000 });
    await assert.rejects(() => breaker.exec(() => Promise.reject(new Error('fail'))));
    await assert.rejects(() => breaker.exec(() => Promise.reject(new Error('fail'))));
    await assert.rejects(() => breaker.exec(() => Promise.resolve('ok')), /OPEN/);
  });

  it('boundedHttpsTextGet rejects non-HTTPS URLs', async () => {
    await assert.rejects(
      () => boundedHttpsTextGet('http://example.com/x'),
      /Refusing non-HTTPS/
    );
  });

  it('createLocalCache trims to max entries', () => {
    const { createLocalCache } = require(path.join(ROOT, 'lib/utils/NetworkResilience'));
    const cache = createLocalCache(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    assert.strictEqual(cache.size, 2);
    assert.ok(!cache.has('a'));
  });
});

describe('NetworkResilience runtime integration contracts', () => {
  function read(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  }

  it('OTARepository uses bounded manifest download + cache trim', () => {
    const src = read('lib/ota/OTARepository.js');
    assert.match(src, /boundedHttpsTextGet/);
    assert.match(src, /MAX_MANIFEST_BYTES/);
    assert.match(src, /trimMapCache\(this\.cache/);
    assert.match(src, /isMemoryPressure\(\)/);
  });

  it('LiveDataUpdater and AutonomousEnricher share isMemoryPressure', () => {
    assert.match(read('lib/dynamic/LiveDataUpdater.js'), /NetworkResilience/);
    assert.match(read('lib/dynamic/AutonomousEnricher.js'), /NetworkResilience/);
  });

  it('smart-fetch uses circuit breaker per source', () => {
    const src = read('lib/scraper/smart-fetch.js');
    assert.match(src, /breakerForSource/);
    assert.match(src, /breaker\.exec\(\(\) => rawRequest/);
  });

  it('TuyaZigbeeDevice ENIGMA proxy uses circuit breaker', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.match(src, /getEnigmaReportBreaker/);
    assert.match(src, /MAX_RESPONSE = 65536/);
  });

  it('TuyaCloudMQTT uses NetworkResilience guards', () => {
    const src = read('lib/tuya-local/TuyaCloudMQTT.js');
    assert.match(src, /NetworkResilience/);
    assert.match(src, /MAX_MQTT_PAYLOAD_BYTES/);
    assert.match(src, /getMqttConnectBreaker/);
  });

  it('LocalFirstEngine callAI uses breaker + local cache', () => {
    const src = read('lib/LocalFirstEngine.js');
    assert.match(src, /createLocalCache\(32\)/);
    assert.match(src, /aiBreakerFor/);
    assert.match(src, /MAX_AI_RESPONSE_BYTES/);
  });

  it('FreeScrapeStack and reader-fallback use bounded HTTP + breaker', () => {
    assert.match(read('lib/scraper/FreeScrapeStack.js'), /boundedHttpRequest/);
    assert.match(read('lib/scraper/reader-fallback.js'), /boundedHttpRequest/);
    assert.match(read('lib/scraper/FreeScrapeStack.js'), /createNetworkBreaker\('FreeScrapeStack'/);
    assert.match(read('lib/scraper/reader-fallback.js'), /createNetworkBreaker\('ReaderFallback'/);
  });

  it('BaseUnifiedDevice onoff ZCL commands use safeSetCapabilityValue', () => {
    const src = read('lib/devices/BaseUnifiedDevice.js');
    assert.match(src, /safeSetCapabilityValue\(cap, state, \{ source: 'zcl' \}\)/);
    assert.match(src, /safeSetCapabilityValue\(cap, !current, \{ source: 'zcl' \}\)/);
  });
});
