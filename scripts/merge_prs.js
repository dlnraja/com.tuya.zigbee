const { execSync } = require('child_process');

const PR_IDS = [1162, 1161, 1137, 1128, 1122, 1121, 1118, 1106, 1075];
const UPSTREAM = 'JohanBendz/com.tuya.zigbee';

console.log('=== ACCEPTING AND MERGING PRs FINELY ===');

for (const id of PR_IDS) {
    console.log(`\nProcessing PR #${id}...`);
    try {
        // Fetch PR
        console.log(`  Fetching PR branch...`);
        execSync(`gh pr checkout ${id} --repo ${UPSTREAM}`, { stdio: 'inherit' });
        
        const prBranch = execSync('git branch --show-current').toString().trim();
        console.log(`  On branch: ${prBranch}`);
        
        // Switch back to feature branch
        execSync('git checkout feature/accept-upstream-prs', { stdio: 'ignore' });
        
        // Merge PR branch
        console.log(`  Merging ${prBranch} into master...`);
        execSync(`git merge ${prBranch} --no-edit --allow-unrelated-histories`, { stdio: 'inherit' });
        
        console.log(`  ✅ PR #${id} merged successfully.`);
        
        // Delete PR branch locally
        execSync(`git branch -D ${prBranch}`, { stdio: 'ignore' });
        
    } catch (err) {
        console.error(`  ❌ Failed to merge PR #${id}: ${err.message}`);
        // Abort merge if in progress
        try { execSync('git merge --abort', { stdio: 'ignore' }); } catch (e) {}
        // Ensure we are back on the target branch
        try { execSync('git checkout feature/accept-upstream-prs', { stdio: 'ignore' }); } catch (e) {}
    }
}

console.log('\n=== PR MERGE COMPLETE ===');
