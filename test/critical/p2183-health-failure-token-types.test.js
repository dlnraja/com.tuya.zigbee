'use strict';
// Homey `app validate --level publish` warns when flow tokens omit `type`
// (master Auto-Publish 45075364135 refused to upload v9.0.1638 for that reason).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');

describe('P2183 health_failure_predicted token types', () => {
  it('declares type string on status and failure_type', () => {
    const json = JSON.parse(fs.readFileSync(
      path.join(ROOT, '.homeycompose/flow/triggers/health_failure_predicted.json'),
      'utf8'
    ));
    for (const name of ['status', 'failure_type']) {
      const token = (json.tokens || []).find((t) => t && t.name === name);
      assert.ok(token, name);
      assert.strictEqual(token.type, 'string', name);
    }
  });
});
