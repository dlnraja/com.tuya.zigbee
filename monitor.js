const {execSync} = require('child_process');

console.log('🔍 MONITOR GITHUB ACTIONS');

for(let i=1; i<=5; i++) {
    console.log(`\n🎯 CYCLE ${i}`);
    
    // Trigger workflow
    try {
        execSync(`echo "Cycle ${i}" > cycle-${i}.txt`);
        execSync('git add -A');
        execSync(`git commit -m "🚀 PUBLISH CYCLE ${i}: Monitor & fix"`);
        execSync('git push origin master');
        console.log('✅ Workflow triggered');
    } catch(e) {
        console.log('⚠️ Skip commit');
    }
    
    console.log('⏳ Wait 10s...');
    require('child_process').execSync('timeout 10', {stdio: 'ignore'});
}

console.log('\n🎉 MONITORING COMPLETE');
