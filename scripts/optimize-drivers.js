const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');
const universalDriverId = 'universal_zigbee';
const universalComposePath = path.join(driversDir, universalDriverId, 'driver.compose.json');

const genericPrefixes = [
  '_TZ1800_', '_TZ2000_', '_TZ3000_', '_TZ3002_', '_TZ300A_',
  '_TZ3040_', '_TZ3210_', '_TZ3218_', '_TZ321C_', '_TZ3290_', '_TZ3400_',
  '_TZ6210_', '_TZB000_', '_TZB210_', '_TZE200_', '_TZE201_', '_TZE202_',
  '_TZE203_', '_TZE204_', '_TZE20X_', '_TZE210_', '_TZE21C_', '_TZE283_',
  '_TZE284_', '_TZE600_', '_TZE608_', '_TYZB01_', '_TYZB02_'
];

const drivers = fs.readdirSync(driversDir);

drivers.forEach(driverId => {
    if (driverId === universalDriverId) return;
    
    const composePath = path.join(driversDir, driverId, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
        try {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            if (compose.zigbee) {
                // Clear fingerprints to reduce size
                compose.zigbee.manufacturerName = [];
                compose.zigbee.productId = [];
                if (compose.zigbee.fingerprints) delete compose.zigbee.fingerprints;
                
                fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
                console.log(`Optimized ${driverId}`);
            }
        } catch (e) {
            console.error(`Error optimizing ${driverId}: ${e.message}`);
        }
    }
});

// Update Universal Driver
if (fs.existsSync(universalComposePath)) {
    const universalCompose = JSON.parse(fs.readFileSync(universalComposePath, 'utf8'));
    universalCompose.zigbee.manufacturerName = genericPrefixes;
    universalCompose.zigbee.productId = []; // No specific PIDs needed here
    fs.writeFileSync(universalComposePath, JSON.stringify(universalCompose, null, 2));
    console.log('Updated Universal Driver with generic prefixes');
}
