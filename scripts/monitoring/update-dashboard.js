#!/usr/bin/env node

/**
 * UPDATE METRICS DASHBOARD
 * Real-time visual dashboard
 */

const fs = require('fs');
const path = require('path');

const METRICS_DIR = path.join(__dirname, '..', '..', 'reports', 'metrics');
const OUTPUT_FILE = path.join(METRICS_DIR, 'DASHBOARD.md');

console.log('\n📊 UPDATING DASHBOARD\n');
console.log('═'.repeat(70));

// Load metrics
const devicesFile = path.join(METRICS_DIR, 'devices-count.json');
const metricsFile = path.join(METRICS_DIR, 'github-metrics.json');

let devices = { current: { manufacturerIds: 0 }, added: { week: 0, month: 0 } };
let metrics = { period: { week: { prs: {}, issues: {} } }, rates: { week: {}, month: {} } };

if (fs.existsSync(devicesFile)) {
    devices = JSON.parse(fs.readFileSync(devicesFile, 'utf8'));
}

if (fs.existsSync(metricsFile)) {
    metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
}

// Create progress bar
function progressBar(value, max, length = 20) {
    const filled = Math.round((value / max) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${value}/${max}`;
}

// Create dashboard
const dashboard = `# 🎯 AUTOMATION DASHBOARD

**Live Status** | **Updated**: ${new Date().toLocaleString()}

---

## 🚀 REAL-TIME METRICS

### 📊 This Week Performance

#### Pull Requests Automation
\`\`\`
Auto-Merge Rate: ${metrics.rates?.week?.prAutoMergeRate || 0}%
${progressBar(parseFloat(metrics.rates?.week?.prAutoMergeRate || 0), 100, 25)}

Status: ${parseFloat(metrics.rates?.week?.prAutoMergeRate || 0) >= 80 ? '🟢 EXCELLENT' : parseFloat(metrics.rates?.week?.prAutoMergeRate || 0) >= 60 ? '🟡 GOOD' : '🔴 NEEDS IMPROVEMENT'}
Target: 80%
\`\`\`

#### Issues Automation
\`\`\`
Auto-Response Rate: ${metrics.rates?.week?.issueAutoRespondRate || 0}%
${progressBar(parseFloat(metrics.rates?.week?.issueAutoRespondRate || 0), 100, 25)}

Status: ${parseFloat(metrics.rates?.week?.issueAutoRespondRate || 0) >= 70 ? '🟢 EXCELLENT' : parseFloat(metrics.rates?.week?.issueAutoRespondRate || 0) >= 50 ? '🟡 GOOD' : '🔴 NEEDS IMPROVEMENT'}
Target: 70%
\`\`\`

#### Device Enrichment
\`\`\`
Devices Added This Week: ${devices.added?.week || 0}
${progressBar(devices.added?.week || 0, 20, 25)}

Status: ${devices.added?.week >= 10 ? '🟢 ON TRACK' : '🟡 BELOW TARGET'}
Target: 10-20 devices/week
\`\`\`

---

## 📈 CUMULATIVE STATS

### Overall Database
\`\`\`
Total Manufacturer IDs:     ${devices.current?.manufacturerIds || 0} devices
Total Drivers:              ${devices.current?.drivers || 0} drivers
Average IDs per Driver:     ${devices.current?.drivers > 0 ? (devices.current?.manufacturerIds / devices.current?.drivers).toFixed(1) : 0}
\`\`\`

### Automation Impact
\`\`\`
PRs Processed This Week:    ${metrics.period?.week?.prs?.total || 0}
  ├─ Auto-Merged:           ${metrics.period?.week?.prs?.autoMerged || 0}
  ├─ Manual Review:         ${(metrics.period?.week?.prs?.total || 0) - (metrics.period?.week?.prs?.autoMerged || 0)}
  └─ Device Support:        ${metrics.period?.week?.prs?.deviceSupport || 0}

Issues Handled This Week:   ${metrics.period?.week?.issues?.total || 0}
  ├─ Auto-Responded:        ${metrics.period?.week?.issues?.autoResponded || 0}
  ├─ Manual Response:       ${(metrics.period?.week?.issues?.total || 0) - (metrics.period?.week?.issues?.autoResponded || 0)}
  └─ Closed:                ${metrics.period?.week?.issues?.closed || 0}
\`\`\`

---

## 🎯 TARGETS & GOALS

| Goal | Current | Target | Progress |
|------|---------|--------|----------|
| PR Auto-Merge Rate | ${metrics.rates?.month?.prAutoMergeRate || 0}% | 80% | ${progressBar(parseFloat(metrics.rates?.month?.prAutoMergeRate || 0), 80, 10)} |
| Issue Auto-Response | ${metrics.rates?.month?.issueAutoRespondRate || 0}% | 70% | ${progressBar(parseFloat(metrics.rates?.month?.issueAutoRespondRate || 0), 70, 10)} |
| Devices/Month | ${devices.added?.month || 0} | 40 | ${progressBar(devices.added?.month || 0, 40, 10)} |

---

## 💡 QUICK STATUS

### System Health

| Component | Status | Last Check |
|-----------|--------|------------|
| Auto-Enrichment Workflow | ${devices.added?.week > 0 ? '🟢 Active' : '🟡 Idle'} | Last ${devices.added?.week || 0} devices added |
| PR Handler | ${metrics.period?.week?.prs?.autoMerged > 0 ? '🟢 Active' : '🟡 Idle'} | ${metrics.period?.week?.prs?.autoMerged || 0} PRs auto-merged |
| Issue Responder | ${metrics.period?.week?.issues?.autoResponded > 0 ? '🟢 Active' : '🟡 Idle'} | ${metrics.period?.week?.issues?.autoResponded || 0} issues handled |
| Metrics Collector | 🟢 Active | Real-time |

### Efficiency Gains

\`\`\`
Time Saved This Week:
  PR Review:        ~${(5 * (metrics.period?.week?.prs?.autoMerged || 0) / 60).toFixed(1)}h automated
  Issue Triage:     ~${(10 * (metrics.period?.week?.issues?.autoResponded || 0) / 60).toFixed(1)}h automated
  Total:            ~${((5 * (metrics.period?.week?.prs?.autoMerged || 0) + 10 * (metrics.period?.week?.issues?.autoResponded || 0)) / 60).toFixed(1)}h saved

Manual Effort Reduction: ${Math.min(90, Math.round((metrics.period?.week?.prs?.autoMerged || 0) + (metrics.period?.week?.issues?.autoResponded || 0)) * 5)}%
\`\`\`

---

## 📊 TRENDS

### Growth Over Time

\`\`\`
Week:  ${devices.added?.week || 0} devices added
Month: ${devices.added?.month || 0} devices added
Rate:  ${devices.added?.week > 0 ? `~${(devices.added.month / 4).toFixed(1)} devices/week avg` : 'N/A'}
\`\`\`

### Automation Adoption

\`\`\`
Week:  ${metrics.rates?.week?.prAutoMergeRate || 0}% PR automation
Month: ${metrics.rates?.month?.prAutoMergeRate || 0}% PR automation
Trend: ${parseFloat(metrics.rates?.week?.prAutoMergeRate || 0) >= parseFloat(metrics.rates?.month?.prAutoMergeRate || 0) ? '📈 Improving' : '📉 Needs attention'}
\`\`\`

---

## 🎉 ACHIEVEMENTS

${parseFloat(metrics.rates?.month?.prAutoMergeRate || 0) >= 80 ? '🏆 **GOLD**: PR Auto-Merge Rate > 80%\n' : ''}${parseFloat(metrics.rates?.month?.issueAutoRespondRate || 0) >= 70 ? '🏆 **GOLD**: Issue Auto-Response > 70%\n' : ''}${devices.added?.month >= 40 ? '🏆 **GOLD**: Device Enrichment > 40/month\n' : ''}${parseFloat(metrics.rates?.month?.prAutoMergeRate || 0) >= 80 && parseFloat(metrics.rates?.month?.issueAutoRespondRate || 0) >= 70 && devices.added?.month >= 40 ? '\n🎯 **ALL TARGETS MET!** System running at peak performance!' : '\n⏳ Keep improving to reach all targets!'}

---

## 📞 QUICK LINKS

- 📊 [Full Report](METRICS_REPORT.md)
- 🔧 [GitHub Actions](https://github.com/dlnraja/com.tuya.zigbee/actions)
- 📝 [Documentation](../../docs/AUTOMATION_COMPLETE.md)
- 🐛 [Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)

---

**Refresh Rate**: Daily at 00:00 UTC  
**Live Updates**: On every PR/Issue event  
**Status**: ${parseFloat(metrics.rates?.month?.prAutoMergeRate || 0) >= 80 && parseFloat(metrics.rates?.month?.issueAutoRespondRate || 0) >= 70 ? '✅ OPTIMAL' : '⏳ OPTIMIZING'}
`;

// Save dashboard
if (!fs.existsSync(METRICS_DIR)) {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, dashboard);

console.log(`\n✅ Dashboard updated: ${OUTPUT_FILE}`);
console.log('\n📊 UPDATE COMPLETE!\n');

process.exit(0);
