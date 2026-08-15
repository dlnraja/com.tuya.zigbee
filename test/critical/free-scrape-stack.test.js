'use strict';

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { structuredExtract, SOURCE_TEMPLATES } = require('../../lib/scraper/FreeScrapeStack');

describe('FreeScrapeStack', () => {
  it('extracts sacred couples and diag UUIDs from free text', () => {
    const text = `
      Diagnostic code: f1e5b12d-5f69-4311-aaa7-b8bef967667c
      SOS with _TZE200_pay2byax TS0203 and water ZG-222Z
      Homey shows UNSUPPORTED_CLUSTER on dimmer
      https://community.homey.app/t/140352/2134
    `;
    const e = structuredExtract(text, { issues: ['UNSUPPORTED_CLUSTER', 'SOS'] });
    assert.ok(e.diagnosticCodes.includes('f1e5b12d-5f69-4311-aaa7-b8bef967667c'));
    assert.ok(e.manufacturers.some((m) => /pay2byax/i.test(m)));
    assert.ok(e.productIds.includes('TS0203') || e.productIds.includes('ZG-222Z'));
    // ProductIds must never leak into manufacturers (TS#### false positives)
    assert.ok(!e.manufacturers.some((m) => /^TS\d/i.test(m)));
    assert.ok(e.issues.includes('UNSUPPORTED_CLUSTER'));
    assert.ok(e.urls.some((u) => u.includes('140352')));
  });

  it('keeps _TZE28C* sacred mfrs out of productId bucket', () => {
    const e = structuredExtract('_TZE28C1000000_jtbgusdc TS0601 Avatto dimmer');
    assert.ok(e.manufacturers.some((m) => /jtbgusdc/i.test(m)));
    assert.ok(e.productIds.includes('TS0601'));
    assert.ok(!e.manufacturers.includes('TS0601'));
  });

  it('builds source template URLs', () => {
    assert.match(SOURCE_TEMPLATES.forumTopic(140352), /140352\.json$/);
    assert.match(SOURCE_TEMPLATES.z2mDevice('TS0215A'), /TS0215A/);
  });
});
