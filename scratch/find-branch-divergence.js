const { execSync } = require('child_process');

const branches = [
  '#1139-add_TZ3000_o4mkahkc',
  'add-_TZE200_kb5noeto',
  'antonhagg/SDK3',
  'auto-sync-johan-enhanced',
  'feature/accept-upstream-prs',
  'fix/motion_sensor_2',
  'moes_6_gang',
  'new_device_issue_1059_rgb_led_strip_controller',
  'patch-1',
  'pr-1137',
  'pr-321',
  'sinan92/SDK3'
];

console.log('=== UNIQUE COMMITS ON EACH BRANCH ===\n');
for (const b of branches) {
  try {
    const log = execSync(`git log master..${b} --oneline`, { encoding: 'utf8' }).trim();
    const commits = log ? log.split('\n') : [];
    console.log(`Branch: ${b} (${commits.length} unique commits)`);
    commits.slice(0, 5).forEach(c => console.log(`  ${c}`));
    if (commits.length > 5) {
      console.log(`  ... and ${commits.length - 5} more commits`);
    }
    console.log('------------------------------------------------\n');
  } catch (e) {
    console.log(`Branch: ${b} - Error: ${e.message}`);
  }
}
