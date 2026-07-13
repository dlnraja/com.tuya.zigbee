const fs = require('fs');
const data = JSON.parse(fs.readFileSync('.github/state/temporal-cross-reference.json', 'utf8'));

// Find CLOSED button issues with long time-to-fix
console.log('=== Button issues with long time-to-fix ===');
const withFix = data.issues.filter(i => i.timeToFix_days !== null && i.timeToFix_days > 0);
console.log('Total with fix time:', withFix.length);
const sorted = withFix.sort((a, b) => b.timeToFix_days - a.timeToFix_days).slice(0, 10);
for (const i of sorted) {
  console.log('#' + i.number + ' (' + i.timeToFix_days + 'd fix) ' + i.title);
}

// Also find closed issues that have 'reopened' in labels
const reopened = data.issues.filter(i => i.labels && i.labels.some(l => l.toLowerCase().includes('reopen')));
console.log('\n=== Reopened button issues ===');
for (const i of reopened) {
  console.log('#' + i.number + ' (' + (i.age_days || '?') + 'd old, ' + i.state + ') ' + i.title);
}

// Forum topics with replies about buttons
console.log('\n=== Forum button topics ===');
for (const t of data.forum) {
  console.log('#' + t.id + ' (' + t.postsCount + ' posts, last: ' + t.lastPostedAt.substring(0, 10) + ') ' + t.title);
}
