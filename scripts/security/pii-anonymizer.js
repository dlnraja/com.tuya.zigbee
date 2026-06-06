#!/usr/bin/env node
/**
 * pii-anonymizer.js — Anonymize PII before GitHub/forum posting (security.md §2)
 * Masks: Homey IDs, emails, IPs, device names, tokens, MACs
 */
'use strict';
const fs = require('fs');
const INPUT = process.argv[2];
const OUTPUT = process.argv.includes('--output') ? process.argv[process.argv.indexOf('--output') + 1] : null;
let text = INPUT && fs.existsSync(INPUT) ? fs.readFileSync(INPUT, 'utf8') : process.argv.includes('--stdin') ? fs.readFileSync(0, 'utf8') : '';
if (!text) { console.error('Usage: pii-anonymizer.js <file> [--output <file>] | --stdin'); process.exit(1); }
const P = [
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[HOMEY_ID]'],
  [/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '[EMAIL]'],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]'],
  [/\bghp_[A-Za-z0-9]{36}\b/g, '[TOKEN]'], [/\bgithub_pat_[A-Za-z0-9_]{40}\b/g, '[TOKEN]'],
  [/\bAIza[0-9A-Za-z-_]{35}\b/g, '[KEY]'], [/\bsk-[A-Za-z0-9]{40}\b/g, '[KEY]'],
  [/\b[a-f0-9]{16,}\b/gi, '[DEVICE_ID]'], [/\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g, '[MAC]'],
];
let m = 0; for (const [rx, mask] of P) { const b = text; text = text.replace(rx, mask); if (text !== b) m++; }
if (OUTPUT) { fs.writeFileSync(OUTPUT, text); console.log(`✅ Anonymized ${m} PII → ${OUTPUT}`); }
else process.stdout.write(text);
