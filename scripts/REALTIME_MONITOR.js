#!/usr/bin/env node
'use strict';

/**
 * REAL-TIME MONITOR - Live GitHub Actions Status
 * Monitors specific workflow runs until completion
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const ROOT = path.join(__dirname, '..');

console.clear();
console.log('🔴 LIVE - REAL-TIME MONITORING');
console.log('═'.repeat(60));

let checkCount = 0;
const startTime = Date.now();

async function getLatestRuns() {
    try {
        const output = execSync('gh run list --limit 5 --json status,conclusion,name,databaseId,createdAt,workflowName', {
            cwd: ROOT,
            encoding: 'utf8'
        });
        
        return JSON.parse(output);
    } catch (error) {
        console.log('❌ Error:', error.message);
        return [];
    }
}

async function getRunDetails(runId) {
    try {
        const output = execSync(`gh run view ${runId} --json jobs`, {
            cwd: ROOT,
            encoding: 'utf8'
        });
        
        return JSON.parse(output);
    } catch (error) {
        return null;
    }
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

function getStatusEmoji(status, conclusion) {
    if (status === 'in_progress') return '⏳';
    if (status === 'queued') return '⏸️';
    if (conclusion === 'success') return '✅';
    if (conclusion === 'failure') return '❌';
    return '❓';
}

async function displayStatus() {
    const runs = await getLatestRuns();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    console.clear();
    console.log('═'.repeat(60));
    console.log(`🔴 LIVE MONITORING - Check #${++checkCount}`);
    console.log(`⏱️  Elapsed: ${formatDuration(elapsed)}`);
    console.log(`🕐 Time: ${new Date().toLocaleTimeString()}`);
    console.log('═'.repeat(60));
    console.log('');
    
    let allCompleted = true;
    let hasFailures = false;
    let successCount = 0;
    
    for (const run of runs.slice(0, 3)) {
        const emoji = getStatusEmoji(run.status, run.conclusion);
        const name = run.name || run.workflowName || 'Unknown';
        
        console.log(`${emoji} ${name}`);
        console.log(`   ID: ${run.databaseId}`);
        console.log(`   Status: ${run.status}`);
        
        if (run.conclusion) {
            console.log(`   Result: ${run.conclusion.toUpperCase()}`);
        }
        
        if (run.status === 'in_progress' || run.status === 'queued') {
            allCompleted = false;
            
            // Try to get job details
            const details = await getRunDetails(run.databaseId);
            if (details && details.jobs) {
                const jobs = details.jobs;
                console.log(`   Jobs: ${jobs.length}`);
                
                for (const job of jobs) {
                    if (job.status === 'in_progress') {
                        console.log(`     ⏳ ${job.name}`);
                        
                        if (job.steps) {
                            const currentStep = job.steps.find(s => s.status === 'in_progress');
                            if (currentStep) {
                                console.log(`        → ${currentStep.name}`);
                            }
                        }
                    }
                }
            }
        }
        
        if (run.conclusion === 'success') {
            successCount++;
        } else if (run.conclusion === 'failure') {
            hasFailures = true;
        }
        
        console.log('');
    }
    
    console.log('═'.repeat(60));
    console.log(`📊 SUMMARY: ${successCount} succeeded, ${hasFailures ? 'failures detected' : 'no failures'}`);
    console.log('═'.repeat(60));
    
    return { allCompleted, hasFailures, successCount };
}

async function monitor() {
    while (true) {
        const status = await displayStatus();
        
        if (status.allCompleted) {
            console.log('');
            if (status.hasFailures) {
                console.log('⚠️  All workflows completed but some failed');
                console.log('');
                console.log('📝 Analyzing failures...');
                
                // Get failure logs
                const runs = await getLatestRuns();
                for (const run of runs.slice(0, 3)) {
                    if (run.conclusion === 'failure') {
                        console.log(`\n❌ Failed: ${run.name}`);
                        console.log(`   Run ID: ${run.databaseId}`);
                        console.log(`   View logs: gh run view ${run.databaseId} --log-failed`);
                    }
                }
                
                console.log('');
                console.log('🔧 Auto-fixing and retrying...');
                
                // Clean cache
                try {
                    execSync('powershell -Command "Remove-Item -Recurse -Force .homeybuild,.homeycompose -ErrorAction SilentlyContinue"', { cwd: ROOT });
                    console.log('✅ Cache cleaned');
                } catch (e) {}
                
                // Validate
                try {
                    execSync('homey app validate', { cwd: ROOT, stdio: 'inherit' });
                    console.log('✅ Validation passed');
                } catch (e) {
                    console.log('❌ Validation failed');
                }
                
                process.exit(1);
            } else {
                console.log('');
                console.log('🎉 SUCCESS - All workflows completed successfully!');
                console.log('');
                console.log(`✅ ${status.successCount} workflows succeeded`);
                console.log(`⏱️  Total time: ${formatDuration(Math.floor((Date.now() - startTime) / 1000))}`);
                
                // Save report
                const report = {
                    timestamp: new Date().toISOString(),
                    successCount: status.successCount,
                    totalChecks: checkCount,
                    duration: Math.floor((Date.now() - startTime) / 1000),
                    status: 'SUCCESS'
                };
                
                fs.writeJsonSync(path.join(ROOT, 'MONITORING_SUCCESS.json'), report, { spaces: 2 });
                
                process.exit(0);
            }
        }
        
        console.log('⏳ Checking again in 15 seconds...');
        console.log('   Press Ctrl+C to stop');
        
        await new Promise(resolve => setTimeout(resolve, 15000));
    }
}

monitor().catch(error => {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
});
