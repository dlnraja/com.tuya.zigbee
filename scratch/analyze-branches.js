const { execSync } = require('child_process');
const fs = require('fs');

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

const results = [];

for (const b of branches) {
  try {
    const commits = execSync(`git log --oneline master..${b}`, { encoding: 'utf8' }).trim();
    const diffFiles = execSync(`git diff --name-status master..${b}`, { encoding: 'utf8' }).trim();
    results.push({
      branch: b,
      hasChanges: commits.length > 0,
      commits: commits ? commits.split('\n') : [],
      files: diffFiles ? diffFiles.split('\n') : []
    });
  } catch (e) {
    results.push({
      branch: b,
      error: e.message
    });
  }
}

fs.writeFileSync('scratch/branches_analysis.json', JSON.stringify(results, null, 2));
console.log('Branches analysis completed. Results written to scratch/branches_analysis.json');
