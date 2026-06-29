#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEEP_TECH_RE = /\b(_TZE\d{3}_[A-Za-z0-9]+|_TZ\d{4}_[A-Za-z0-9]+|_TYZB[A-Za-z0-9_]+|_TYST[A-Za-z0-9_]+|TS\d{4}[A-Z]?|DP\s*:?\s*\d{1,3}|0x[0-9a-fA-F]{4}|\d{4}-\d{2}-\d{2}(?:[T ][0-2]\d:[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?Z?)?|measure_[a-z_.]+|meter_[a-z_.]+|alarm_[a-z_.]+|button\.push|onoff|dim)\b|\[REDACTED_[A-Z0-9_-]+(?::[a-f0-9]{6,})?\]/g;
const SENSITIVE_KEY_RE = /^(?:email|mail|from|to|cc|bcc|replyTo|sender|recipient|displayName|username|author|reporter|uid|uuid|sid|owner[_-]?id|local[_-]?key|token|secret|password|passwd|authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|ip|mac|address)$/i;

function digest(value, len = 10) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, len);
}

function alias(kind, value) {
  const v = String(value || '').trim();
  if (!v) return '';
  return `[REDACTED_${kind.toUpperCase()}:${digest(v)}]`;
}

function preserveTechnical(text, transform) {
  const keep = [];
  const masked = String(text).replace(KEEP_TECH_RE, match => {
    keep.push(match);
    return `__TUYA_KEEP_${keep.length - 1}__`;
  });
  return transform(masked).replace(/__TUYA_KEEP_(\d+)__/g, (_, i) => keep[Number(i)] || '');
}

function redact(text) {
  if (text === null || text === undefined) return '';
  return preserveTechnical(text, value => {
    let s = String(value);

    s = s.replace(/[A-Za-z]:\\Users\\[^\\\s,;:]+/gi, '[REDACTED_PATH]');
    s = s.replace(/\/(?:home|Users|root)\/[^\s/,:;]+/gi, '[REDACTED_PATH]');
    s = s.replace(/https?:\/\/[^\s"',)]+(?:diagnostic|crash|log|debug)[^\s"',)]*/gi, '[REDACTED_DIAGNOSTIC_URL]');
    s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, m => alias('email', m.toLowerCase()));
    s = s.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_IP]');
    s = s.replace(/\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b/gi, '[REDACTED_IPV6]');
    s = s.replace(/\b(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}\b/gi, '[REDACTED_MAC]');
    s = s.replace(/\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}\b/g, '[REDACTED_GITHUB_TOKEN]');
    s = s.replace(/\bAIza[0-9A-Za-z_-]{35}\b/g, '[REDACTED_GOOGLE_KEY]');
    s = s.replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_AWS_KEY]');
    s = s.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\b/g, '[REDACTED_JWT]');
    s = s.replace(/\bBearer\s+[A-Za-z0-9._-]{20,}\b/gi, 'Bearer [REDACTED_TOKEN]');
    s = s.replace(/(["']?(?:local[_-]?key|owner[_-]?id|uid|uuid|sid|token|secret|password|passwd|api[_-]?key|refresh[_-]?token|access[_-]?token|client[_-]?secret)["']?\s*[:=]\s*["']?)([^"',\s}]{3,})/gi, '$1[REDACTED_SECRET]');
    s = s.replace(/(?:\+\d{1,3}[\s().-]*)?(?:\(?\d{2,4}\)?[\s.-]+){2,}\d{2,4}\b/g, '[REDACTED_PHONE]');
    s = s.replace(/\b[a-f0-9]{32,}\b/gi, '[REDACTED_HEX]');

    return s;
  });
}

function isSafePublicValue(value) {
  return ['github', 'forum', 'homey_system', 'unknown', 'user', 'imap'].includes(String(value || '').toLowerCase());
}

function isRedactedValue(value) {
  return /^\[REDACTED_[A-Z0-9_-]+(?::[a-f0-9]{6,})?\]$/.test(String(value || '').trim());
}

function redactObject(value, key = '') {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(item => redactObject(item, key));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactObject(v, k);
    return out;
  }
  if (typeof value !== 'string') {
    if (SENSITIVE_KEY_RE.test(key)) return alias(key.replace(/[^a-z0-9]/gi, '_') || 'id', value);
    return value;
  }

  const cleaned = redact(value);
  if (isRedactedValue(cleaned)) return cleaned;
  if (SENSITIVE_KEY_RE.test(key) && cleaned === value && value && !isSafePublicValue(value)) {
    return alias(key.replace(/[^a-z0-9]/gi, '_') || 'value', value);
  }
  return cleaned;
}

const LEAK_PATTERNS = [
  ['email', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ['ipv4', /\b(?:\d{1,3}\.){3}\d{1,3}\b/g],
  ['mac', /\b(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}\b/gi],
  ['github-token', /\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}\b/g],
  ['google-api-key', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\b/g],
  ['bearer-token', /\bBearer\s+[A-Za-z0-9._-]{20,}\b/gi],
  ['user-path', /[A-Za-z]:\\Users\\[^\\\s,;:]+|\/(?:home|Users|root)\/[^\s/,:;]+/gi],
  ['diagnostic-url', /https?:\/\/[^\s"',)]+(?:diagnostic|crash|log|debug)[^\s"',)]*/gi],
  ['secret-assignment', /(?:local[_-]?key|owner[_-]?id|uid|uuid|sid|token|secret|password|passwd|api[_-]?key|refresh[_-]?token|access[_-]?token|client[_-]?secret)\s*[:=]\s*["']?[^"',\s}]{8,}/gi]
];

function findLeaks(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const leaks = [];
  for (const [kind, re] of LEAK_PATTERNS) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(text))) {
      if (/\[REDACTED_[A-Z0-9_-]+(?::[a-f0-9]{6,})?\]/.test(match[0])) continue;
      leaks.push({ kind, at: match.index, sample: match[0].slice(0, 24) });
      if (leaks.length >= 20) return leaks;
    }
  }
  return leaks;
}

function assertNoLeaks(value, label = 'diagnostic payload') {
  const leaks = findLeaks(value);
  if (leaks.length) {
    const summary = leaks.map(l => `${l.kind}@${l.at}`).join(', ');
    throw new Error(`Privacy gate failed for ${label}: ${summary}`);
  }
}

function readAndRedactFile(file) {
  if (!fs.existsSync(file)) return { file, skipped: true };
  const raw = fs.readFileSync(file, 'utf8');
  let next;
  try {
    next = JSON.stringify(redactObject(JSON.parse(raw)), null, 2) + '\n';
  } catch {
    next = redact(raw);
  }
  next = next
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\s*$/, '\n');
  assertNoLeaks(next, file);
  if (next !== raw) fs.writeFileSync(file, next);
  return { file, changed: next !== raw };
}

function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    return fs.readdirSync(target).flatMap(name => walk(path.join(target, name)));
  }
  if (!/\.(json|ya?ml|txt|md|log)$/i.test(target)) return [];
  return [target];
}

function main(argv) {
  const files = argv.flatMap(walk);
  if (!files.length) {
    console.log('Privacy gate: no files to scan');
    return;
  }
  let changed = 0;
  for (const file of files) {
    const result = readAndRedactFile(file);
    if (result.changed) changed++;
  }
  console.log(`Privacy gate: ${files.length} file(s) scanned, ${changed} sanitized`);
}

module.exports = { redact, redactObject, findLeaks, assertNoLeaks, alias, digest };

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
