#!/usr/bin/env node
'use strict';

/**
 * RECURSIVE MONITOR UNTIL SUCCESS
 * 
 * Monitors GitHub Actions workflows in real-time
 * Auto-fixes issues and retries until complete success
 * Never stops until all workflows succeed
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAX_RETRIES = 10;
const CHECK_INTERVAL = 30000; // 30 seconds

let retryCount = 0;

console.log('🔄 RECURSIVE MONITOR - NEVER STOPS UNTIL SUCCESS');
console.log('═'.repeat(60));
console.log('Started:', new Date().toISOString());
console.log('Max retries:', MAX_RETRIES);
console.log('Check interval:', CHECK_INTERVAL / 1000, 'seconds');
console.log('═'.repeat(60));

// ============================================================================
// MONITOR WORKFLOWS
// ============================================================================

function getRunningWorkflows() {
    try {
        const output = execSync('gh run list --limit 5 --json status,conclusion,name,databaseId,workflowName', {
            cwd: ROOT,
            encoding: 'utf8'
        });
        
        return JSON.parse(output);
    } catch (error) {
        console.log('⚠️  Failed to get workflows:', error.message);
        return [];
    }
}

function getWorkflowDetails(runId) {
    try {
        const output = execSync(`gh run view ${runId} --json jobs,status,conclusion,name`, {
            cwd: ROOT,
            encoding: 'utf8'
        });
        
        return JSON.parse(output);
    } catch (error) {
        console.log('⚠️  Failed to get workflow details:', error.message);
        return null;
    }
}

function getFailureLogs(runId) {
    try {
        const output = execSync(`gh run view ${runId} --log-failed`, {
            cwd: ROOT,
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024
        });
        
        return output;
    } catch (error) {
        return null;
    }
}

// ============================================================================
// AUTO-FIX COMMON ISSUES
// ============================================================================

function analyzeAndFixErrors(logs) {
    const fixes = [];
    
    if (!logs) return fixes;
    
    // Check for validation errors
    if (logs.includes('validation failed') || logs.includes('invalid')) {
        fixes.push({
            type: 'validation',
            action: 'Run validation and fix errors',
            fix: async () => {
                console.log('  🔧 Running validation...');
                try {
                    execSync('homey app validate --level=publish', { cwd: ROOT, stdio: 'inherit' });
                    return true;
                } catch (error) {
                    console.log('  ❌ Validation failed, attempting fixes...');
                    return false;
                }
            }
        });
    }
    
    // Check for cache issues
    if (logs.includes('cache') || logs.includes('.homeybuild')) {
        fixes.push({
            type: 'cache',
            action: 'Clean Homey cache',
            fix: async () => {
                console.log('  🔧 Cleaning cache...');
                try {
                    execSync('powershell -Command "Remove-Item -Recurse -Force .homeybuild,.homeycompose -ErrorAction SilentlyContinue"', { cwd: ROOT });
                    return true;
                } catch (error) {
                    return false;
                }
            }
        });
    }
    
    // Check for authentication issues
    if (logs.includes('authentication') || logs.includes('401') || logs.includes('HOMEY_TOKEN')) {
        fixes.push({
            type: 'auth',
            action: 'Check GitHub secrets configuration',
            fix: async () => {
                console.log('  ⚠️  Authentication issue detected - check HOMEY_TOKEN in GitHub secrets');
                return false; // Cannot auto-fix this
            }
        });
    }
    
    // Check for network issues
    if (logs.includes('ETIMEDOUT') || logs.includes('ECONNREFUSED')) {
        fixes.push({
            type: 'network',
            action: 'Network timeout - will retry',
            fix: async () => {
                console.log('  🔧 Network issue - waiting 60s before retry...');
                await new Promise(resolve => setTimeout(resolve, 60000));
                return true;
            }
        });
    }
    
    return fixes;
}

async function applyFixes(fixes) {
    for (const fix of fixes) {
        console.log(`\n🔧 Applying fix: ${fix.action}`);
        const success = await fix.fix();
        
        if (success) {
            console.log(`  ✅ Fix applied successfully: ${fix.type}`);
        } else {
            console.log(`  ❌ Fix failed or requires manual intervention: ${fix.type}`);
        }
    }
}

// ============================================================================
// TRIGGER NEW WORKFLOW
// ============================================================================

function triggerNewWorkflow() {
    try {
        console.log('\n🚀 Triggering new workflow run...');
        
        // Create an empty commit to trigger workflows
        execSync('git commit --allow-empty -m "chore: trigger workflow retry"', { cwd: ROOT });
        execSync('git push origin master', { cwd: ROOT });
        
        console.log('  ✅ New workflow triggered');
        return true;
    } catch (error) {
        console.log('  ❌ Failed to trigger workflow:', error.message);
        return false;
    }
}

// ============================================================================
// MAIN MONITORING LOOP
// ============================================================================

async function monitorLoop() {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`⏰ Check ${retryCount + 1}/${MAX_RETRIES} at ${new Date().toLocaleTimeString()}`);
    console.log('═'.repeat(60));
    
    const workflows = getRunningWorkflows();
    
    if (workflows.length === 0) {
        console.log('⚠️  No workflows found - may need to trigger manually');
        return { allSuccess: false, shouldRetry: false };
    }
    
    let inProgress = 0;
    let succeeded = 0;
    let failed = 0;
    
    const failedWorkflows = [];
    
    for (const workflow of workflows) {
        console.log(`\n📊 ${workflow.name || workflow.workflowName}`);
        console.log(`   Status: ${workflow.status}`);
        console.log(`   Conclusion: ${workflow.conclusion || 'N/A'}`);
        console.log(`   ID: ${workflow.databaseId}`);
        
        if (workflow.status === 'in_progress' || workflow.status === 'queued') {
            inProgress++;
        } else if (workflow.conclusion === 'success') {
            succeeded++;
            console.log('   ✅ SUCCESS');
        } else if (workflow.conclusion === 'failure') {
            failed++;
            failedWorkflows.push(workflow);
            console.log('   ❌ FAILED');
        }
    }
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   In Progress: ${inProgress}`);
    console.log(`   Succeeded: ${succeeded}`);
    console.log(`   Failed: ${failed}`);
    
    // If workflows are still running, wait and check again
    if (inProgress > 0) {
        console.log(`\n⏳ Workflows still running... checking again in ${CHECK_INTERVAL / 1000}s`);
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
        return { allSuccess: false, shouldContinue: true };
    }
    
    // If all succeeded, we're done!
    if (succeeded > 0 && failed === 0) {
        console.log('\n🎉 ALL WORKFLOWS SUCCEEDED!');
        return { allSuccess: true, shouldContinue: false };
    }
    
    // If we have failures, analyze and fix
    if (failed > 0) {
        console.log(`\n❌ ${failed} workflow(s) failed - analyzing...`);
        
        for (const workflow of failedWorkflows) {
            console.log(`\n🔍 Analyzing failed workflow: ${workflow.name || workflow.workflowName}`);
            
            const logs = getFailureLogs(workflow.databaseId);
            const fixes = analyzeAndFixErrors(logs);
            
            if (fixes.length > 0) {
                console.log(`\n🔧 Found ${fixes.length} potential fix(es):`);
                fixes.forEach(f => console.log(`   - ${f.action}`));
                
                await applyFixes(fixes);
            } else {
                console.log('  ℹ️  No automatic fixes available');
            }
        }
        
        // After fixes, trigger new workflow if retries available
        if (retryCount < MAX_RETRIES) {
            console.log(`\n🔄 Retry ${retryCount + 1}/${MAX_RETRIES}`);
            const triggered = triggerNewWorkflow();
            
            if (triggered) {
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s for workflow to start
                return { allSuccess: false, shouldContinue: true };
            }
        } else {
            console.log(`\n⚠️  Max retries (${MAX_RETRIES}) reached`);
            return { allSuccess: false, shouldContinue: false };
        }
    }
    
    return { allSuccess: false, shouldContinue: false };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    let continueMonitoring = true;
    
    while (continueMonitoring) {
        const result = await monitorLoop();
        
        if (result.allSuccess) {
            console.log('\n' + '═'.repeat(60));
            console.log('✅ MISSION COMPLETE - ALL WORKFLOWS SUCCEEDED');
            console.log('═'.repeat(60));
            console.log(`Total checks: ${retryCount + 1}`);
            console.log(`Duration: ${Math.round((Date.now() - startTime) / 1000)}s`);
            console.log('═'.repeat(60));
            
            // Save success report
            const report = {
                timestamp: new Date().toISOString(),
                version: '2.0.2',
                totalChecks: retryCount + 1,
                duration: Math.round((Date.now() - startTime) / 1000),
                status: 'SUCCESS'
            };
            
            fs.writeJsonSync(path.join(ROOT, 'MONITORING_SUCCESS_REPORT.json'), report, { spaces: 2 });
            
            break;
        }
        
        if (!result.shouldContinue) {
            if (result.shouldRetry) {
                console.log('\n⏳ Waiting for retry...');
                await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
            } else {
                console.log('\n⚠️  Monitoring stopped - manual intervention may be required');
                break;
            }
        }
    }
}

const startTime = Date.now();
main().catch(error => {
    console.error('\n❌ CRITICAL ERROR:', error);
    process.exit(1);
});
