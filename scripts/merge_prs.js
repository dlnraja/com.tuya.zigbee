const { execSync } = require('child_process');

const PR_IDS = [1162, 1161, 1137, 1128, 1122, 1121, 1118, 1106, 1075];
const UPSTREAM = 'JohanBendz/com.tuya.zigbee';

console.log('=== ACCEPTING AND MERGING PRs FINELY WITH AUTO-RESOLVE (PS1) ===');

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
        try {
            execSync(`git merge ${prBranch} --no-edit --allow-unrelated-histories`, { stdio: 'inherit' });
        } catch (mergeErr) {
            console.log('  ⚠️ Conflict detected. Attempting auto-resolve...');
            execSync('powershell -File scripts/resolve_conflicts.ps1', { stdio: 'inherit' });
        }
        
        console.log(`  ✅ PR #${id} processed.`);
        
        // Delete PR branch locally
        execSync(`git branch -D ${prBranch}`, { stdio: 'ignore' });
        
    } catch (err) {
        console.error(`  ❌ Failed to process PR #${id}: ${err.message}`);
        try { execSync('git merge --abort', { stdio: 'ignore' }); } catch (e) {}
        try { execSync('git checkout -f feature/accept-upstream-prs', { stdio: 'ignore' }); } catch (e) {}
    }
}

console.log('\n=== PR MERGE COMPLETE ===');
