'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { enrich } = require('../../lib/diagnostics/DiagContentEnricher');

describe('DiagContentEnricher', () => {
  it('extracts log id and user message from Athom diag mail', () => {
    const text = 'Log ID: 0cea6870-69dd-4a98-abdd-e35273699e7d User Message: Contact sensors pulse stdout: [Driver:contact_sensor]';
    const r = enrich(text);
    assert.equal(r.logIdShort, '0cea6870');
    assert.match(r.userMessage, /Contact sensors pulse/i);
  });

  it('detects IAS object coerce signal', () => {
    const r = enrich('[IAS-ZONE] Zone status change: 0x[object Object]');
    assert.ok(r.signals.some((s) => s.id === 'ias_zone_object_coerce'));
  });

  it('pairs manufacturerName + modelId blocks', () => {
    const text = 'manufacturerName: _TZE284_6ocnqlhn modelId: TS0601';
    const r = enrich(text);
    assert.ok(r.couples.some((c) => c.mfr === '_TZE284_6ocnqlhn' && c.pid === 'TS0601'));
  });

  it('detects Athom socket hang up tip / developer tools signal', () => {
    const r = enrich('Build #15 v5.12.89 processing_failed stateMeta=socket hang up');
    assert.ok(r.signals.some((s) => s.id === 'athom_socket_hang'));
    assert.ok(r.signals.some((s) => s.id === 'athom_processing_failed'));
  });
});
