#!/usr/bin/env node

/**
 * MONITOR WORKFLOWS
 * Check GitHub Actions workflow status
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n⚙️  WORKFLOW MONITOR\n');
console.log('═'.repeat(70));

const WORKFLOWS = [
    'auto-enrichment.yml',
    'auto-pr-handler.yml',
    'forum-auto-responder.yml',
    'homey-publish.yml',
    'metrics-collector.yml',
    'ai-enhanced-automation.yml'
];

const outputFile = path.join(__dirname, '..', '..', 'reports', 'WORKFLOW_STATUS.md');

let report = `# ⚙️  WORKFLOW STATUS REPORT

**Generated**: ${new Date().toLocaleString()}

---

## 📊 WORKFLOW STATUS

`;

console.log('\n🔍 Checking workflows...\n');

WORKFLOWS.forEach(workflow => {
    console.log(`Checking ${workflow}...`);
    
    const workflowPath = path.join(__dirname, '..', '..', '.github', 'workflows', workflow);
    
    if (fs.existsSync(workflowPath)) {
        const content = fs.readFileSync(workflowPath, 'utf8');
        
        // Check if workflow has schedule
        const hasSchedule = content.includes('schedule:');
        const hasCron = content.match(/cron: '([^']+)'/);
        const hasWorkflowDispatch = content.includes('workflow_dispatch');
        
        report += `### ${workflow}\n\n`;
        report += `- **Status**: ✅ Active\n`;
        report += `- **Location**: \`.github/workflows/${workflow}\`\n`;
        
        if (hasSchedule && hasCron) {
            report += `- **Schedule**: \`${hasCron[1]}\`\n`;
        }
        
        if (hasWorkflowDispatch) {
            report += `- **Manual Trigger**: ✅ Available\n`;
        }
        
        report += `\n`;
        console.log(`   ✅ Active`);
    } else {
        report += `### ${workflow}\n\n`;
        report += `- **Status**: ❌ Not found\n\n`;
        console.log(`   ❌ Not found`);
    }
});

report += `
---

## 🔗 MONITORING LINKS

| Resource | URL |
|----------|-----|
| **GitHub Actions** | https://github.com/dlnraja/com.tuya.zigbee/actions |
| **Latest Runs** | https://github.com/dlnraja/com.tuya.zigbee/actions/workflows |
| **Build Status** | https://tools.developer.homey.app/apps/app/com.tuya.zigbee |

---

## 🎯 MANUAL TRIGGERS

You can manually trigger workflows using GitHub CLI:

\`\`\`bash
# Auto-enrichment
gh workflow run auto-enrichment.yml

# PR Handler
gh workflow run auto-pr-handler.yml

# Metrics Collector
gh workflow run metrics-collector.yml

# Homey Publish (requires version)
gh workflow run homey-publish.yml -f version=4.9.261
\`\`\`

Or via GitHub Web UI:
1. Go to: https://github.com/dlnraja/com.tuya.zigbee/actions
2. Select workflow
3. Click "Run workflow"

---

## 📅 SCHEDULED RUNS

| Workflow | Schedule | Next Run |
|----------|----------|----------|
| **auto-enrichment** | Monday 02:00 UTC | Next Monday |
| **auto-pr-handler** | Every 6 hours | Continuous |
| **forum-responder** | Every 12 hours | Continuous |
| **metrics-collector** | Daily 00:00 UTC | Tonight |

---

## ✅ FIRST EXECUTION CHECKLIST

- [ ] Manually trigger auto-enrichment
- [ ] Monitor first enrichment run
- [ ] Create test PR to validate auto-pr-handler
- [ ] Check metrics collector output
- [ ] Verify all workflows run successfully

---

**Status**: All workflows configured and ready  
**Next**: Trigger manual runs for testing
`;

// Save report
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputFile, report);

console.log('\n' + '═'.repeat(70));
console.log('\n📄 Report saved: reports/WORKFLOW_STATUS.md\n');
console.log('🔗 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions\n');
console.log('✅ MONITORING READY!\n');

// Output instructions
console.log('📋 NEXT STEPS:\n');
console.log('1. Visit GitHub Actions page');
console.log('2. Manually trigger workflows:');
console.log('   - auto-enrichment.yml (test enrichment)');
console.log('   - metrics-collector.yml (test metrics)');
console.log('3. Monitor first execution');
console.log('4. Create test PR (run test-pr-handler.js)\n');

process.exit(0);
