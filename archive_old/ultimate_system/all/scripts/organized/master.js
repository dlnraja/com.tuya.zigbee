console.log('🎯 MASTER SCRIPT'); const {execSync} = require('child_process'); ['homey app validate', 'git add -A', 'git commit -m \
fix\', 'git push'].forEach(c => {try{execSync(c,{stdio:'inherit'})}catch(e){console.log(e.message)}});
