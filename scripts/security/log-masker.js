/**
 * log-masker.js — Mask secrets/PII in logs (security.md §1: "proactively mask")
 * Usage: const { maskAll } = require('./scripts/security/log-masker');
 */
'use strict';
const SP = [/\bghp_[A-Za-z0-9]{36}\b/g, /\bgithub_pat_[A-Za-z0-9_]{40}\b/g,
  /\bAIza[0-9A-Za-z-_]{35}\b/g, /\bsk-[A-Za-z0-9]{40}\b/g, /Bearer\s+[A-Za-z0-9._-]{20,}/g];
const PP = [/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi];
function maskSecrets(t) { let s = t; for (const r of SP) s = s.replace(r, '[REDACTED]'); return s; }
function maskPII(t) { let s = t; for (const r of PP) s = s.replace(r, '[PII]'); return s; }
function maskAll(t) { return maskPII(maskSecrets(t)); }
module.exports = { maskSecrets, maskPII, maskAll };
