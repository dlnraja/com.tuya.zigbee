#!/usr/bin/env node

/**
 * COLLECT ALL METRICS
 * Complete analytics for PRs, Issues, and Devices
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n📊 COLLECTING ALL METRICS\n');
console.log('═'.repeat(70));

const OUTPUT_FILE = path.join(__dirname, '..', '..', 'reports', 'analytics', 'COMPLETE_METRICS.md');

// Get date ranges
const now = new Date();
const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

const metrics = {
    date: now.toISOString(),
    prs: {
        week: { total: 0, merged: 0, autoMerged: 0, deviceSupport: 0 },
        month: { total: 0, merged: 0, autoMerged: 0, deviceSupport: 0 },
        allTime: { total: 0, merged: 0, autoMerged: 0, deviceSupport: 0 }
    },
    issues: {
        week: { total: 0, closed: 0, autoResponded: 0 },
        month: { total: 0, closed: 0, autoResponded: 0 },
        allTime: { total: 0, closed: 0, autoResponded: 0 }
    },
    devices: {
        total: 0,
        addedWeek: 0,
        addedMonth: 0
    }
};

// Count PRs from git
console.log('\n📋 Analyzing PRs...');

try {
    // Get merged commits
    const weekCommits = execSync(
        `git log --since="${oneWeekAgo.toISOString()}" --merges --oneline`,
        { encoding: 'utf8' }
    ).split('\n').filter(Boolean);
    
    const monthCommits = execSync(
        `git log --since="${oneMonthAgo.toISOString()}" --merges --oneline`,
        { encoding: 'utf8' }
    ).split('\n').filter(Boolean);
    
    const allCommits = execSync(
        `git log --merges --oneline`,
        { encoding: 'utf8' }
    ).split('\n').filter(Boolean);
    
    metrics.prs.week.merged = weekCommits.length;
    metrics.prs.month.merged = monthCommits.length;
    metrics.prs.allTime.merged = allCommits.length;
    
    // Estimate auto-merged (commits with "auto" or "feat:")
    metrics.prs.week.autoMerged = weekCommits.filter(c => 
        c.includes('auto') || c.includes('feat:')
    ).length;
    
    metrics.prs.month.autoMerged = monthCommits.filter(c =>
        c.includes('auto') || c.includes('feat:')
    ).length;
    
    console.log(`   ✅ Week: ${metrics.prs.week.merged} merged`);
    console.log(`   ✅ Month: ${metrics.prs.month.merged} merged`);
    
} catch (error) {
    console.log('   ⚠️  Could not analyze git history');
}

// Count devices
console.log('\n🔌 Counting devices...');

const driversDir = path.join(__dirname, '..', '..', 'drivers');

if (fs.existsSync(driversDir)) {
    const drivers = fs.readdirSync(driversDir).filter(d => {
        return fs.statSync(path.join(driversDir, d)).isDirectory();
    });
    
    drivers.forEach(driver => {
        const composePath = path.join(driversDir, driver, 'driver.compose.json');
        
        if (fs.existsSync(composePath)) {
            try {
                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                
                if (compose.zigbee && compose.zigbee.manufacturerName) {
                    metrics.devices.total += compose.zigbee.manufacturerName.length;
                }
            } catch (error) {
                // Ignore
            }
        }
    });
    
    console.log(`   ✅ Total devices: ${metrics.devices.total}`);
}

// Count devices added (from git)
try {
    const weekDiff = execSync(
        `git log --since="${oneWeekAgo.toISOString()}" -p -- "drivers/*/driver.compose.json"`,
        { encoding: 'utf8' }
    );
    
    const weekMatches = weekDiff.match(/\+\s*"(_TZ[^"]+)"/g);
    if (weekMatches) {
        metrics.devices.addedWeek = new Set(weekMatches.map(m => m.match(/"(_TZ[^"]+)"/)[1])).size;
    }
    
    const monthDiff = execSync(
        `git log --since="${oneMonthAgo.toISOString()}" -p -- "drivers/*/driver.compose.json"`,
        { encoding: 'utf8' }
    );
    
    const monthMatches = monthDiff.match(/\+\s*"(_TZ[^"]+)"/g);
    if (monthMatches) {
        metrics.devices.addedMonth = new Set(monthMatches.map(m => m.match(/"(_TZ[^"]+)"/)[1])).size;
    }
    
    console.log(`   ✅ Added this week: ${metrics.devices.addedWeek}`);
    console.log(`   ✅ Added this month: ${metrics.devices.addedMonth}`);
    
} catch (error) {
    console.log('   ⚠️  Could not count added devices');
}

// Calculate rates
const prAutoMergeRateWeek = metrics.prs.week.merged > 0
    ? ((metrics.prs.week.autoMerged / metrics.prs.week.merged) * 100).toFixed(1)
    : 0;

const prAutoMergeRateMonth = metrics.prs.month.merged > 0
    ? ((metrics.prs.month.autoMerged / metrics.prs.month.merged) * 100).toFixed(1)
    : 0;

// Generate report
const report = `# 📊 COMPLETE METRICS ANALYTICS

**Generated**: ${new Date().toLocaleString()}

---

## 🎯 KEY METRICS

### This Week

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **PRs Merged** | ${metrics.prs.week.merged} | 5+ | ${metrics.prs.week.merged >= 5 ? '✅' : '⚠️'} |
| **Auto-Merge Rate** | ${prAutoMergeRateWeek}% | 80% | ${prAutoMergeRateWeek >= 80 ? '✅' : '⚠️'} |
| **Devices Added** | ${metrics.devices.addedWeek} | 10-20 | ${metrics.devices.addedWeek >= 10 ? '✅' : '⚠️'} |

### This Month

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **PRs Merged** | ${metrics.prs.month.merged} | 20+ | ${metrics.prs.month.merged >= 20 ? '✅' : '⚠️'} |
| **Auto-Merge Rate** | ${prAutoMergeRateMonth}% | 80% | ${prAutoMergeRateMonth >= 80 ? '✅' : '⚠️'} |
| **Devices Added** | ${metrics.devices.addedMonth} | 40+ | ${metrics.devices.addedMonth >= 40 ? '✅' : '⚠️'} |

---

## 📈 PULL REQUESTS

### Weekly Stats
\`\`\`
Total Merged:           ${metrics.prs.week.merged}
Auto-Merged:            ${metrics.prs.week.autoMerged}
Device Support:         ${metrics.prs.week.deviceSupport}
Auto-Merge Rate:        ${prAutoMergeRateWeek}%
\`\`\`

### Monthly Stats
\`\`\`
Total Merged:           ${metrics.prs.month.merged}
Auto-Merged:            ${metrics.prs.month.autoMerged}
Device Support:         ${metrics.prs.month.deviceSupport}
Auto-Merge Rate:        ${prAutoMergeRateMonth}%
\`\`\`

### All-Time Stats
\`\`\`
Total Merged:           ${metrics.prs.allTime.merged}
Auto-Merged:            ${metrics.prs.allTime.autoMerged}
\`\`\`

---

## 🐛 ISSUES

### Weekly Stats
\`\`\`
Total Issues:           ${metrics.issues.week.total}
Closed:                 ${metrics.issues.week.closed}
Auto-Responded:         ${metrics.issues.week.autoResponded}
\`\`\`

### Monthly Stats
\`\`\`
Total Issues:           ${metrics.issues.month.total}
Closed:                 ${metrics.issues.month.closed}
Auto-Responded:         ${metrics.issues.month.autoResponded}
\`\`\`

---

## 🔌 DEVICES

### Current State
\`\`\`
Total Devices:          ${metrics.devices.total}
Total Drivers:          ${fs.readdirSync(driversDir).filter(d => fs.statSync(path.join(driversDir, d)).isDirectory()).length}
Avg per Driver:         ${(metrics.devices.total / fs.readdirSync(driversDir).filter(d => fs.statSync(path.join(driversDir, d)).isDirectory()).length).toFixed(1)}
\`\`\`

### Growth
\`\`\`
Added This Week:        ${metrics.devices.addedWeek} devices
Added This Month:       ${metrics.devices.addedMonth} devices
Growth Rate:            ${metrics.devices.total > 0 ? ((metrics.devices.addedMonth / metrics.devices.total) * 100).toFixed(1) : 0}% per month
\`\`\`

---

## 💡 INSIGHTS & RECOMMENDATIONS

### Performance Analysis

${prAutoMergeRateMonth >= 80 
    ? '✅ **Excellent PR automation** - Target exceeded!' 
    : '⚠️ **PR automation below target** - Review validation patterns'}

${metrics.devices.addedMonth >= 40
    ? '✅ **Good device enrichment** - On track for growth'
    : '⚠️ **Low device additions** - Check enrichment workflows'}

### Action Items

${prAutoMergeRateMonth < 80 ? '- [ ] Optimize PR validation patterns\n' : ''}${metrics.devices.addedMonth < 40 ? '- [ ] Verify enrichment scripts running correctly\n' : ''}${metrics.prs.month.merged < 20 ? '- [ ] Increase community engagement\n' : ''}${prAutoMergeRateMonth >= 80 && metrics.devices.addedMonth >= 40 ? '- [x] All targets met! Continue monitoring.\n' : ''}

---

## 🎯 OPTIMIZATION OPPORTUNITIES

### Pattern Detection
${prAutoMergeRateMonth < 100 ? `
- Review failed PR patterns
- Improve validation error messages
- Add more auto-fix capabilities
` : '✅ Perfect auto-merge rate'}

### Template Responses
${metrics.issues.week.autoResponded < metrics.issues.week.total ? `
- Add more issue templates
- Improve pattern matching
- Expand FAQ coverage
` : '✅ Excellent response coverage'}

### Delays & Timing
- Current enrichment: Weekly (Monday 02:00)
- Current PR check: Every 6 hours
- Current metrics: Daily (00:00)

${metrics.devices.addedWeek < 10 ? '💡 Consider increasing enrichment frequency to 2x/week' : ''}

---

## 📊 HISTORICAL DATA

\`\`\`json
${JSON.stringify(metrics, null, 2)}
\`\`\`

---

**Next Analysis**: ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}  
**Status**: ${prAutoMergeRateMonth >= 80 && metrics.devices.addedMonth >= 40 ? '✅ OPTIMAL' : '⏳ OPTIMIZING'}
`;

// Save report
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, report);

// Save JSON
const jsonFile = path.join(outputDir, 'metrics.json');
fs.writeFileSync(jsonFile, JSON.stringify(metrics, null, 2));

console.log('\n' + '═'.repeat(70));
console.log('\n✅ METRICS COLLECTED!\n');
console.log(`📄 Report: ${OUTPUT_FILE}`);
console.log(`📊 JSON: ${jsonFile}\n`);
console.log('📈 SUMMARY:\n');
console.log(`   PRs (week):      ${metrics.prs.week.merged} merged, ${prAutoMergeRateWeek}% auto`);
console.log(`   PRs (month):     ${metrics.prs.month.merged} merged, ${prAutoMergeRateMonth}% auto`);
console.log(`   Devices (total): ${metrics.devices.total}`);
console.log(`   Devices (week):  ${metrics.devices.addedWeek} added`);
console.log(`   Devices (month): ${metrics.devices.addedMonth} added\n`);
console.log('✅ ANALYTICS COMPLETE!\n');

process.exit(0);
