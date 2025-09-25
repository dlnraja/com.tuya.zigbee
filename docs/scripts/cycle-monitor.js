const {execSync} = require('child_process');

console.log('🔄 CONTINUOUS MONITORING CYCLE');

let cycle = 1;
const maxCycles = 10;

function runCycle() {
    console.log(`\n⚡ CYCLE ${cycle}/${maxCycles}`);
    
    try {
        console.log('🔍 Verifying and enriching...');
        execSync('node verify-and-enrich.js');
        
        console.log('✅ Cycle successful');
        console.log('🔗 Actions: https://github.com/dlnraja/com.tuya.zigbee/actions');
        
        cycle++;
        if (cycle <= maxCycles) {
            console.log(`⏰ Next cycle in 30 seconds...`);
            setTimeout(runCycle, 30000);
        } else {
            console.log('🎉 ALL CYCLES COMPLETE!');
        }
        
    } catch(e) {
        console.log('⚠️ Cycle had warnings, continuing...');
        if (cycle <= maxCycles) setTimeout(runCycle, 15000);
    }
}

runCycle();
