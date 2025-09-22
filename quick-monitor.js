const {execSync} = require('child_process');

console.log('🔍 QUICK MONITOR GITHUB ACTIONS');

// Cycle de monitoring
for(let i=1; i<=6; i++) {
    console.log(`\n🎯 CYCLE ${i}/6`);
    
    try {
        // Créer changement pour trigger workflow
        execSync(`echo "Monitor cycle ${i}" > monitor-${i}.txt`);
        execSync('git add -A');
        execSync(`git commit -m "🚀 MONITOR CYCLE ${i}: GitHub Actions trigger"`);
        execSync('git push origin master');
        console.log('✅ Workflow déclenché');
        
        // Attendre 5 secondes
        const start = Date.now();
        while(Date.now() - start < 5000) {}
        
    } catch(e) {
        console.log(`⚠️  Cycle ${i}: ${e.message.substring(0,50)}`);
    }
}

console.log('\n🎉 MONITORING COMPLET - 6 workflows déclenchés');
console.log('🔗 Vérifiez: https://github.com/dlnraja/com.tuya.zigbee/actions');
