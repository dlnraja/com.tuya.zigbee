'use strict';

/**
 * Tests — AI billing guard (v9.0.367)
 * Hard anti-billing enforcement in .github/scripts/ai-helper.js:
 *  - paid providers blocked unless AI_ALLOW_PAID=true
 *  - per-provider daily caps
 *  - global daily cap
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it, beforeEach } = testApi;

const STATE = path.join(__dirname, '..', '.github', 'state', 'ai-rate-state.json');
const { budgetAllows } = require('../.github/scripts/ai-helper');

function seed(dailyCounts) {
  const today = new Date().toISOString().slice(0, 10);
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify({ m: {}, d: dailyCounts, mt: 0, dd: today }));
}

describe('AI billing guard', () => {
  beforeEach(() => {
    delete process.env.AI_ALLOW_PAID;
    delete process.env.AI_GLOBAL_DAILY_CAP;
    delete process.env.AI_DAILY_CAP_DEEPSEEK;
    seed({});
  });

  it('blocks paid providers by default', () => {
    assert.strictEqual(budgetAllows('deepseek'), false);
    assert.strictEqual(budgetAllows('openai'), false);
  });

  it('allows paid providers only with explicit opt-in', () => {
    process.env.AI_ALLOW_PAID = 'true';
    assert.strictEqual(budgetAllows('deepseek'), true);
  });

  it('enforces per-provider daily caps', () => {
    seed({ gemini: 1400 });
    assert.strictEqual(budgetAllows('gemini'), false);
  });

  it('per-provider cap is env-overridable', () => {
    seed({ deepseek: 150 });
    process.env.AI_ALLOW_PAID = 'true';
    process.env.AI_DAILY_CAP_DEEPSEEK = '100';
    assert.strictEqual(budgetAllows('deepseek'), false);
  });

  it('enforces the global daily cap across providers', () => {
    seed({ gemini: 900, cerebras: 900, groq: 300 });
    process.env.AI_GLOBAL_DAILY_CAP = '2000';
    assert.strictEqual(budgetAllows('mistral'), false);
  });

  it('allows free providers under all caps', () => {
    seed({ gemini: 10 });
    assert.strictEqual(budgetAllows('gemini'), true);
  });
});
