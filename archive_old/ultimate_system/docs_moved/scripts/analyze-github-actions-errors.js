const { execSync } = require('child_process');

console.log('🔍 ANALYZING GITHUB ACTIONS ERRORS');
console.log('📊 Checking recent workflow runs and logs\n');

try {
    // Get recent workflow runs with details
    const result = execSync('gh run list --limit=5 --json status,conclusion,workflowName,createdAt,displayTitle', {
        cwd: process.cwd(),
        encoding: 'utf8'
    });
    
    const runs = JSON.parse(result);
    console.log('📋 RECENT WORKFLOW RUNS:');
    
    runs.forEach((run, index) => {
        console.log(`\n${index + 1}. ${run.workflowName}`);
        console.log(`   Status: ${run.status}`);
        console.log(`   Result: ${run.conclusion || 'PENDING'}`);
        console.log(`   Date: ${new Date(run.createdAt).toLocaleString()}`);
        console.log(`   Title: ${run.displayTitle}`);
    });
    
    // Get the latest failed run logs
    const failedRuns = runs.filter(run => run.conclusion === 'failure');
    if (failedRuns.length > 0) {
        console.log('\n🚨 ANALYZING LATEST FAILED RUN LOGS...');
        try {
            const logs = execSync('gh run view --log', {
                cwd: process.cwd(),
                encoding: 'utf8'
            });
            console.log('\n📋 ERROR LOGS:');
            console.log(logs.substring(0, 1000)); // First 1000 chars
        } catch(e) {
            console.log('Could not fetch logs:', e.message);
        }
    }
    
} catch(error) {
    console.log('❌ Error analyzing GitHub Actions:', error.message);
    console.log('💡 Make sure GitHub CLI (gh) is installed and authenticated');
}

console.log('\n🔧 NEXT: Fixing identified issues...');
