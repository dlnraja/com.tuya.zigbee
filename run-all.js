const {execSync} = require('child_process');
const fs = require('fs');

console.log('🤖 RUN ALL SCRIPTS - INTELLIGENT ORDER');

const scripts = [
    'remove-air-quality.js',
    'quick-fix.js', 
    'quick-success.js',
    'monitor-final.js',
    'final-status-check.js'
];

for(let i=0; i<scripts.length; i++) {
    const script = scripts[i];
    console.log(`\n🔄 RUNNING ${i+1}/${scripts.length}: ${script}`);
    
    try {
        if(fs.existsSync(script)) {
            execSync(`node ${script}`, {stdio: 'inherit'});
            console.log(`✅ ${script} completed`);
        } else {
            console.log(`⚠️ ${script} not found`);
        }
    } catch(e) {
        console.log(`❌ ${script} failed: ${e.message.substring(0,30)}`);
    }
    
    // Quick git commit after each
    try {
        execSync('git add -A');
        execSync(`git commit -m "🤖 AUTO: ${script} executed"`);
        execSync('git push origin master');
        console.log(`📤 Changes pushed`);
    } catch {}
}

console.log('\n🎉 ALL SCRIPTS EXECUTED');
