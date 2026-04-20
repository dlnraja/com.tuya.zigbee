#!/usr/bin/env node
/**
 * Universal Tuya  CI/CD Pipeline Monitor (Local Dashboard)
 * Monitors GitHub Actions and Homey Test Channel status
 */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = 'dlnraja/com.tuya.zigbee';
const APP_ID = 'com.dlnraja.tuya.zigbee';

function log(m) { console.log(`[MONITOR] ${new Date().toLocaleTimeString()}  ${m}`); }

async function checkGitHub() {
    try {
        const res = execSync(`gh run list -L 1 -R ${REPO} --json status,conclusion,displayTitle,url`, { encoding: 'utf8' });
        const run = JSON.parse(res)[0];
        if (run) {
            log(`GitHub: ${run.displayTitle} | Status: ${run.status} | Result: ${run.conclusion || 'Pending'}`);
            log(`URL: ${run.url}`);
        }
    } catch { log('GitHub: gh CLI not available or auth failed'); }
}

async function checkStore() {
    const url = `https://homey.app/a/${APP_ID}/test/`;
    log(`Store Test Channel: ${url}`);
    // Local ping not possible without fetch, just log reference
}

async function checkLocal() {
    const appJsonVer = JSON.parse(fs.readFileSync('app.json', 'utf8')).version;
    log(`Local Version: v${appJsonVer}`);
}

async function main() {
    console.log('--- Universal Tuya Automation Dashboard ---');
    await checkLocal();
    await checkGitHub();
    await checkStore();
}

main();
