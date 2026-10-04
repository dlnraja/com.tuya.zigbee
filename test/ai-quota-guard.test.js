'use strict';
/* eslint-env mocha */
const assert = require('assert');
const { isQuotaError, budgetAllows } = require('../.github/scripts/ai-helper.js');

describe('AI quota guard (R2/R13, user decision 2026-10-04)', () => {
  it('treats 429, 402 and quota/credit 403/400 as quota errors', () => {
    assert.strictEqual(isQuotaError(429, ''), true);
    assert.strictEqual(isQuotaError(402, ''), true);
    assert.strictEqual(isQuotaError(403, '{"error":"insufficient_quota"}'), true);
    assert.strictEqual(isQuotaError(400, 'credit balance too low'), true);
    assert.strictEqual(isQuotaError(403, 'forbidden'), false);
    assert.strictEqual(isQuotaError(500, 'quota'), false);
  });
  it('never allows paid/overage providers, even with AI_ALLOW_PAID=true', () => {
    const prev = process.env.AI_ALLOW_PAID;
    process.env.AI_ALLOW_PAID = 'true';
    try {
      assert.strictEqual(budgetAllows('openai'), false);
      assert.strictEqual(budgetAllows('deepseek'), false);
    } finally {
      if (prev === undefined) {delete process.env.AI_ALLOW_PAID;} else {process.env.AI_ALLOW_PAID = prev;}
    }
  });
});
