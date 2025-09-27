const {execSync} = require('child_process'); console.log('🚀 ULTIMATE START'); try{execSync('homey app validate',{stdio:'inherit'}); execSync('git add -A && git commit -m \
ultimate\ && git push',{stdio:'inherit'}); console.log('✅ SUCCESS');}catch(e){console.log('❌',e.message);}
