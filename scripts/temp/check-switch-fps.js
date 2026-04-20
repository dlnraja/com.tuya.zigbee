const fs = require('fs');
const path = require('path');

// Check switch drivers specifically
const switchDrivers = ['switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang'];
const fpData = [];

for (const driver of switchDrivers) {
    const file = 'drivers/' + driver + '/driver.compose.json';
    if (!fs.existsSync(file)) continue;
    
    try {
        const txt = fs.readFileSync(file, 'utf8');
        const d = JSON.parse(txt);
        
        if (!d.zigbee) continue;
        
        const mfrs = d.zigbee.manufacturerName || [];
        const pids = d.zigbee.productId || [];
        
        fpData.push({
            driver,
            mfrs: mfrs.slice(0, 10),
            pids: pids.slice(0, 10),
            hasEndpoints: d.zigbee.endpoints ? true : false
        });
    } catch(e) {
        console.error('Error:', driver, e.message);
    }
}

console.log('Switch drivers fingerprint analysis:');
fpData.forEach(d => {
    console.log('\n' + d.driver + ':');
    console.log('  Has endpoints:', d.hasEndpoints);
    console.log('  First 10 mfrs:', d.mfrs.join(', '));
    console.log('  First 10 pids:', d.pids.join(', '));
});

// Find shared fingerprints between switch drivers
console.log('\n\nCHECKING FOR SHARED FINGERPRINTS BETWEEN SWITCH DRIVERS:');
for (let i = 0; i < fpData.length; i++) {
    for (let j = i + 1; j < fpData.length; j++) {
        const d1 = fpData[i];
        const d2 = fpData[j];
        
        for (const mfr of d1.mfrs) {
            if (d2.mfrs.includes(mfr)) {
                for (const pid of d1.pids) {
                    if (d2.pids.includes(pid)) {
                        console.log('  CONFLICT: ' + mfr + '::' + pid + ' in both ' + d1.driver + ' and ' + d2.driver);
                    }
                }
            }
        }
    }
}
