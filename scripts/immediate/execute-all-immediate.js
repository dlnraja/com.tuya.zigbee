#!/usr/bin/env node

/**
 * EXECUTE ALL IMMEDIATE TASKS
 * Master script to run all immediate actions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🚀 EXECUTING ALL IMMEDIATE TASKS\n');
console.log('═'.repeat(70));

const tasks = [
    {
        name: '1. Prepare Loïc Response',
        script: 'scripts/immediate/send-loic-response.js',
        description: 'Generate email for Loïc about BSEED issue'
    },
    {
        name: '2. Monitor Workflows',
        script: 'scripts/immediate/monitor-workflows.js',
        description: 'Check GitHub Actions workflow status'
    },
    {
        name: '3. Collect Metrics',
        script: 'scripts/analytics/collect-all-metrics.js',
        description: 'Collect PRs, Issues, and Devices metrics'
    },
    {
        name: '4. Optimize Patterns',
        script: 'scripts/optimization/optimize-patterns.js',
        description: 'Generate optimization recommendations'
    }
];

const results = {
    success: [],
    failed: [],
    reports: []
};

// Execute each task
tasks.forEach((task, index) => {
    console.log(`\n📋 ${task.name}\n`);
    console.log(`   ${task.description}\n`);
    
    try {
        execSync(`node ${task.script}`, {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..', '..')
        });
        
        results.success.push(task.name);
        console.log(`\n   ✅ ${task.name} completed!\n`);
        
    } catch (error) {
        results.failed.push(task.name);
        console.log(`\n   ❌ ${task.name} failed: ${error.message}\n`);
    }
    
    console.log('─'.repeat(70));
});

// Check for generated reports
console.log('\n📄 CHECKING GENERATED REPORTS\n');

const reportsDir = path.join(__dirname, '..', '..', 'reports');

if (fs.existsSync(reportsDir)) {
    const reportFiles = [
        'LOIC_EMAIL_READY.txt',
        'WORKFLOW_STATUS.md',
        'analytics/COMPLETE_METRICS.md',
        'optimization/PATTERN_OPTIMIZATION.md'
    ];
    
    reportFiles.forEach(file => {
        const filePath = path.join(reportsDir, file);
        if (fs.existsSync(filePath)) {
            results.reports.push(file);
            console.log(`   ✅ ${file}`);
        }
    });
}

// Generate summary report
const summaryFile = path.join(__dirname, '..', '..', 'reports', 'IMMEDIATE_EXECUTION_SUMMARY.md');

const summary = `# 🚀 IMMEDIATE TASKS EXECUTION SUMMARY

**Executed**: ${new Date().toLocaleString()}

---

## ✅ TASK RESULTS

### Successful (${results.success.length})

${results.success.map(t => `- ✅ ${t}`).join('\n')}

${results.failed.length > 0 ? `### Failed (${results.failed.length})

${results.failed.map(t => `- ❌ ${t}`).join('\n')}` : ''}

---

## 📄 GENERATED REPORTS

${results.reports.map(r => `- \`reports/${r}\``).join('\n')}

---

## 📋 NEXT ACTIONS

### Immediate

1. **Respond to Loïc**
   - File: \`reports/LOIC_EMAIL_READY.txt\`
   - Action: Copy email and send to loic.salmona@gmail.com
   - Or call: [redacted-phone]

2. **Monitor Workflows**
   - File: \`reports/WORKFLOW_STATUS.md\`
   - Action: Visit https://github.com/dlnraja/com.tuya.zigbee/actions
   - Manually trigger workflows for testing

3. **Create Test PR**
   - Script: \`node scripts/immediate/test-pr-handler.js\`
   - Action: Create PR to test auto-handler
   - Monitor: https://github.com/dlnraja/com.tuya.zigbee/actions

---

### This Week

1. **Verify Enrichment Run**
   - When: Next Monday 02:00 UTC
   - Check: GitHub Actions workflow execution
   - Verify: New devices added

2. **Collect Loïc Feedback**
   - Wait for response to email
   - Test BSEED driver with him
   - Adjust documentation if needed

3. **Adjust Templates**
   - Review \`reports/optimization/PATTERN_OPTIMIZATION.md\`
   - Implement Phase 1 optimizations
   - Test improvements

---

### This Month

1. **Analytics Automation**
   - Review \`reports/analytics/COMPLETE_METRICS.md\`
   - Track: PRs auto-merged, Issues responded, Devices added
   - Weekly review of metrics

2. **Optimize Patterns**
   - Implement recommended improvements
   - Add new detection patterns
   - Expand response templates

3. **Monitor & Adjust**
   - Collect metrics weekly
   - Adjust delays and schedules
   - Optimize based on data

---

## 📊 METRICS SNAPSHOT

${fs.existsSync(path.join(__dirname, '..', '..', 'reports', 'analytics', 'metrics.json'))
    ? `\`\`\`json
${fs.readFileSync(path.join(__dirname, '..', '..', 'reports', 'analytics', 'metrics.json'), 'utf8')}
\`\`\``
    : 'Metrics not yet collected'}

---

## 🔗 IMPORTANT LINKS

| Resource | URL |
|----------|-----|
| **GitHub Actions** | https://github.com/dlnraja/com.tuya.zigbee/actions |
| **Build Status** | https://tools.developer.homey.app/apps/app/com.tuya.zigbee |
| **Public Store** | https://homey.app/a/com.tuya.zigbee/ |
| **BSEED Issue Doc** | docs/support/BSEED_2GANG_ISSUE_RESPONSE.md |

---

## ✅ COMPLETION STATUS

- [${results.success.length >= 4 ? 'x' : ' '}] All tasks executed successfully
- [ ] Loïc contacted
- [ ] Workflows monitored
- [ ] Test PR created
- [ ] Metrics reviewed
- [ ] Optimizations planned

---

**Status**: ${results.failed.length === 0 ? '✅ ALL TASKS COMPLETED' : '⚠️ SOME TASKS FAILED'}  
**Next**: Execute manual actions listed above
`;

// Save summary
fs.writeFileSync(summaryFile, summary);

// Print final summary
console.log('\n' + '═'.repeat(70));
console.log('\n🎉 EXECUTION COMPLETE!\n');
console.log(`✅ Successful: ${results.success.length}/${tasks.length}`);
console.log(`📄 Reports: ${results.reports.length} generated\n`);
console.log(`📋 Summary: reports/IMMEDIATE_EXECUTION_SUMMARY.md\n`);

if (results.failed.length > 0) {
    console.log(`⚠️  Failed: ${results.failed.length}`);
    results.failed.forEach(t => console.log(`   - ${t}`));
    console.log('');
}

console.log('📋 NEXT STEPS:\n');
console.log('1. Review reports in reports/ directory');
console.log('2. Send email to Loïc (reports/LOIC_EMAIL_READY.txt)');
console.log('3. Monitor workflows (https://github.com/dlnraja/com.tuya.zigbee/actions)');
console.log('4. Create test PR: node scripts/immediate/test-pr-handler.js');
console.log('');
console.log('✅ ALL IMMEDIATE TASKS READY!\n');

process.exit(results.failed.length > 0 ? 1 : 0);
