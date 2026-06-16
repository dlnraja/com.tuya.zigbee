#!/usr/bin/env node
/**
 * Intelligent API Key Manager
 * --------------------------
 * Centralized cascade system with fallback, usage tracking, and rate-limit awareness.
 *
 * Reads available API keys from environment, implements a weighted cascade with
 * circuit breaker logic, tracks usage per key (in-memory + persistent), respects
 * per-provider rate limits, logs which provider served each request, and falls
 * back to the next provider on failure.
 *
 * Usage:
 *   const { callWithCascade, getProviderStatus } = require('./api-key-manager');
 *   const result = await callWithCascade({ text, systemPrompt, maxTokens: 2048 });
 *   console.log(getProviderStatus());
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 1. Provider registry - ordered by priority (cascade order)
// ---------------------------------------------------------------------------
const PROVIDERS = {
  'openrouter': {
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    models: { default: 'meta-llama/llama-3.3-8b-instruct:free', code: 'qwen/qwen-2.5-coder-32b-instruct:free', analyze: 'google/gemini-2.0-flash-lite-preview-02-05:free' },
    dailyLimit: 500,
    perMinuteLimit: 30,
    priority: 1,
    category: 'aggregator',
  },
  'xiaomi-mimo': {
    envKey: 'XIAOMI_MIMO_API_KEY',
    baseUrl: 'https://token-plan-ams.xiaomimimo.com/v1/chat/completions',
    models: { default: 'mimo-v2.5-lite', code: 'mimo-v2.5-pro', analyze: 'mimo-v2.5-pro' },
    dailyLimit: 200,
    perMinuteLimit: 20,
    priority: 2,
    category: 'specialized',
  },
  'huggingface': {
    envKey: 'HF_TOKEN',
    baseUrl: 'https://router.huggingface.co/v1/chat/completions',
    models: { default: 'meta-llama/Llama-3.1-8B-Instruct', code: 'Qwen/Qwen2.5-Coder-32B-Instruct', analyze: 'ibm-granite/granite-3.3-8b-instruct', high: 'Qwen/Qwen2.5-72B-Instruct' },
    dailyLimit: 500,
    perMinuteLimit: 20,
    priority: 3,
    category: 'aggregator',
  },
  'cerebras': {
    envKey: 'CEREBRAS_API_KEY',
    baseUrl: 'https://api.cerebras.ai/v1/chat/completions',
    models: { default: 'llama-3.3-70b' },
    dailyLimit: 100,
    perMinuteLimit: 15,
    priority: 4,
    category: 'fast-inference',
  },
  'together': {
    envKey: 'TOGETHER_API_KEY',
    baseUrl: 'https://api.together.xyz/v1/chat/completions',
    models: { default: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free' },
    dailyLimit: 200,
    perMinuteLimit: 20,
    priority: 5,
    category: 'inference',
  },
  'groq': {
    envKey: 'GROQ_API_KEY',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    models: { default: 'llama-3.3-70b-versatile' },
    dailyLimit: 500,
    perMinuteLimit: 30,
    priority: 6,
    category: 'fast-inference',
  },
  'deepseek': {
    envKey: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    models: { default: 'deepseek-chat', high: 'deepseek-reasoner' },
    dailyLimit: 100,
    perMinuteLimit: 10,
    priority: 7,
    category: 'reasoning',
  },
  'gemini': {
    envKey: 'GOOGLE_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
    models: { default: 'gemini-2.0-flash' },
    dailyLimit: 1400,
    perMinuteLimit: 60,
    priority: 8,
    category: 'multimodal',
    custom: true, // Gemini uses different API format
  },
  'github-models': {
    envKey: '_GH',  // special: uses GH_PAT or GITHUB_TOKEN
    baseUrl: 'https://models.inference.ai.azure.com/chat/completions',
    models: { default: 'gpt-4o-mini' },
    dailyLimit: 100,
    perMinuteLimit: 10,
    priority: 9,
    category: 'fallback',
  },
  'openai': {
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    models: { default: 'gpt-3.5-turbo' },
    dailyLimit: 50,
    perMinuteLimit: 3,
    priority: 10,
    category: 'premium',
  },
  'mistral': {
    envKey: 'MISTRAL_API_KEY',
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    models: { default: 'open-mistral-nemo' },
    dailyLimit: 30,
    perMinuteLimit: 5,
    priority: 11,
    category: 'premium',
  },
  'kimi': {
    envKey: 'KIMI_API_KEY',
    baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
    models: { default: 'moonshot-v1-8k' },
    dailyLimit: 50,
    perMinuteLimit: 5,
    priority: 12,
    category: 'specialized',
  },
};

// ---------------------------------------------------------------------------
// 2. Circuit breaker & usage tracking
// ---------------------------------------------------------------------------
const _circuitBreakers = {};  // { providerName: { openAt, cooldownMs } }
const _usage = {};            // { providerName: { minuteCount, minuteStart, dailyCount } }

const STATE_FILE = path.join(__dirname, '..', '..', '.github', 'state', 'ai-rate-state.json');

function _loadState() {
  try {
    const j = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const today = new Date().toISOString().slice(0, 10);
    if (j.dd === today) return j.d || {};
  } catch { /* ignore */ }
  return {};
}

function _saveState(dailyCounts) {
  try {
    const state = { m: {}, d: dailyCounts, mt: Date.now(), dd: new Date().toISOString().slice(0, 10) };
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch { /* ignore */ }
}

function _getCircuitState(name) {
  const cb = _circuitBreakers[name];
  if (!cb) return 'closed';
  if (Date.now() - cb.openAt > cb.cooldownMs) {
    delete _circuitBreakers[name];
    return 'closed';
  }
  return 'open';
}

function _tripCircuit(name, cooldownMs = 300000) {
  _circuitBreakers[name] = { openAt: Date.now(), cooldownMs };
}

function _trackUsage(name) {
  const now = Date.now();
  const u = _usage[name] || { minuteCount: 0, minuteStart: now, dailyCount: 0 };

  // Reset minute counter if >60s since last
  if (now - u.minuteStart > 60000) {
    u.minuteCount = 0;
    u.minuteStart = now;
  }
  u.minuteCount++;
  u.dailyCount++;
  _usage[name] = u;

  // Persist daily counts
  const daily = _loadState();
  daily[name] = (daily[name] || 0) + 1;
  _saveState(daily);
}

function _isWithinLimits(name) {
  const provider = PROVIDERS[name];
  if (!provider) return false;

  // Check circuit breaker
  if (_getCircuitState(name) === 'open') return false;

  // Check daily limit
  const daily = _loadState();
  if ((daily[name] || 0) >= provider.dailyLimit) return false;

  // Check per-minute limit
  const u = _usage[name];
  if (u) {
    const elapsed = Date.now() - u.minuteStart;
    const currentMinuteCount = elapsed > 60000 ? 0 : u.minuteCount;
    if (currentMinuteCount >= provider.perMinuteLimit) return false;
  }

  // Check env key exists
  const key = _getApiKey(name);
  if (!key) return false;

  return true;
}

function _getApiKey(name) {
  const provider = PROVIDERS[name];
  if (!provider) return null;
  if (provider.envKey === '_GH') return process.env.GH_PAT || process.env.GITHUB_TOKEN || null;
  return process.env[provider.envKey] || null;
}

function _getModel(name, taskType = 'default') {
  const provider = PROVIDERS[name];
  if (!provider) return null;
  return provider.models[taskType] || provider.models.default;
}

// ---------------------------------------------------------------------------
// 3. Fetch with timeout & backoff
// ---------------------------------------------------------------------------
function _fetchTimeout(url, opts, timeoutMs = 30000) {
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), timeoutMs);
  opts = { ...opts, signal: ac.signal };
  return fetch(url, opts).finally(() => clearTimeout(tid));
}

function _backoff(attempt) {
  return Math.min(2000 * Math.pow(2, attempt) + Math.random() * 1000, 60000);
}

// ---------------------------------------------------------------------------
// 4. Task classification
// ---------------------------------------------------------------------------
function classifyTask(text, sysPrompt) {
  const combined = ((text || '') + ' ' + (sysPrompt || '')).toLowerCase();
  let type = 'default';
  if (/write.*code|implement|device\.js|driver/i.test(combined)) type = 'code';
  else if (/classify|triage|categorize/i.test(combined)) type = 'classify';
  else if (/merge|synthesize|combine/i.test(combined)) type = 'merge';
  else if (/analyze|investigate|debug|diagnose/i.test(combined)) type = 'analyze';
  else if (/fingerprint|lookup|find.*driver/i.test(combined)) type = 'lookup';
  return type;
}

// ---------------------------------------------------------------------------
// 5. Single-provider call
// ---------------------------------------------------------------------------
async function _callProvider(name, { text, systemPrompt, maxTokens = 2048, timeout = 30000 }) {
  const apiKey = _getApiKey(name);
  const provider = PROVIDERS[name];
  if (!apiKey || !provider) return null;

  const model = _getModel(name, classifyTask(text, systemPrompt));
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ];

  // Gemini uses a different API format
  if (provider.custom) {
    const url = provider.baseUrl + model + ':generateContent?key=' + apiKey;
    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
    };
    const r = await _fetchTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, timeout);
    if (r.ok) {
      const d = await r.json();
      const t = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (t) {
        _trackUsage(name);
        return { text: t, model: name + '/' + model, provider: name };
      }
    }
    return null;
  }

  // Standard OpenAI-compatible format
  const url = provider.baseUrl;
  const headers = { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' };
  const body = { model, messages, max_tokens: maxTokens, temperature: 0.2 };

  const r = await _fetchTimeout(url, { method: 'POST', headers, body: JSON.stringify(body) }, timeout);
  if (r.ok) {
    const d = await r.json();
    const t = d.choices?.[0]?.message?.content;
    if (t) {
      _trackUsage(name);
      return { text: t.trim(), model: name + '/' + model, provider: name };
    }
  }

  if (r.status === 429) {
    _tripCircuit(name, 180000); // 3min for rate limit
  } else if (r.status >= 500) {
    _tripCircuit(name, 60000); // 1min for server errors
  }
  return null;
}

// ---------------------------------------------------------------------------
// 6. Cascade call with fallback
// ---------------------------------------------------------------------------
async function callWithCascade({ text, systemPrompt, maxTokens = 2048, maxRetries = 1, timeout = 30000 }) {
  const sortedProviders = Object.entries(PROVIDERS)
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([name]) => name);

  const taskType = classifyTask(text, systemPrompt);

  for (const name of sortedProviders) {
    if (!_isWithinLimits(name)) continue;

    for (let retry = 0; retry <= maxRetries; retry++) {
      if (retry > 0) await new Promise(r => setTimeout(r, _backoff(retry)));

      try {
        const result = await _callProvider(name, { text, systemPrompt, maxTokens, timeout });
        if (result) {
          console.log(`  [KeyManager] ${result.provider} served the request (${result.model})`);
          return result;
        }
      } catch (err) {
        if (err.name === 'AbortError') _tripCircuit(name, 60000);
        console.log(`  [KeyManager] ${name} error: ${err.message}`);
        break; // Skip retries for this provider
      }
    }
  }

  return { text: 'AI_OFFLINE_OR_LIMIT_REACHED', model: 'key-manager-fallback', provider: 'none' };
}

// ---------------------------------------------------------------------------
// 7. Status & diagnostics
// ---------------------------------------------------------------------------
function getProviderStatus() {
  const daily = _loadState();
  const status = {};

  for (const [name, provider] of Object.entries(PROVIDERS)) {
    const key = _getApiKey(name);
    const usage = daily[name] || 0;
    const cbState = _getCircuitState(name);
    status[name] = {
      available: !!key,
      circuitBreaker: cbState,
      dailyUsage: usage,
      dailyLimit: provider.dailyLimit,
      remaining: Math.max(0, provider.dailyLimit - usage),
      utilizationPercent: Math.round((usage / provider.dailyLimit) * 100),
      priority: provider.priority,
      category: provider.category,
    };
  }

  return status;
}

function getAvailableProviders() {
  return Object.entries(PROVIDERS)
    .filter(([name]) => _isWithinLimits(name))
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([name]) => name);
}

function getUsageSummary() {
  const daily = _loadState();
  const totalCalls = Object.values(daily).reduce((a, b) => a + b, 0);
  const providersUsed = Object.keys(daily).length;
  return { totalCalls, providersUsed, dailyCounts: { ...daily } };
}

// ---------------------------------------------------------------------------
// 8. CLI interface
// ---------------------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'status';

  if (cmd === 'status') {
    const status = getProviderStatus();
    console.log('\n=== API Key Manager Status ===\n');
    console.log('Provider          | Available | Circuit | Daily Use | Remaining | Util% | Priority');
    console.log('------------------|-----------|---------|-----------|-----------|-------|---------');
    for (const [name, s] of Object.entries(status)) {
      const avail = s.available ? 'YES' : 'NO';
      const cb = s.circuitBreaker === 'open' ? 'OPEN' : 'closed';
      const use = `${s.dailyUsage}/${s.dailyLimit}`;
      const remain = `${s.remaining}`;
      const util = `${s.utilizationPercent}%`;
      console.log(`${name.padEnd(18)}| ${avail.padEnd(10)}| ${cb.padEnd(8)}| ${use.padEnd(10)}| ${remain.padEnd(10)}| ${util.padEnd(6)}| ${s.priority}`);
    }
  } else if (cmd === 'test') {
    (async () => {
      console.log('\nTesting cascade with a simple prompt...\n');
      const result = await callWithCascade({
        text: 'Say "API key manager test successful" and nothing else.',
        systemPrompt: 'You are a test assistant. Reply with the exact text requested.',
        maxTokens: 50,
      });
      console.log(`\nProvider: ${result.provider}`);
      console.log(`Model: ${result.model}`);
      console.log(`Response: ${result.text.substring(0, 200)}`);
    })();
  } else if (cmd === 'reset') {
    try {
      fs.unlinkSync(STATE_FILE);
      console.log('Rate state cleared.');
    } catch {
      console.log('No rate state to clear.');
    }
  } else {
    console.log('Usage: node api-key-manager.js [status|test|reset]');
  }
}

module.exports = {
  callWithCascade,
  getProviderStatus,
  getAvailableProviders,
  getUsageSummary,
  classifyTask,
  PROVIDERS,
  _isWithinLimits,
  _tripCircuit,
};
