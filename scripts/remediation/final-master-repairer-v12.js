'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const TARGET_DIRS = ['lib', 'drivers'];

let fixedFiles = 0;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    let modified = false;

    // 1. Restore missing ')' before .catch()
    // Pattern: method(..., something).catch(...)
    // Currently looks like: method(..., something.catch(...)
    // or: method(..., parseFloat(rounded).catch(...)
    
    // Pattern A: setCapabilityValue(..., something).catch(...)
    const setCapRegex = /(setCapabilityValue\(['"][^'"]+['"],\s*[^),]+)\.catch\(/g;
    if (setCapRegex.test(content)) {
        content = content.replace(setCapRegex, "$1).catch(");
        modified = true;
    }

    // 2. Fix Math.round(Math.max(...)) missing final )
    const mathMaxRegex = /(Math\.round\(Math\.max\(0,\s*Math\.min\(100,\s*[^)]+\))([^);]+);/g;
    if (mathMaxRegex.test(content)) {
        content = content.replace(mathMaxRegex, "$1)$2;");
        modified = true;
    }

    // 3. Fix updateBattery(Math.round(safeParse(value), 'ZCL')) missing )
    const updateBatRegex = /(updateBattery\(Math\.round\(safeParse\([^)]+\)\),\s*['"][^'"]+['"])\.catch/g;
    // Actually, sometimes it's updateBattery(Math.round(safeParse(value)), 'ZCL');
    // But in V4 it was: this.updateBattery(Math.round(safeParse(value), 'ZCL'));
    content = content.replace(/this\.updateBattery\(Math\.round\(safeParse\(([^)]+)\),\s*(['"][^'"]+['"])\)\);/g, 
                             "this.updateBattery(Math.round(safeParse($1)), $2);");

    // 4. Fix AdvancedAnalytics.js mangled summary
    if (filePath.includes('AdvancedAnalytics.js')) {
        // Fix line 279: lastUpdate
        content = content.replace(/successRate: 100,\s+lastUpdate\s+};/g, 
                                 "successRate: 100,\n        lastUpdate: Date.now()\n      };");
        
        // Fix mangled one-liner at 283
        content = content.replace(/const successRate = metrics\.command_success_rate\?\.value \|\| 100;const uptime = metrics\.device_uptime\?\.value \|\| 100;let health = 'excellent';/g,
                                 "const successRate = metrics.command_success_rate?.value || 100;\n    const uptime = metrics.device_uptime?.value || 100;\n    let health = 'excellent';");
        modified = true;
    }

    // 5. Fix BatteryManager.js mangled remainingCapacity
    if (filePath.includes('BatteryManager.js')) {
        content = content.replace(/const remainingCapacity = \(safeParse\(percentage,100\), specs\)\.capacity;/g,
                                 "const remainingCapacity = safeMultiply(safeDivide(percentage, 100), specs.capacity);");
        modified = true;
    }

    // 6. Fix tuyaUtils.js mangled ternary (v7.4.8 fix)
    if (filePath.includes('tuyaUtils.js')) {
        content = content.replace(/return device\.zclNode\.modelId\s*:\s*null;/g, "return device.zclNode.modelId || null;");
        modified = true;
    }

    // 7. Fix updateBattery(Math.round(safeParse(batteryPercentageRemaining));
    content = content.replace(/this\.updateBattery\(Math\.round\(safeParse\(([^)]+)\)\);/g, "this.updateBattery(Math.round(safeParse($1)));");

    if (modified || content !== original) {
        fs.writeFileSync(filePath, content);
        fixedFiles++;
        console.log(`[REPAIRED-V12] ${path.relative(ROOT_DIR, filePath)}`);
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
        else if (file.endsWith('.js')) processFile(fullPath);
    });
}

console.log('--- PARENTHESIS & LOGIC REPAIRER V12 ---');
TARGET_DIRS.forEach(dir => {
    const p = path.join(ROOT_DIR, dir);
    if (fs.existsSync(p)) walk(p);
});
console.log(`\nOperation finished. ${fixedFiles} files repaired.`);
