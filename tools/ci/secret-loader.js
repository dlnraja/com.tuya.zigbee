/**
 * secret-loader.js
 *
 * SAFE loader for GitHub Secrets / environment variables.
 *
 * SECURITY RULES:
 *   1. NEVER log secret values
 *   2. NEVER write secret values to disk
 *   3. Show only first 4 + last 2 chars of a secret (e.g. `ghp_***abc`)
 *   4. Default to MOCK MODE when real creds are missing
 *   5. List which secrets are MISSING (not their values)
 *   6. All secrets come from process.env (GitHub Secrets in CI, .env in local dev)
 *
 * Usage:
 *   const secrets = require('./secret-loader');
 *   const email = secrets.get('GMAIL_EMAIL');
 *   const masked = secrets.mask(email);  // 'se***om'
 *   const status = secrets.status();     // { available: [...], missing: [...] }
 *
 * @author Mavis investigation 2026-07-12
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Try to load .env if exists (for local dev)
function loadDotenv() {
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (!process.env[key] && value) process.env[key] = value;
    }
  } catch {}
}

loadDotenv();

const REQUIRED = {
  HOMEY_PAT: 'Athom App Store (publish)',
  HOMEY_PAT_API: 'Homey Cloud API (diagnostics)',
  GH_PAT: 'GitHub PAT (cross-repo)',
  GMAIL_EMAIL: 'Gmail IMAP address',
  GMAIL_APP_PASSWORD: 'Gmail IMAP app password',
  GOOGLE_API_KEY: 'Google Gemini (AI analysis)',
  HOMEY_EMAIL: 'Homey SSO email (forum)',
  HOMEY_PASSWORD: 'Homey SSO password (forum)',
  DISCOURSE_API_KEY: 'Discourse API key (forum)',
};

const OPTIONAL = {
  // AI providers
  NVIDIA_API_KEY: 'NVIDIA NIM (free)',
  HF_TOKEN: 'HuggingFace (free)',
  GROQ_API_KEY: 'Groq (free)',
  OPENROUTER_API_KEY: 'OpenRouter (free)',
  DEEPSEEK_API_KEY: 'DeepSeek (paid)',
  TOGETHER_API_KEY: 'Together.ai (paid)',
  CEREBRAS_API_KEY: 'Cerebras (paid)',
  KIMI_API_KEY: 'Kimi (paid)',
  OPENAI_API_KEY: 'OpenAI (premium)',
  MISTRAL_API_KEY: 'Mistral (premium)',
  // Athom OAuth
  ATHOM_CLIENT_ID: 'Athom OAuth client ID',
  ATHOM_CLIENT_SECRET: 'Athom OAuth client secret',
  // Legacy Gmail OAuth (REMOVED v5.12.6)
  GMAIL_CLIENT_ID: '[LEGACY] Gmail OAuth client ID',
  GMAIL_CLIENT_SECRET: '[LEGACY] Gmail OAuth client secret',
  GMAIL_REFRESH_TOKEN: '[LEGACY] Gmail OAuth refresh token',
};

const ALL = { ...REQUIRED, ...OPTIONAL };

/**
 * Get a secret value. Returns undefined if not set.
 * NEVER log the result of this function directly.
 */
function get(name) {
  if (!name || typeof name !== 'string') return undefined;
  return process.env[name];
}

/**
 * Get a secret with a default. If the secret is not set, returns the default.
 */
function getOrDefault(name, defaultValue) {
  const v = process.env[name];
  return v !== undefined && v !== '' ? v : defaultValue;
}

/**
 * Mask a secret for safe logging.
 * Examples:
 *   'ghp_abc123def456' -> 'ghp_***456'
 *   'user@example.com' -> 'use***.com'
 *   'short' -> '***'
 */
function mask(value) {
  if (!value) return '***';
  const s = String(value);
  if (s.length <= 4) return '***';
  // For tokens with prefix like 'ghp_', keep prefix
  const prefixMatch = s.match(/^([a-z]{2,5}_)/i);
  if (prefixMatch) {
    const prefix = prefixMatch[1];
    const tail = s.slice(-3);
    return `${prefix}***${tail}`;
  }
  // For emails, keep domain
  if (s.includes('@')) {
    const [user, domain] = s.split('@');
    if (user.length > 3) return `${user.slice(0, 3)}***@${domain}`;
    return `***@${domain}`;
  }
  // Generic: first 3 + *** + last 2
  return `${s.slice(0, 3)}***${s.slice(-2)}`;
}

/**
 * Get the status of all secrets (which are set, which are missing).
 * This is the SAFE way to report secret availability.
 */
function status() {
  const available = [];
  const missing = [];
  for (const [name, desc] of Object.entries(ALL)) {
    if (process.env[name]) {
      available.push({ name, desc, masked: mask(process.env[name]) });
    } else {
      missing.push({ name, desc });
    }
  }
  return { available, missing, required: Object.keys(REQUIRED), optional: Object.keys(OPTIONAL) };
}

/**
 * Check if we're in mock mode (no real Gmail creds).
 * Mock mode = use local emulator instead of IMAP.
 */
function isMockMode() {
  return process.env.GMAIL_MOCK === 'true' || !process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD;
}

/**
 * Get a safe summary for logging.
 * Returns only masked values + which are missing.
 */
function safeSummary() {
  const s = status();
  return {
    mock_mode: isMockMode(),
    available_count: s.available.length,
    missing_count: s.missing.length,
    missing_required: s.missing.filter((m) => REQUIRED[m.name]).map((m) => m.name),
    available_keys: s.available.map((a) => ({ name: a.name, masked: a.masked })),
  };
}

module.exports = {
  get,
  getOrDefault,
  mask,
  status,
  isMockMode,
  safeSummary,
  REQUIRED,
  OPTIONAL,
  ALL,
};

// CLI mode
if (require.main === module) {
  console.log('=== Secret Loader — Safe Summary ===\n');
  console.log(JSON.stringify(safeSummary(), null, 2));
}
