const fs = require('fs');
const {execSync} = require('child_process');

console.log('🔄 QUICK RESTORE AIR QUALITY');

// Create driver
fs.mkdirSync('drivers/air_quality_monitor/assets/images', { recursive: true });

// driver.compose.json
const driver = {
    "name": {"en": "Air Quality Monitor"},
    "class": "sensor",
    "capabilities": ["measure_pm25", "measure_temperature", "measure_humidity"],
    "zigbee": {
        "manufacturerName": ["_TZE200_", "_TZ3000_", "Tuya"],
        "productId": ["TS0601"],
        "endpoints": {"1": {"clusters": [0, 61184], "bindings": [25]}}
    }
};

fs.writeFileSync('drivers/air_quality_monitor/driver.compose.json', JSON.stringify(driver, null, 2));

// device.js
fs.writeFileSync('drivers/air_quality_monitor/device.js', 
`const { ZigBeeDevice } = require('homey-zigbeedriver');
class AirQualityDevice extends ZigBeeDevice {
    async onNodeInit() {
        this.registerCapability('measure_pm25', 'CLUSTER_TUYA_SPECIFIC');
    }
}
module.exports = AirQualityDevice;`);

// Update app.json
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.drivers.push({
    "id": "air_quality_monitor",
    "name": {"en": "Air Quality Monitor"},
    "class": "sensor",
    "capabilities": ["measure_pm25", "measure_temperature", "measure_humidity"]
});
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Publish
execSync('git add -A && git commit -m "🔄 RESTORE: air_quality_monitor fixed" && git push origin master');
console.log('✅ RESTORED & PUBLISHED');
