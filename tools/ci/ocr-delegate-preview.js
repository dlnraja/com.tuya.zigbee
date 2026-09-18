'use strict';

/**
 * WHY(P2582): forfait-safe OCR delegate preview (no LLM). Windows uses ocr.cmd.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const ocr = process.platform === 'win32' ? 'ocr.cmd' : 'ocr';
const args = [
  'delegate', 'preview',
  '--from', process.env.OCR_FROM || 'HEAD~30',
  '--to', process.env.OCR_TO || 'HEAD',
  '--format', 'json',
  '--rule', path.join(__dirname, '..', '..', '.opencodereview', 'rule.json'),
];
const r = spawnSync(ocr, args, { stdio: 'inherit', shell: true });
process.exit(r.status == null ? 1 : r.status);
