#!/usr/bin/env node

/**
 * GENERATE METRICS REPORT
 * Create markdown report with all metrics
 */

const fs = require('fs');
const path = require('path');

const METRICS_DIR = path.join(__dirname, '..', '..', 'reports', 'metrics');
const OUTPUT_FILE = path.join(METRICS_DIR, 'METRICS_REPORT.md');

console.log('\n📄 GENERATING METRICS REPORT\n');
console.log('═'.repeat(70));

// Load all metrics
const devicesFile = path.join(METRICS_DIR, 'devices-count.json');
const metricsFile = path.join(METRICS_DIR, 'github-metrics.json');

let devices = { current: { drivers: 0, manufacturerIds: 0 }, added: { week: 0, month: 0 } };
let metrics = { period: { week: {}, month: {} }, rates: { week: {}, month: {} } };

if (fs.existsSync(devicesFile)) {
    devices = JSON.parse(fs.readFileSync(devicesFile, 'utf8'));
}

if (fs.existsSync(metricsFile)) {
    metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
}

// Generate report
const report = `# 📊 AUTOMATION METRICS REPORT

**Generated**: ${new Date().toLocaleString()}  
**Version**: v4.9.260+

---

## 🎯 KEY PERFORMANCE INDICATORS

### Automation Success Rates

| Metric | This Week | This Month | Target | Status |
|--------|-----------|------------|--------|--------|
| **PR Auto-Merge Rate** | ${metrics.rates?.week?.prAutoMergeRate || 0}% | ${metrics.rates?.month?.prAutoMergeRate || 0}% | 80% | ${(parseFloat(metrics.rates?.week?.prAutoMergeRate || 0) >= 80) ? '✅' : '⚠️'} |
| **Issue Auto-Response Rate** | ${metrics.rates?.week?.issueAutoRespondRate || 0}% | ${metrics.rates?.month?.issueAutoRespondRate || 0}% | 70% | ${(parseFloat(metrics.rates?.week?.issueAutoRespondRate || 0) >= 70) ? '✅' : '⚠️'} |

### Device Enrichment

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Total Devices** | ${devices.current.manufacturerIds} | - | 📈 |
| **Devices Added (Week)** | ${devices.added.week} | 10-20 | ${(devices.added.week >= 10 && devices.added.week <= 20) ? '✅' : '⚠️'} |
| **Devices Added (Month)** | ${devices.added.month} | 40-80 | ${(devices.added.month >= 40) ? '✅' : '⚠️'} |
| **Total Drivers** | ${devices.current.drivers} | - | 📊 |

---

## 📈 WEEKLY METRICS

### Pull Requests

\`\`\`
Total PRs:              ${metrics.period?.week?.prs?.total || 0}
Merged:                 ${metrics.period?.week?.prs?.merged || 0}
Auto-Merged:            ${metrics.period?.week?.prs?.autoMerged || 0}
Device Support PRs:     ${metrics.period?.week?.prs?.deviceSupport || 0}
\`\`\`

### Issues

\`\`\`
Total Issues:           ${metrics.period?.week?.issues?.total || 0}
Closed:                 ${metrics.period?.week?.issues?.closed || 0}
Auto-Responded:         ${metrics.period?.week?.issues?.autoResponded || 0}
\`\`\`

---

## 📊 MONTHLY METRICS

### Pull Requests

\`\`\`
Total PRs:              ${metrics.period?.month?.prs?.total || 0}
Merged:                 ${metrics.period?.month?.prs?.merged || 0}
Auto-Merged:            ${metrics.period?.month?.prs?.autoMerged || 0}
Device Support PRs:     ${metrics.period?.month?.prs?.deviceSupport || 0}
\`\`\`

### Issues

\`\`\`
Total Issues:           ${metrics.period?.month?.issues?.total || 0}
Closed:                 ${metrics.period?.month?.issues?.closed || 0}
Auto-Responded:         ${metrics.period?.month?.issues?.autoResponded || 0}
\`\`\`

---

## 🏆 ACHIEVEMENTS

### Automation Efficiency

| Achievement | Status | Progress |
|-------------|--------|----------|
| 80%+ PRs Auto-Merged | ${(parseFloat(metrics.rates?.month?.prAutoMergeRate || 0) >= 80) ? '✅ Achieved' : '⏳ In Progress'} | ${metrics.rates?.month?.prAutoMergeRate || 0}% |
| 70%+ Issues Auto-Responded | ${(parseFloat(metrics.rates?.month?.issueAutoRespondRate || 0) >= 70) ? '✅ Achieved' : '⏳ In Progress'} | ${metrics.rates?.month?.issueAutoRespondRate || 0}% |
| 40+ Devices/Month | ${(devices.added.month >= 40) ? '✅ Achieved' : '⏳ In Progress'} | ${devices.added.month} devices |

### Time Saved

Based on automation rates:

\`\`\`
Manual PR review time:     5 min × ${metrics.period?.month?.prs?.total || 0} = ${(5 * (metrics.period?.month?.prs?.total || 0))} min
Automated PR time:         30 sec × ${metrics.period?.month?.prs?.autoMerged || 0} = ${(0.5 * (metrics.period?.month?.prs?.autoMerged || 0)).toFixed(0)} min
Manual issue triage:       10 min × ${metrics.period?.month?.issues?.total || 0} = ${(10 * (metrics.period?.month?.issues?.total || 0))} min
Automated issue time:      Instant

Estimated time saved this month: ${Math.max(0, (5 * ((metrics.period?.month?.prs?.total || 0) - (metrics.period?.month?.prs?.autoMerged || 0))) + (10 * ((metrics.period?.month?.issues?.total || 0) - (metrics.period?.month?.issues?.autoResponded || 0))))} minutes
\`\`\`

---

## 🔝 TOP DRIVERS

${devices.topDrivers ? devices.topDrivers.map((d, i) => 
    `${i + 1}. **${d.driver}**: ${d.count} devices`
).join('\n') : 'No data'}

---

## 📅 TRENDS

### Weekly Comparison

\`\`\`
PRs auto-merge rate:        ${metrics.rates?.week?.prAutoMergeRate || 0}%
Issues auto-respond rate:   ${metrics.rates?.week?.issueAutoRespondRate || 0}%
Devices added:              ${devices.added.week}
\`\`\`

### Monthly Comparison

\`\`\`
PRs auto-merge rate:        ${metrics.rates?.month?.prAutoMergeRate || 0}%
Issues auto-respond rate:   ${metrics.rates?.month?.issueAutoRespondRate || 0}%
Devices added:              ${devices.added.month}
\`\`\`

---

## 💡 INSIGHTS & RECOMMENDATIONS

### Performance Analysis

${(parseFloat(metrics.rates?.month?.prAutoMergeRate || 0) >= 80) ? 
'✅ **Excellent PR automation** - Target exceeded!' : 
'⚠️ **PR automation below target** - Review validation patterns'}

${(parseFloat(metrics.rates?.month?.issueAutoRespondRate || 0) >= 70) ?
'✅ **Excellent issue automation** - Target exceeded!' :
'⚠️ **Issue automation below target** - Expand response templates'}

${(devices.added.month >= 40) ?
'✅ **Good device enrichment** - On track for growth' :
'⚠️ **Low device additions** - Check enrichment workflows'}

### Action Items

${(parseFloat(metrics.rates?.month?.prAutoMergeRate || 0) < 80) ? '- [ ] Review and optimize PR validation patterns\n' : ''}${(parseFloat(metrics.rates?.month?.issueAutoRespondRate || 0) < 70) ? '- [ ] Add more issue response templates\n' : ''}${(devices.added.month < 40) ? '- [ ] Verify enrichment scripts running correctly\n' : ''}${(parseFloat(metrics.rates?.month?.prAutoMergeRate || 0) >= 80 && parseFloat(metrics.rates?.month?.issueAutoRespondRate || 0) >= 70 && devices.added.month >= 40) ? '- [x] All targets met! Continue monitoring.\n' : ''}

---

## 📞 RESOURCES

- **GitHub Actions**: https://github.com/dlnraja/com.tuya.zigbee/actions
- **Metrics Dashboard**: reports/metrics/DASHBOARD.md
- **Raw Data**: reports/metrics/*.json

---

**Last Updated**: ${new Date().toISOString()}  
**Status**: ${(parseFloat(metrics.rates?.month?.prAutoMergeRate || 0) >= 80 && parseFloat(metrics.rates?.month?.issueAutoRespondRate || 0) >= 70) ? '✅ TARGETS MET' : '⏳ IN PROGRESS'}
`;

// Save report
if (!fs.existsSync(METRICS_DIR)) {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, report);

console.log(`\n✅ Report generated: ${OUTPUT_FILE}`);
console.log('\n📊 GENERATION COMPLETE!\n');

process.exit(0);
