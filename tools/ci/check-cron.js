// check-cron.js — show current cron schedules of conflicting files
const fs = require('fs');
const files = [
  'activity-monitor.yml',
  'blakadder-fetch.yml',
  'driver-maintenance.yml',
  'auto-fix-and-publish.yml',
  'autonomous-verification.yml',
  'fetch-diags.yml',
];
for (const f of files) {
  const content = fs.readFileSync('.github/workflows/' + f, 'utf8');
  const cronMatch = content.match(/cron:\s*['"]([^'"]+)['"]/g);
  console.log(f, ':', cronMatch);
}
