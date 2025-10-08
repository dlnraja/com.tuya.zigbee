#!/usr/bin/env node
'use strict';

/**
 * GITHUB ACTIONS MONITOR
 * Real-time monitoring of GitHub Actions workflows
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

console.log('⚙️  GITHUB ACTIONS MONITOR');
console.log('═'.repeat(60));

const ROOT = path.join(__dirname, '..');

// ============================================================================
// CHECK GH CLI AVAILABILITY
// ============================================================================

function checkGhCli() {
    try {
        execSync('gh --version', { stdio: 'pipe' });
        console.log('✅ GitHub CLI (gh) is installed');
        return true;
    } catch (error) {
        console.log('⚠️  GitHub CLI (gh) not found - attempting alternative methods');
        return false;
    }
}

// ============================================================================
// MONITOR WITH GH CLI
// ============================================================================

function monitorWithGhCli() {
    console.log('\n📊 Fetching latest workflow runs...\n');
    
    try {
        const output = execSync('gh run list --limit 5', { 
            cwd: ROOT,
            encoding: 'utf8',
            stdio: 'pipe'
        });
        
        console.log(output);
        
        // Get detailed status of latest run
        console.log('\n📋 Latest workflow details:\n');
        const detailOutput = execSync('gh run view', {
            cwd: ROOT,
            encoding: 'utf8',
            stdio: 'pipe'
        });
        
        console.log(detailOutput);
        
    } catch (error) {
        console.log('❌ Failed to fetch workflow status with gh CLI');
        console.log('   Error:', error.message);
    }
}

// ============================================================================
// MONITOR WITH GIT LOG
// ============================================================================

function monitorWithGitLog() {
    console.log('\n📝 Recent Git activity:\n');
    
    try {
        const output = execSync('git log --oneline -5', {
            cwd: ROOT,
            encoding: 'utf8'
        });
        
        console.log(output);
        
        // Get current branch and remote
        const branch = execSync('git branch --show-current', {
            cwd: ROOT,
            encoding: 'utf8'
        }).trim();
        
        const remote = execSync('git remote get-url origin', {
            cwd: ROOT,
            encoding: 'utf8'
        }).trim();
        
        console.log(`📍 Current branch: ${branch}`);
        console.log(`🔗 Remote: ${remote}`);
        
        // Extract GitHub username and repo name
        const match = remote.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
        
        if (match) {
            const [, username, repo] = match;
            const actionsUrl = `https://github.com/${username}/${repo}/actions`;
            
            console.log(`\n🚀 GitHub Actions Dashboard: ${actionsUrl}`);
            console.log('\n💡 You can also check workflow status manually at the link above');
        }
        
    } catch (error) {
        console.log('❌ Failed to retrieve Git information');
    }
}

// ============================================================================
// ANALYZE WORKFLOW FILES
// ============================================================================

function analyzeWorkflowFiles() {
    console.log('\n📁 Analyzing workflow configuration...\n');
    
    const workflowsDir = path.join(ROOT, '.github', 'workflows');
    
    if (!fs.existsSync(workflowsDir)) {
        console.log('⚠️  No workflows directory found');
        return;
    }
    
    const workflows = fs.readdirSync(workflowsDir)
        .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    
    workflows.forEach(file => {
        const filePath = path.join(workflowsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        console.log(`📄 ${file}:`);
        
        // Extract workflow name
        const nameMatch = content.match(/name:\s*['"]?([^'"]+)['"]?/);
        if (nameMatch) {
            console.log(`   Name: ${nameMatch[1]}`);
        }
        
        // Extract triggers
        const onMatch = content.match(/on:\s*([\s\S]*?)(?=\njobs:|\n\w+:)/);
        if (onMatch) {
            const triggers = onMatch[1].trim().split('\n').map(line => line.trim()).filter(Boolean);
            console.log(`   Triggers:`);
            triggers.slice(0, 3).forEach(t => console.log(`     • ${t}`));
        }
        
        // Check for Homey publish steps
        if (content.includes('homey app publish') || content.includes('homey app validate')) {
            console.log(`   ✨ Contains Homey publish/validate steps`);
        }
        
        console.log('');
    });
}

// ============================================================================
// INSTALLATION GUIDE
// ============================================================================

function showInstallationGuide() {
    console.log('\n═'.repeat(60));
    console.log('📦 GITHUB CLI INSTALLATION GUIDE');
    console.log('═'.repeat(60));
    console.log('\nTo enable advanced monitoring, install GitHub CLI:');
    console.log('\n🪟 Windows:');
    console.log('   winget install --id GitHub.cli');
    console.log('   OR download from: https://cli.github.com/');
    console.log('\n🐧 Linux:');
    console.log('   sudo apt install gh');
    console.log('\n🍎 macOS:');
    console.log('   brew install gh');
    console.log('\nAfter installation, authenticate:');
    console.log('   gh auth login');
    console.log('');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
    const hasGhCli = checkGhCli();
    
    if (hasGhCli) {
        monitorWithGhCli();
    } else {
        showInstallationGuide();
    }
    
    monitorWithGitLog();
    analyzeWorkflowFiles();
    
    console.log('═'.repeat(60));
    console.log('✅ MONITORING COMPLETE');
    console.log('═'.repeat(60));
    console.log('\n📌 NEXT STEPS:');
    console.log('  1. Check GitHub Actions dashboard for workflow status');
    console.log('  2. Wait for v2.0.1 to be published to Homey App Store');
    console.log('  3. Test SOS button and wireless switches after deployment');
    console.log('  4. Monitor for new diagnostic reports from users');
}

main();
