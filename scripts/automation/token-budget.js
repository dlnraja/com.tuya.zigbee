#!/usr/bin/env node
/**
 * Token Budget Tracker
 * --------------------
 * Estimates remaining token budgets across all AI providers based on:
 *   - Free tier daily limits (Google Gemini: 1400/day, NVIDIA NIM: 800/day, etc.)
 *   - Per-minute rate limits
 *   - Paid tier budgets (OpenAI: $10/mo, DeepSeek: pay-per-use)
 *   - Historical usage counters from ai-rate-state.json
 *
 * Returns the recommended provider based on remaining budget, and warns
 * when approaching limits.
 *
 * Usage:
 *   const { getRecommendedProvider, getTokenBudgetReport, checkBudgetHealth } = require('./token-budget');
 *   const best = getRecommendedProvider('code');      // best provider for code tasks
 *   const report = getTokenBudgetReport();             // full budget report
 *   const health = checkBudgetHealth();                // warnings if near limits
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 1. Provider budget definitions
// ---------------------------------------------------------------------------
// dailyRequests: max free-tier requests per day
// perMinute: max requests per minute (sustained)
// tokensPerRequest: estimated tokens consumed per request (output + input avg)
// costPer1kTokens: for paid providers ($/1k tokens, 0 for free)
// monthlyBudgetUSD: cap for paid providers (null = pay-per-use, no cap)
// tier: 'free' | 'freemium' | 'paid'
const BUDGETS = {
  openrouter: {
    dailyRequests: 500, perMinute: 30, tokensPerRequest: 2000,
    costPer1kTokens: 0, monthlyBudgetUSD: null, tier: 'free',
    description: 'OpenRouter aggregator (free models only)',
  },
  'xiaomi-mimo': {
    dailyRequests: 200, perMinute: 20, tokensPerRequest: 3000,
    costPer1kTokens: 0, monthlyBudgetUSD: null, tier: 'free',
    description: 'XiaomiMiMo v2.5 Pro/Lite (driver generation, DP mapping)',
  },
  huggingface: {
    dailyRequests: 500, perMinute: 20, tokensPerRequest: 2500,
    costPer1kTokens: 0, monthlyBudgetUSD: null, tier: 'free',
    description: 'HuggingFace Inference API (dynamic model routing)',
  },
  cerebras: {
    dailyRequests: 100, perMinute: 15, tokensPerRequest: 2000,
    costPer1kTokens: 0, monthlyBudgetUSD: null, tier: 'free',
    description: 'Cerebras fast inference (Llama 3.3 70B)',
  },
  together: {
    dailyRequests: 200, perMinute: 20, tokensPerRequest: 2500,
    costPer1kTokens: 0, monthlyBudgetUSD: null, tier: 'free',
    description: 'Together.ai (Llama 3.3 70B free tier)',
  },
  groq: {
    dailyRequests: 500, perMinute: 30, tokensPerRequest: 2000,
    costPer1kTokens: 0, monthlyBudgetUSD: null, tier: 'free',
    description: 'Groq fast inference (Llama 3.3 70B)',
  },
  deepseek: {
    dailyRequests: 100, perMinute: 10, tokensPerRequest: 3000,
    costPer1kTokens: 0.0014, monthlyBudgetUSD: 10, tier: 'paid',
    description: 'DeepSeek Chat/Reasoner (pay-per-use)',
  },
  gemini: {
    dailyRequests: 1400, perMinute: 60, tokensPerRequest: 2000,
    costPer1kTokens: 0, monthlyBudgetUSD: null, tier: 'free',
    description: 'Google Gemini 2.0 Flash (free tier)',
  },
  'github-models': {
    dailyRequests: 100, perMinute: 10, tokensPerRequest: 2000,
    costPer1kTokens: 0, monthlyBudgetUSD: null, tier: 'free',
    description: 'GitHub Models via Azure (gpt-4o-mini)',
  },
  openai: {
    dailyRequests: 50, perMinute: 3, tokensPerRequest: 1500,
    costPer1kTokens: 0.0005, monthlyBudgetUSD: 10, tier: 'paid',
    description: 'OpenAI GPT-3.5-turbo (minimize usage)',
  },
  mistral: {
    dailyRequests: 30, perMinute: 5, tokensPerRequest: 2000,
    costPer1kTokens: 0, monthlyBudgetUSD: null, tier: 'freemium',
    description: 'Mistral Open Nemo (free tier)',
  },
  kimi: {
    dailyRequests: 50, perMinute: 5, tokensPerRequest: 2000,
    costPer1kTokens: 0, monthlyBudgetUSD: null, tier: 'freemium',
    description: 'Kimi Moonshot v1 8k',
  },
};

// Task-type affinity scores (0 = bad fit, 3 = ideal)
const TASK_AFFINITY = {
  openrouter:    { code: 1, analyze: 1, classify: 2, merge: 2, lookup: 2, generate: 1 },
  'xiaomi-mimo': { code: 3, analyze: 3, classify: 2, merge: 2, lookup: 2, generate: 3 },
  huggingface:   { code: 3, analyze: 2, classify: 2, merge: 2, lookup: 1, generate: 2 },
  cerebras:      { code: 2, analyze: 3, classify: 2, merge: 3, lookup: 1, generate: 2 },
  together:      { code: 2, analyze: 2, classify: 2, merge: 2, lookup: 1, generate: 3 },
  groq:          { code: 2, analyze: 3, classify: 2, merge: 2, lookup: 1, generate: 3 },
  deepseek:      { code: 3, analyze: 3, classify: 2, merge: 3, lookup: 2, generate: 3 },
  gemini:        { code: 3, analyze: 3, classify: 3, merge: 3, lookup: 3, generate: 3 },
  'github-models': { code: 3, analyze: 2, classify: 3, merge: 2, lookup: 2, generate: 3 },
  openai:        { code: 2, analyze: 2, classify: 2, merge: 2, lookup: 2, generate: 2 },
  mistral:       { code: 2, analyze: 2, classify: 3, merge: 2, lookup: 2, generate: 2 },
  kimi:          { code: 1, analyze: 2, classify: 2, merge: 2, lookup: 1, generate: 2 },
};

// ---------------------------------------------------------------------------
// 2. State loading
// ---------------------------------------------------------------------------
const STATE_FILE = path.join(__dirname, '..', '..', '.github', 'state', 'ai-rate-state.json');

function _loadDailyCounts() {
  try {
    const j = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const today = new Date().toISOString().slice(0, 10);
    if (j.dd === today) return j.d || {};
  } catch { /* ignore */ }
  return {};
}

function _loadMonthlyCounts() {
  const monthDir = path.join(__dirname, '..', '..', '.github', 'state', 'ai-monthly-state.json');
  try {
    return JSON.parse(fs.readFileSync(monthDir, 'utf8'));
  } catch { /* ignore */ }
  return {};
}

// ---------------------------------------------------------------------------
// 3. Budget calculations
// ---------------------------------------------------------------------------
function getRemainingDaily(providerName) {
  const budget = BUDGETS[providerName];
  if (!budget) return null;
  const daily = _loadDailyCounts();
  const used = daily[providerName] || 0;
  return {
    provider: providerName,
    tier: budget.tier,
    dailyUsed: used,
    dailyLimit: budget.dailyRequests,
    dailyRemaining: Math.max(0, budget.dailyRequests - used),
    dailyUtilizationPercent: Math.round((used / budget.dailyRequests) * 100),
    estimatedTokensUsed: used * budget.tokensPerRequest,
    estimatedTokensRemaining: Math.max(0, (budget.dailyRequests - used) * budget.tokensPerRequest),
  };
}

function _estimateDailyCostUSD(providerName) {
  const budget = BUDGETS[providerName];
  if (!budget || budget.costPer1kTokens === 0) return 0;
  const daily = _loadDailyCounts();
  const used = daily[providerName] || 0;
  return (used * budget.tokensPerRequest / 1000) * budget.costPer1kTokens;
}

function _isAvailable(providerName) {
  const budget = BUDGETS[providerName];
  if (!budget) return false;

  // Check env key
  let key;
  if (providerName === 'github-models') {
    key = process.env.GH_PAT || process.env.GITHUB_TOKEN;
  } else {
    const envMap = {
      openrouter: 'OPENROUTER_API_KEY', 'xiaomi-mimo': 'XIAOMI_MIMO_API_KEY',
      huggingface: 'HF_TOKEN', cerebras: 'CEREBRAS_API_KEY', together: 'TOGETHER_API_KEY',
      groq: 'GROQ_API_KEY', deepseek: 'DEEPSEEK_API_KEY', gemini: 'GOOGLE_API_KEY',
      openai: 'OPENAI_API_KEY', mistral: 'MISTRAL_API_KEY', kimi: 'KIMI_API_KEY',
    };
    key = process.env[envMap[providerName]];
  }
  if (!key) return false;

  // Check daily cap
  const remaining = getRemainingDaily(providerName);
  if (remaining.dailyRemaining <= 0) return false;

  return true;
}

// ---------------------------------------------------------------------------
// 4. Recommendation engine
// ---------------------------------------------------------------------------
function getRecommendedProvider(taskType = 'default', opts = {}) {
  const scores = [];

  for (const [name, budget] of Object.entries(BUDGETS)) {
    if (!_isAvailable(name)) continue;

    const remaining = getRemainingDaily(name);
    const affinity = (TASK_AFFINITY[name] && TASK_AFFINITY[name][taskType]) || 1;

    // Composite score: affinity * (1 - utilization) * weight
    const utilizationPenalty = 1 - (remaining.dailyUtilizationPercent / 100);
    const costPenalty = budget.costPer1kTokens > 0 ? 0.7 : 1.0; // prefer free
    const score = affinity * utilizationPenalty * costPenalty;

    scores.push({
      provider: name,
      score: Math.round(score * 100) / 100,
      affinity,
      remaining: remaining.dailyRemaining,
      utilizationPercent: remaining.dailyUtilizationPercent,
      tier: budget.tier,
    });
  }

  scores.sort((a, b) => b.score - a.score);

  if (opts.topN) return scores.slice(0, opts.topN);
  return scores[0] || null;
}

// ---------------------------------------------------------------------------
// 5. Health check & warnings
// ---------------------------------------------------------------------------
function checkBudgetHealth() {
  const warnings = [];
  const critical = [];

  for (const [name, budget] of Object.entries(BUDGETS)) {
    if (!_isAvailable(name)) continue;

    const remaining = getRemainingDaily(name);

    // Warning at 80% usage
    if (remaining.dailyUtilizationPercent >= 80) {
      warnings.push({
        provider: name,
        level: remaining.dailyUtilizationPercent >= 95 ? 'critical' : 'warning',
        message: `${name}: ${remaining.dailyUtilizationPercent}% daily budget used (${remaining.dailyRemaining} remaining)`,
        remaining: remaining.dailyRemaining,
      });
    }

    // Cost warning for paid providers
    const dailyCost = _estimateDailyCostUSD(name);
    if (budget.monthlyBudgetUSD && dailyCost > 0) {
      const projectedMonthly = dailyCost * 30;
      if (projectedMonthly > budget.monthlyBudgetUSD * 0.8) {
        warnings.push({
          provider: name,
          level: projectedMonthly > budget.monthlyBudgetUSD ? 'critical' : 'warning',
          message: `${name}: projected monthly cost $${projectedMonthly.toFixed(2)} exceeds budget $${budget.monthlyBudgetUSD}`,
          projectedMonthly,
        });
      }
    }
  }

  critical.push(...warnings.filter(w => w.level === 'critical'));
  const nonCritical = warnings.filter(w => w.level === 'warning');

  return { warnings: nonCritical, critical, healthy: critical.length === 0 };
}

// ---------------------------------------------------------------------------
// 6. Full report
// ---------------------------------------------------------------------------
function getTokenBudgetReport() {
  const daily = _loadDailyCounts();
  const report = { providers: {}, summary: {}, health: checkBudgetHealth() };

  let totalDailyTokens = 0;
  let totalDailyCost = 0;
  let availableCount = 0;

  for (const [name, budget] of Object.entries(BUDGETS)) {
    const remaining = getRemainingDaily(name);
    const available = _isAvailable(name);
    const cost = _estimateDailyCostUSD(name);

    report.providers[name] = {
      ...remaining,
      available,
      costPer1kTokens: budget.costPer1kTokens,
      estimatedDailyCostUSD: cost,
      monthlyBudgetUSD: budget.monthlyBudgetUSD,
      description: budget.description,
      recommended: getRecommendedProvider('default')?.provider === name,
    };

    if (available) availableCount++;
    totalDailyTokens += remaining.estimatedTokensUsed;
    totalDailyCost += cost;
  }

  report.summary = {
    totalProviders: Object.keys(BUDGETS).length,
    availableProviders: availableCount,
    totalDailyTokenEstimate: totalDailyTokens,
    totalEstimatedDailyCostUSD: totalDailyCost,
    estimatedMonthlyCostUSD: totalDailyCost * 30,
  };

  return report;
}

// ---------------------------------------------------------------------------
// 7. CLI interface
// ---------------------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'report';

  if (cmd === 'report') {
    const report = getTokenBudgetReport();
    console.log('\n=== Token Budget Report ===\n');
    console.log(`Providers: ${report.summary.availableProviders}/${report.summary.totalProviders} available`);
    console.log(`Est. daily tokens: ${report.summary.totalDailyTokenEstimate.toLocaleString()}`);
    console.log(`Est. daily cost: $${report.summary.totalEstimatedDailyCostUSD.toFixed(4)}`);
    console.log(`Est. monthly cost: $${report.summary.estimatedMonthlyCostUSD.toFixed(2)}\n`);

    console.log('Provider          | Tier     | Daily Use   | Remaining | Util%  | Cost/day  | Recommended');
    console.log('------------------|----------|-------------|-----------|--------|-----------|------------');
    for (const [name, p] of Object.entries(report.providers)) {
      const use = `${p.dailyUsed}/${p.dailyLimit}`;
      const rec = p.recommended ? '  <-- BEST' : '';
      console.log(`${name.padEnd(18)}| ${p.tier.padEnd(9)}| ${use.padEnd(12)}| ${String(p.dailyRemaining).padEnd(10)}| ${(p.dailyUtilizationPercent + '%').padEnd(7)}| $${p.estimatedDailyCostUSD.toFixed(4).padEnd(9)}|${rec}`);
    }

    if (report.health.critical.length > 0) {
      console.log('\n!!! CRITICAL WARNINGS:');
      for (const w of report.health.critical) console.log(`  - ${w.message}`);
    }
    if (report.health.warnings.length > 0) {
      console.log('\nWarnings:');
      for (const w of report.health.warnings) console.log(`  - ${w.message}`);
    }
  } else if (cmd === 'recommend') {
    const taskType = args[1] || 'default';
    const rec = getRecommendedProvider(taskType);
    if (rec) {
      console.log(`\nBest provider for "${taskType}": ${rec.provider}`);
      console.log(`  Score: ${rec.score} | Affinity: ${rec.affinity} | Remaining: ${rec.remaining} | Tier: ${rec.tier}`);
    } else {
      console.log('\nNo providers available.');
    }
  } else if (cmd === 'health') {
    const health = checkBudgetHealth();
    if (health.healthy) {
      console.log('\nAll provider budgets healthy.');
    } else {
      if (health.critical.length > 0) {
        console.log('\nCRITICAL:');
        for (const w of health.critical) console.log(`  - ${w.message}`);
      }
      if (health.warnings.length > 0) {
        console.log('\nWARNINGS:');
        for (const w of health.warnings) console.log(`  - ${w.message}`);
      }
    }
  } else {
    console.log('Usage: node token-budget.js [report|recommend [taskType]|health]');
  }
}

module.exports = {
  getTokenBudgetReport,
  getRecommendedProvider,
  getRemainingDaily,
  checkBudgetHealth,
  BUDGETS,
  TASK_AFFINITY,
};
