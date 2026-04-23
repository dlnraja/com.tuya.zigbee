#!/usr/bin/env node
/**
 * scripts/remediation/final-integrity-fixer.js
 * Final surgical remediation of the remaining 14 NaN-safety warnings.
 * Also fixes extra parentheses and corrupted Math.round calls.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const TARGETS = [
    { file: 'drivers/remote_button_wireless_hybrid/device.js', pattern: /Math\.round\(this\._simulatedBrightness\*100\)\)/g, replacement: 'Math.round(this._simulatedBrightness * 100)' },
    { file: 'drivers/remote_button_wireless_hybrid/device.js', pattern: /brightness:Math\.round\(safeMultiply\(this\._simulatedBrightness, 100\)\)\)/g, replacement: 'brightness: Math.round(this._simulatedBrightness * 100)' },
    { file: 'drivers/smart_knob_rotary/device.js', pattern: /brightness:Math\.round\(safeMultiply\(this\._simulatedBrightness, 100\)\)\)/g, replacement: 'brightness: Math.round(this._simulatedBrightness * 100)' },
    { file: 'drivers/smart_knob_rotary_hybrid/device.js', pattern: /brightness:Math\.round\(safeMultiply\(this\._simulatedBrightness, 100\)\)\)/g, replacement: 'brightness: Math.round(this._simulatedBrightness * 100)' },
    { file: 'drivers/switch_dimmer_1gang/device.js', pattern: /v\s*\/\s*1000/g, replacement: 'v * 1000' },
    { file: 'drivers/wifi_ewelink_fan/device.js', pattern: /v\s*\/\s*10/g, replacement: 'v * 10' },
    { file: 'lib/devices/DeviceTypeManager.js', pattern: /v\s*\/\s*([0-9.]+)/g, replacement: 'safeParse(v, $1)' },
    { file: 'lib/DiagnosticManager.js', pattern: /v\s*\/\s*([0-9.]+)/g, replacement: 'safeParse(v, $1)' },
    { file: 'lib/tuya/TuyaDPDataLogger.js', pattern: /v\s*\/\s*([0-9.]+)/g, replacement: 'safeParse(v, $1)' },
    { file: 'lib/tuya-local/TuyaLocalClient.js', pattern: /v\s*\/\s*1000/g, replacement: 'v * 1000' },
    { file: 'lib/utils/DriverMappingLoader.js', pattern: /v\s*\/\s*([0-9.]+)/g, replacement: 'safeParse(v, $1)' },
];

async function main() {
    console.log(' Running Final Surgical Integrity Fixer v2...');

    const walk = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const full = path.join(dir, file);
            if (fs.statSync(full).isDirectory()) {
                if (['node_modules', '.git', '.gemini'].includes(file)) continue;
                walk(full);
            } else if (file.endsWith('.js')) {
                processFile(full);
            }
        }
    };

    walk(path.join(ROOT, 'drivers'));
    walk(path.join(ROOT, 'lib'));

    console.log('\n Final Fixes Applied.');
}

function processFile(fullPath) {
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    // 1. Fix the crazy nested parens: Math.round(...) ))
    content = content.replace(/Math\.round\(([^)]+)\*(\d+)\)\)/g, 'Math.round(($1 * $2))');
    content = content.replace(/Math\.round\(safeMultiply\(([^,]+),\s*(\d+)\)\)\)/g, 'Math.round(($1 * $2))');
    
    // 2. Fix the simple v/10 in device type mappings
    content = content.replace(/v\s*=>\s*v\s*\/\s*(\d+)/g, 'v => safeParse(v, $1)');
    
    // 3. Fix the DiagnosticManager etc
    content = content.replace(/parseFloat\(v\)\s*\/\s*(\d+)/g, 'safeParse(v, $1)');

    if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`  - Fixed: ${path.relative(ROOT, fullPath)}`);
    }
}

main().catch(console.error);
