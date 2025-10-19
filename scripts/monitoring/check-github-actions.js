#!/usr/bin/env node
'use strict';

/**
 * GITHUB ACTIONS MONITORING
 * 
 * Monitors GitHub Actions workflows and reports status
 */

const { execSync } = require('child_process');

console.log('🔍 MONITORING GITHUB ACTIONS\n');
console.log('='.repeat(60));

try {
  // Check if gh CLI is available
  execSync('gh --version', { stdio: 'pipe' });
} catch (err) {
  console.log('❌ GitHub CLI not installed');
  console.log('📥 Install from: https://cli.github.com/');
  process.exit(1);
}

// Get latest workflow runs
console.log('\n📊 LATEST WORKFLOW RUNS:\n');

try {
  const runs = execSync('gh run list --limit 10 --json status,conclusion,name,createdAt,workflowName', {
    encoding: 'utf8'
  });
  
  const runsData = JSON.parse(runs);
  
  for (const run of runsData) {
    const icon = run.conclusion === 'success' ? '✅' : 
                 run.conclusion === 'failure' ? '❌' :
                 run.status === 'in_progress' ? '⏳' :
                 run.status === 'queued' ? '⏸️' : '❔';
    
    const status = run.conclusion || run.status;
    console.log(`${icon} ${run.workflowName}: ${status}`);
  }
} catch (err) {
  console.log('❌ Error fetching workflow runs:', err.message);
}

// Check auto-publish workflow specifically
console.log('\n🚀 AUTO-PUBLISH WORKFLOW:\n');

try {
  const publishRuns = execSync('gh run list --workflow="auto-publish.yml" --limit 3 --json status,conclusion,createdAt,headBranch', {
    encoding: 'utf8'
  });
  
  const publishData = JSON.parse(publishRuns);
  
  if (publishData.length > 0) {
    const latest = publishData[0];
    const icon = latest.conclusion === 'success' ? '✅' : 
                 latest.conclusion === 'failure' ? '❌' :
                 latest.status === 'in_progress' ? '⏳' : '❔';
    
    console.log(`${icon} Latest: ${latest.conclusion || latest.status}`);
    console.log(`📅 Date: ${new Date(latest.createdAt).toLocaleString()}`);
    console.log(`🌿 Branch: ${latest.headBranch}`);
    
    if (latest.conclusion === 'success') {
      console.log('\n✅ App should be available on Homey App Store!');
    } else if (latest.status === 'in_progress') {
      console.log('\n⏳ Publication in progress...');
    } else if (latest.conclusion === 'failure') {
      console.log('\n❌ Last publication failed. Check logs with:');
      console.log('   gh run view --log');
    }
  } else {
    console.log('ℹ️  No auto-publish runs found');
  }
} catch (err) {
  console.log('❌ Error checking auto-publish:', err.message);
}

console.log('\n' + '='.repeat(60));
console.log('\n💡 Useful commands:');
console.log('  gh run list                  - List all runs');
console.log('  gh run view                  - View latest run details');
console.log('  gh run watch                 - Watch run in real-time');
console.log('  gh run view --log            - View run logs');
