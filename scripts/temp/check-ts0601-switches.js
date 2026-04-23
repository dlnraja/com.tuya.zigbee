const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const fs = require('fs');

// Check if multi-gang switches with TS0601 use endpoints or just DPs
const switches = ['switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang'];

for (const sw of switches) {
    const composeFile = 'drivers/' + sw + '/driver.compose.json';
    const deviceFile = 'drivers/' + sw + '/device.js';
    
    if (!fs.existsSync(composeFile)) continue;
    
    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    
    // Check if it handles TS0601
    const hasTS0601 = compose.zigbee?.productId?.includes('TS0601')       ;
    if (!hasTS0601 ) continue;
    
    console.log('\n' + sw + ':');
    console.log('  Has TS0601:', hasTS0601);
    console.log('  Has endpoints:', compose.zigbee.endpoints ? 'YES' : 'NO')      ;
    if (compose.zigbee.endpoints) {
        console.log('  Endpoint count:', Object.keys(compose.zigbee.endpoints).length);
    }
    
    // Check device.js to see if it uses Tuya DP protocol
    if (fs.existsSync(deviceFile)) {
        const deviceCode = fs.readFileSync(deviceFile, 'utf8');
        const usesTuyaDP = deviceCode.includes('TuyaEF00Manager') || deviceCode.includes('dpMappings') || deviceCode.includes('cluster CLUSTERS.TUYA_EF00');
        console.log('  Uses Tuya DP:', usesTuyaDP);
    }
}
