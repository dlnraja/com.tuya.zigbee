/**
 * Zigbee OTA Firmware Checker
 * Queries Koenkk's zigbee-OTA index to see if a device has an update available.
 * Usage: node .github/scripts/ota-checker.js "_TZE200_pay2byax"
 */
const otaUrl = 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json';

async function checkOta(manufacturerName) {
    console.log(`Checking OTA availability for ${manufacturerName}...`);
    try {
        const res = await fetch(otaUrl);
        const index = await res.json();
        
        // Z2M OTA uses manufacturerCode / imageType, but sometimes maps by names or URLs
        // We'll do a fuzzy match on the URL or metadata
        let found = [];
        for (const fw of index) {
            const str = JSON.stringify(fw).toLowerCase();
            if (str.includes(manufacturerName.toLowerCase())) {
                found.push(fw);
            }
        }
        
        if (found.length > 0) {
            console.log(` Found ${found.length} OTA firmwares matching ${manufacturerName}:`);
            found.forEach(fw => console.log(`  - URL: ${fw.url}`));
        } else {
            console.log(` No public OTA firmwares found for ${manufacturerName}`);
            console.log('Tuya devices exclusively perform OTA via Tuya gateways unless intercepted.');
        }
    } catch (e) {
        console.error('Failed to fetch OTA index:', e.message);
    }
}

const target = process.argv[2];
if (target) {
    checkOta(target);
} else {
    console.log('Provide a manufacturer name, e.g. _TZE200_pay2byax');
}
