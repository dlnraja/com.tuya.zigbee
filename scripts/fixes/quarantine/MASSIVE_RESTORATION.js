/**
 * scripts/fixes/MASSIVE_RESTORATION.js
 * Restores the "Permissive ZCL" listeners and "Tuya Response" logic 
 * in hybrid drivers that were corrupted by the legacy NaN hardener.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const targets = [
    'drivers/sensor_gas_presence_hybrid/device.js',
    'drivers/sensor_contact_presence_hybrid/device.js',
    'drivers/sensor_motion_presence_hybrid/device.js',
    'drivers/sensor_presence_radar_hybrid/device.js',
    'drivers/air_purifier_presence_hybrid/device.js',
    'drivers/climate_sensor_presence_hybrid/device.js',
    'drivers/climate_sensor/device.js'
];

targets.forEach(relPath => {
    const absPath = path.join(process.cwd(), relPath);
    if (!fs.existsSync(absPath)) return;

    let content = fs.readFileSync(absPath, 'utf8');

    // 1. Fix Illuminance Math.pow
    content = content.replace(/Math\.pow\(10,\s*\(v\s*-safeParse\(1\),\s*10000\)\)/g, 'Math.round(Math.pow(10, (v - 1) / 10000))');

    // 2. Fix changePercent
    content = content.replace(/Math\.abs\(finalLux\s*-safeDivide\(currentLux\),safeMultiply\(currentLux\),\s*100\)/g, '(Math.abs(finalLux - currentLux) / currentLux) * 100');

    // 3. Fix Temp/Humid/Battery corrupted blocks
    content = content.replace(/Math\.round\(\(safeDivide\(rawTemp,safeMultiply\(divisor\),\s*safeParse\)\(10\),\s*10\));/g, 'Math.round((rawTemp / divisor) * 10) / 10;'));
    content = content.replace(/Math\.round\(\(safeDivide\(rawHumid,safeMultiply\(divisor\),\s*multiplier\)\));/g, 'Math.round((rawHumid / divisor) * multiplier));'));
    content = content.replace(/Math\.round\(lux\);/g, 'Math.round(lux));');
    content = content.replace(/Math\.round\(safeParse\(([^)]+)\);/g, 'Math.round($1);');
    content = content.replace(/Math\.min\(100,\s*Math\.round\(safeParse\(([^)]+)\)\);/g, 'Math.min(100, Math.round($1));');
    content = content.replace(/Math\.min\(100,\s*Math\.round\(safeParse\(([^)]+)\);\s*\)/g, 'Math.min(100, Math.round($1));');
    content = content.replace(/Math\.min\(100,\s*Math\.round\(safeParse\(([^));]+)\));/g, 'Math.min(100, Math.round($1)));'));

    // 4. Fix Distance
    content = content.replace(/Math\.round\(\(safeDivide\(rawDist,safeMultiply\(divisor\),\s*safeParse\)\(100\),\s*100\));/g, 'Math.round((rawDist / divisor) * 100) / 100;'));

    // 5. Cleanup lone safeMultiply/safeDivide that survived in weird formats
    content = content.replace(/safeDivide\(currentLux\),safeMultiply\(currentLux\)/g, 'currentLux');

    fs.writeFileSync(absPath, content);
    console.log(`[RESTORED] ${relPath}`);
});
