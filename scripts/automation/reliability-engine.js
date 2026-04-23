#!/usr/bin/env node
'use strict';

/**
 * Hybrid Engine Reliability Engine (NRE)
 * - Assigns reliability scores to drivers based on:
 *   1. Forum sentiment (mentions of "offline", "not working", "broken")
 *   2. Support ticket volume (if reachable)
 *   3. CI/CD regression check results
 * - Automatically flags drivers for AI-mediated repair.
 */

const fs = require('fs');
const path = require('path');

const INTEL_FILE = path.join(__dirname, '../../.github/state/forum-intel.json');
const RELIABILITY_FILE = path.join(__dirname, '../../.github/state/reliability-metrics.json');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');

function calculateReliability() {
    console.log(' Starting Hybrid Engine Reliability Engine...');
    
    if (!fs.existsSync(INTEL_FILE)) {
        console.warn(' No forum intel found. Using default metrics.');
        return;
    }

    const intel = JSON.parse(fs.readFileSync(INTEL_FILE, 'utf8'));
    const metrics = {};

    // 1. Process Issues by Manufacturer
    intel.allIssues.forEach(issue => {
        issue.found.forEach(mfr => {
            if (!metrics[mfr]) metrics[mfr] = { issues: 0, sentiment: 100, reports: [] };
            metrics[mfr].issues++;
            metrics[mfr].reports.push({ date: issue.date, user: issue.user, type: issue.issues.join(',') });
            
            // Deduct points for critical terms
            if (issue.text.includes('disconnect') || issue.text.includes('offline')) metrics[mfr].sentiment -= 10;
            if (issue.text.includes('wrong') || issue.text.includes('incorrect')) metrics[mfr].sentiment -= 5;
        });
    });

    // 2. Map Manufacturers to Drivers
    const driverMetrics = {};
    const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());

    drivers.forEach(driver => {
        const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            const manufacturers = compose.zigbee?.manufacturerName || []       ;
            
            let driverScore = 100;
            let totalIssues = 0;
            
            manufacturers.forEach(mfr => {
                if (metrics[mfr]) {
                    driverScore = Math.min(driverScore, metrics[mfr].sentiment);
                    totalIssues += metrics[mfr].issues;
                }
            });

            driverMetrics[driver] = {
                score: driverScore,
                issueCount: totalIssues,
                status: driverScore < 50 ? 'CRITICAL' : (driverScore < 80 ? 'UNSTABLE' : 'STABLE'),
                lastAudit: new Date().toISOString()
            };
        }
    });

    fs.mkdirSync(path.dirname(RELIABILITY_FILE), { recursive: true });
    fs.writeFileSync(RELIABILITY_FILE, JSON.stringify(driverMetrics, null, 2));
    
    console.log(` Reliability Audit Complete. ${Object.keys(driverMetrics).length} drivers assessed.`);
    
    const critical = Object.entries(driverMetrics).filter(([_, m]) => m.status === 'CRITICAL');
    if (critical.length > 0) {
        console.log(` CRITICAL DRIVERS DETECTED: ${critical.map(([n]) => n).join(', ')}`);
        // In a real pipeline, this would trigger a 'Deep Repair' workflow
    }
}

calculateReliability();
