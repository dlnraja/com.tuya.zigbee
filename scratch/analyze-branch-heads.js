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

console.log('=== LATEST COMMITS ON EACH BRANCH ===\n');
for (const b of branches) {
  try {
    const show = execSync(`git show --oneline --stat ${b}`, { encoding: 'utf8' }).trim();
    console.log(`Branch: ${b}`);
    console.log(show.split('\n').slice(0, 10).join('\n'));
    console.log('------------------------------------------------\n');
  } catch (e) {
    console.log(`Branch: ${b} - Error: ${e.message}`);
  }
}
