'use strict';

/**
 * WHY(P2582): resolve Homey-tuned OCR rules for critical runtime paths.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const ocr = process.platform === 'win32' ? 'ocr.cmd' : 'ocr';
const rule = path.join(__dirname, '..', '..', '.opencodereview', 'rule.json');
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
    'drivers/presence_sensor_radar/device.js',
    'lib/zigbee/Ef00OnlyInterview.js',
    'lib/protocol/IntelligentProtocolDetect.js',
    'lib/tuya/TuyaUnsignedValue.js',
  ];
const args = ['delegate', 'rule', '--rule', rule, '--format', 'text', ...files];
const r = spawnSync(ocr, args, { stdio: 'inherit', shell: true });
process.exit(r.status == null ? 1 : r.status);
