#!/usr/bin/env node
/**
 * test-smart-data-validator.js — Test suite for P57 SmartDataValidator
 */
'use strict';
const { SmartDataValidator } = require('../../lib/data/SmartDataValidator');
const { SmartCapability, installSmartCapMixin } = require('../../lib/data/SmartCapability');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✅', msg); }
  else { failed++; console.log('  ❌', msg); }
}
function assertClose(a, b, tol, msg) {
  if (Math.abs(a - b) < tol) { passed++; console.log('  ✅', msg + ` (${a.toFixed(2)} ≈ ${b})`); }
  else { failed++; console.log('  ❌', msg + ` (got ${a}, expected ${b}±${tol})`); }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runTests() {
  console.log('═══ SMART DATA VALIDATOR TEST SUITE (P57) ═══\n');

  // Test 1
  console.log('Test 1: Basic single source');
  {
    const v = new SmartDataValidator('test');
    v.addSource('a', { priority: 1, weight: 1.0 });
    v.record('a', 42);
    const d = v.commit();
    assert(d.value === 42, 'value = 42');
    assert(d.commit === true, 'commit = true');
    assert(d.sources.length === 1, '1 source');
    assert(d.confidence > 0.9, 'confidence > 0.9');
  }

  // Test 2
  console.log('\nTest 2: Two agreeing sources (weighted average)');
  {
    const v = new SmartDataValidator('test', { debounceMs: 0 });
    v.addSource('a', { priority: 1, weight: 0.6 });
    v.addSource('b', { priority: 2, weight: 0.4 });
    v.record('a', 70);
    v.record('b', 72);
    const d = v.commit();
    assertClose(d.value, 70.8, 0.2, 'weighted avg ~70.8');
    assert(d.sources.length === 2, '2 sources used');
    assert(d.agree === true, 'sources agree');
  }

  // Test 3
  console.log('\nTest 3: Disagreeing sources (majority vote)');
  {
    const v = new SmartDataValidator('test', { debounceMs: 0, method: 'majority' });
    v.addSource('a', { weight: 0.4 });
    v.addSource('b', { weight: 0.4 });
    v.addSource('c', { weight: 0.4 });
    v.record('a', 70);
    v.record('b', 71);
    v.record('c', 50);
    const d = v.commit();
    assert(d.value >= 70 && d.value <= 71, `value in [70,71] (got ${d.value})`);
    assert(d.sources.length === 2, '2 sources agree');
    assert(d.agree === true, 'agreement via majority');
  }

  // Test 4
  console.log('\nTest 4: Anti-flooding (debounce)');
  {
    const v = new SmartDataValidator('test', { debounceMs: 1000, hysteresisMs: 0 });
    v.addSource('a');
    v.record('a', 50);
    const d1 = v.commit();
    assert(d1.commit === true, 'first commit succeeds');
    v.record('a', 51);
    const d2 = v.commit();
    assert(d2.commit === false, 'second commit within debounce blocked');
    assert(d2.flooded === true, 'flagged as flooded');
    const d3 = v.commit(Date.now() + 1500);
    assert(d3.commit === true, 'commit after debounce window succeeds');
  }

  // Test 5
  console.log('\nTest 5: Hysteresis (no commit for same value)');
  {
    const v = new SmartDataValidator('test', { debounceMs: 0, hysteresisMs: 5000 });
    v.addSource('a');
    v.record('a', 50);
    const d1 = v.commit();
    assert(d1.commit === true, 'first commit succeeds');
    await sleep(50);
    v.record('a', 50);
    const d2 = v.commit();
    assert(d2.commit === false, 'same value within hysteresis blocked');
    assert(d2.deduped === true, 'flagged as deduped');
  }

  // Test 6
  console.log('\nTest 6: Stale source fallback');
  {
    const v = new SmartDataValidator('test', { debounceMs: 0, staleMs: 1000 });
    v.addSource('a', { priority: 1, weight: 0.5, ttl: 1000 });
    v.addSource('b', { priority: 2, weight: 0.5, ttl: 60000 });
    v.record('a', 42);
    v.record('b', 50);
    const d1 = v.commit();
    assertClose(d1.value, 46, 0.2, 'fresh: avg 46');
    await sleep(1100);
    v.record('b', 55);
    const d2 = v.commit();
    assert(d2.value === 55, 'only fresh source used: 55');
    assert(d2.sources.length === 1, '1 source (b only)');
  }

  // Test 7
  console.log('\nTest 7: Source failure (fallback to next source)');
  {
    const v = new SmartDataValidator('test', { debounceMs: 0 });
    v.addSource('a', { priority: 1, weight: 0.6 });
    v.addSource('b', { priority: 2, weight: 0.4 });
    v.record('a', 100);
    v.record('b', 110);
    v.markFailed('a', 'timeout');
    const d = v.commit();
    assert(d.value === 110, 'fallback to b: 110');
    assert(d.sources.length === 1, 'only 1 source (a failed)');
  }

  // Test 8
  console.log('\nTest 8: All sources failed → last known good');
  {
    const v = new SmartDataValidator('test', { debounceMs: 0, staleMs: 100 });
    v.addSource('a');
    v.addSource('b');
    v.record('a', 75);
    v.record('b', 78);
    const d1 = v.commit();
    assertClose(d1.value, 76.5, 0.5, 'avg ~76.5');
    v.markFailed('a');
    v.markFailed('b');
    await sleep(150);
    const d2 = v.commit();
    assert(d2.value === 75 || d2.value === 78, `lastKnown=${d2.value}`);
    assert(d2.sources.length === 0, 'no fresh sources');
  }

  // Test 9
  console.log('\nTest 9: Low confidence blocks commit');
  {
    const v = new SmartDataValidator('test', { debounceMs: 0, minConfidence: 0.7 });
    v.addSource('a');
    v.record('a', 50, Date.now(), 0.4);
    const d = v.commit();
    assert(d.commit === false, 'low confidence blocks commit');
    assert(d.reason === 'low-confidence', 'reason = low-confidence');
    v.record('a', 51, Date.now(), 0.9);
    const d2 = v.commit();
    assert(d2.commit === true, 'high confidence commits');
  }

  // Test 10
  console.log('\nTest 10: Different aggregation methods');
  {
    const v1 = new SmartDataValidator('t1', { debounceMs: 0, method: 'weighted' });
    v1.addSource('a', { weight: 0.5 });
    v1.addSource('b', { weight: 0.5 });
    v1.record('a', 100);
    v1.record('b', 50);
    assertClose(v1.commit().value, 75, 0.5, 'weighted: 75');

    const v2 = new SmartDataValidator('t2', { debounceMs: 0, method: 'majority' });
    v2.addSource('a', { weight: 0.5 });
    v2.addSource('b', { weight: 0.5 });
    v2.addSource('c', { weight: 0.5 });
    v2.record('a', 100);
    v2.record('b', 100);
    v2.record('c', 50);
    assert(v2.commit().value === 100, 'majority: 100 (2 vs 1)');

    const v3 = new SmartDataValidator('t3', { debounceMs: 0, method: 'highest-confidence' });
    v3.addSource('a', { weight: 0.5 });
    v3.addSource('b', { weight: 0.5 });
    v3.record('a', 100, Date.now(), 0.3);
    v3.record('b', 50, Date.now(), 0.9);
    assert(v3.commit().value === 50, 'highest-confidence: 50');
  }

  // Test 11
  console.log('\nTest 11: Identical value within hysteresis dropped');
  {
    const v = new SmartDataValidator('test', { debounceMs: 0, hysteresisMs: 60000 });
    v.addSource('a');
    v.record('a', 42);
    const d1 = v.commit();
    assert(d1.commit === true, 'first commit OK');
    await sleep(50);
    v.record('a', 42);
    const d2 = v.commit();
    assert(d2.commit === false, 'identical value within hysteresis blocked');
    assert(d2.deduped === true, 'flagged as deduped');
  }

  // Test 12
  console.log('\nTest 12: Real-world battery scenario (5 sources)');
  {
    const v = new SmartDataValidator('measure_battery', { debounceMs: 0, hysteresisMs: 5000, agreeTolerance: 0.05 });
    v.addSource('zcl', { priority: 1, weight: 0.4, ttl: 60000 });
    v.addSource('tuya-dp', { priority: 2, weight: 0.3, ttl: 30000 });
    v.addSource('voltage-curve', { priority: 3, weight: 0.2, ttl: 30000 });
    v.addSource('stored', { priority: 8, weight: 0.05, ttl: 86400000 });
    v.addSource('last-known', { priority: 9, weight: 0.05, ttl: 604800000 });
    v.record('zcl', 72, Date.now(), 0.95);
    v.record('tuya-dp', 70, Date.now(), 0.85);
    v.record('voltage-curve', 71, Date.now(), 0.7);
    const d = v.commit();
    assertClose(d.value, 71.2, 0.5, 'weighted ~71.2');
    assert(d.sources.length === 3, '3 sources used');
    assert(d.agree === true, 'sources within 5%');
  }

  // Test 13
  console.log('\nTest 13: Stats tracking');
  {
    const v = new SmartDataValidator('test', { debounceMs: 0, hysteresisMs: 100 });
    v.addSource('a');
    v.record('a', 50);
    v.commit();
    v.record('a', 50);
    v.commit();
    v.record('a', 51);
    v.commit();
    const s = v.getStats();
    assert(s.records === 3, '3 records');
    assert(s.commits === 2, '2 commits');
    assert(s.deduped === 1, '1 deduped');
  }

  // Test 14: SmartCapability high-level wrapper
  console.log('\nTest 14: SmartCapability high-level wrapper');
  {
    const cap = new SmartCapability('test', {
      sources: { a: { priority: 1, weight: 0.5 } },
      debounceMs: 0, hysteresisMs: 0,
    });
    const d = cap.update(null, 'a', 42);
    assert(d.commit === true, 'update returns commit decision');
    assert(d.value === 42, 'value = 42');
  }

  // Test 15: SmartCapability.updateMulti
  console.log('\nTest 15: SmartCapability.updateMulti (record multiple sources at once)');
  {
    const cap = new SmartCapability('test', {
      sources: {
        a: { priority: 1, weight: 0.6 },
        b: { priority: 2, weight: 0.4 },
      },
      debounceMs: 0, hysteresisMs: 0,
    });
    const d = cap.updateMulti(null, { a: { value: 70, confidence: 0.9 }, b: { value: 72, confidence: 0.85 } });
    assertClose(d.value, 70.8, 0.3, 'multi-source update: ~70.8');
    assert(d.sources.length === 2, '2 sources used');
  }

  // Test 16: SmartCapability mixin
  console.log('\nTest 16: SmartCapability mixin on a fake device class');
  {
    class FakeDevice {}
    installSmartCapMixin(FakeDevice);
    const dev = new FakeDevice();
    const cap = dev.smartCap('measure_temperature', {
      sources: { zcl: { priority: 1, weight: 0.5 } },
      debounceMs: 0, hysteresisMs: 0,
    });
    assert(cap instanceof SmartCapability, 'smartCap returns SmartCapability instance');
    cap.record('zcl', 22);
    const d = cap.commit();
    assert(d.value === 22, 'value 22 via mixin');
    // Test that second call to smartCap returns the same instance
    const cap2 = dev.smartCap('measure_temperature');
    assert(cap2 === cap, 'smartCap returns same instance on 2nd call');
  }

  // Test 17: SmartCapability high-level update() with device mock
  console.log('\nTest 17: SmartCapability.update with device mock');
  {
    const cap = new SmartCapability('measure_battery', {
      sources: { zcl: { priority: 1, weight: 0.5 } },
      debounceMs: 0, hysteresisMs: 0,
    });
    const updates = [];
    const fakeDevice = {
      setCapabilityValue: (cap, val) => updates.push({ cap, val }),
    };
    cap.update(fakeDevice, 'zcl', 72);
    assert(updates.length === 1, '1 setCapabilityValue call');
    assert(updates[0].cap === 'measure_battery', 'capability = measure_battery');
    assert(updates[0].val === 72, 'value = 72');
  }

  console.log('\n═══ RESULTS ═══');
  console.log('  Passed:', passed);
  console.log('  Failed:', failed);
  console.log('  Total: ', passed + failed);
  if (failed > 0) {
    console.log('\n❌', failed, 'test(s) FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed');
    process.exit(0);
  }
}

runTests().catch(e => { console.error('FATAL:', e); process.exit(1); });
