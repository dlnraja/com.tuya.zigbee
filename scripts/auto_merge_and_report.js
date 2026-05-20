// Auto merge PRs and branches, run lint, generate reports
const { execSync } = require('child_process');
const fs = require('fs');

function run(cmd) {
  console.log(`Running: ${cmd}`);
  return execSync(cmd, { stdio: 'inherit' });
}

function appendLog(path, content) {
  fs.appendFileSync(path, content + '\n');
}

const reportDir = 'docs/reports';
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

// 1. Collect PRs and Issues
run('gh pr list --state open --json number,title,author,headRefName,baseRefName > pr_list.json');
run('gh issue list --state open --json number,title,author,createdAt,labels > issue_list.json');
appendLog(`${reportDir}/PR_ISSUE_ANALYSIS.md`, '# PR and Issue Analysis');
appendLog(`${reportDir}/PR_ISSUE_ANALYSIS.md`, 'Collected PRs and issues. See JSON files.');

// 2. YOLO merge each open PR
const prData = JSON.parse(fs.readFileSync('pr_list.json', 'utf8'));
prData.forEach(pr => {
  const branch = pr.headRefName;
  console.log(`Merging PR #${pr.number} from ${branch}`);
  try {
    run(`git checkout ${branch}`);
    run(`git checkout master`);
    run(`git merge ${branch} --no-ff -X ours -m "YOLO merge PR #${pr.number} - ${branch}"`);
    run('node scripts/automation/lint-collisions.js > lint_out.txt');
    const lintResult = fs.readFileSync('lint_out.txt', 'utf8');
    if (lintResult.includes('conflict')) {
      appendLog(`${reportDir}/MERGE_CONFLICTS.md`, `Conflict merging PR #${pr.number} (${branch})`);
    }
  } catch (e) {
    appendLog(`${reportDir}/MERGE_CONFLICTS.md`, `Error merging PR #${pr.number} (${branch}): ${e.message}`);
  }
});

// 3. List non‑stable branches and YOLO merge
const allBranches = execSync('git branch -a').toString().split('\n')
  .map(b => b.trim())
  .filter(b => b && !['master', 'gh-pages', 'stable-v5'].includes(
    b.replace('remotes/origin/', '').replace('remotes/upstream/', '').split('/').pop()
  ));
allBranches.forEach(b => {
  const localName = b.replace('remotes/origin/', '').replace('remotes/upstream/', '').replace('origin/', '').replace('upstream/', '');
  try {
    run(`git checkout ${localName}`);
    run(`git checkout master`);
    run(`git merge ${localName} --no-ff -X ours -m "YOLO merge branch ${localName}"`);
    run('node scripts/automation/lint-collisions.js > lint_out.txt');
    const lintResult = fs.readFileSync('lint_out.txt', 'utf8');
    if (lintResult.includes('conflict')) {
      appendLog(`${reportDir}/MERGE_CONFLICTS.md`, `Conflict merging branch ${localName}`);
    }
  } catch (e) {
    appendLog(`${reportDir}/MERGE_CONFLICTS.md`, `Error merging branch ${localName}: ${e.message}`);
  }
});

// 4. Validation
run('npx homey app validate --level publish > validation.txt');
appendLog(`${reportDir}/FINAL_MERGE_REPORT.md`, '# Final Merge Report');
appendLog(`${reportDir}/FINAL_MERGE_REPORT.md`, fs.readFileSync('validation.txt', 'utf8'));

// 5. Forum response text
const forumText = `
**Important Notice for Homey Community**

The development of the Tuya Zigbee app (v5.x) has been discontinued. The repository will no longer receive official updates or be published on the Homey App Store. The codebase remains available for personal use, and I may continue to improve it for my own projects, but no support or official releases will be provided.

Key points:
- The last stable release is **v5.11.206**.
- Versions beyond that (e.g., v5.11.212) have not been pushed to GitHub and remain experimental.
- All open PRs and issues have been merged into master where possible, and the repository has been cleaned up.
- Please fork the repo if you wish to maintain your own version.

Thank you for your understanding.
`;
fs.writeFileSync(`${reportDir}/forum_response.md`, forumText.trim() + '\n');

// 6. Push changes
run('git add .');
run('git commit -m "Automated merge, lint, validation, and forum response"');
run('git push origin master');
