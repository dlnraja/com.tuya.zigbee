#!/usr/bin/env node
const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
'use strict';

/**
 * Skill: SDK 3 Compliance Auditor
 * Automatically scans drivers for deprecated patterns and flow card mismatches.
 */

const { execSync } = require('child_process');
const path = require('path');

function runAudit() {
    console.log('--- Starting SDK 3 Compliance Audit ---');
    const linterPath = path.join(__dirname, '..', '..', 'scripts', 'maintenance', 'sdk3-smart-linter.js');
    try {
        const output = execSync(`node "${linterPath}"`, { encoding: 'utf8' });
        console.log(output);
        return { success: true, suggestions: "Audit completed. Check console output for specifics." };
    } catch (error) {
        console.error('Audit failed:', error.message);
        return { success: false, error: error.message };
    }
}

if (require.main === module) {
    runAudit();
}

module.exports = { runAudit };
