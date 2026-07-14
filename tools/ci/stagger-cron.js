// stagger-cron.js — Stagger cron schedules to avoid simultaneous runs
const fs = require('fs');
const changes = [
  { file: 'auto-fix-and-publish.yml', from: "0 */6 * * *", to: "5 */6 * * *" },
  { file: 'autonomous-verification.yml', from: "0 */6 * * *", to: "15 */6 * * *" },
  { file: 'fetch-diags.yml', from: "0 */6 * * *", to: "25 */6 * * *" },
  { file: 'blakadder-fetch.yml', from: "0 4 * * *", to: "15 4 * * *" },
  { file: 'driver-maintenance.yml', from: "0 4 * * 5", to: "30 4 * * 5" },
];
for (const c of changes) {
  const path = '.github/workflows/' + c.file;
  let content = fs.readFileSync(path, 'utf8');
  const oldCron = "cron: '" + c.from + "'";
  const newCron = "cron: '" + c.to + "'";
  if (!content.includes(oldCron)) {
    console.log('NOT FOUND in', c.file, ':', oldCron);
    continue;
  }
  content = content.replace(oldCron, newCron);
  fs.writeFileSync(path, content);
  console.log('UPDATED', c.file, ':', c.from, '->', c.to);
}
