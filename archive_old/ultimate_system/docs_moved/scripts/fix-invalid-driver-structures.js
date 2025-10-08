const fs = require('fs');

console.log('🔧 FIXING INVALID DRIVER STRUCTURES');
console.log('📋 Making all drivers SDK3 compliant\n');

const DEVICE_CLASSES = {
    // Lighting
    'light': ['led', 'bulb', 'ceiling_light', 'strip'],
    'socket': ['plug', 'outlet', 'usb_outlet'],
    'switch': ['switch', 'relay', 'dimmer', 'touch'],
    'sensor': ['sensor', 'detect', 'monitor', 'measure'],
    'thermostat': ['thermostat', 'climate'],
    'curtain': ['curtain', 'blind', 'shutter'],
    'lock': ['lock'],
    'doorbell': ['doorbell'],
    'other': ['hub', 'gateway', 'bridge', 'controller', 'valve', 'feeder', 'solar']
};

function getDeviceClass(driverName) {
    for (const [className, keywords] of Object.entries(DEVICE_CLASSES)) {
        if (keywords.some(keyword => driverName.includes(keyword))) {
            return className;
        }
    }
    return 'other';
}

function getCapabilities(driverName, deviceClass) {
    const capabilities = [];
    
    // Basic capabilities by device class
    switch (deviceClass) {
        case 'light':
            capabilities.push('onoff');
            if (driverName.includes('dimmer') || driverName.includes('rgb')) {
                capabilities.push('dim');
            }
            if (driverName.includes('rgb')) {
                capabilities.push('light_hue', 'light_saturation');
            }
            break;
        case 'socket':
            capabilities.push('onoff');
            if (driverName.includes('energy') || driverName.includes('power')) {
                capabilities.push('measure_power', 'meter_power');
            }
            break;
        case 'switch':
            capabilities.push('onoff');
            if (driverName.includes('2gang')) {
                capabilities.push('onoff.gang2');
            }
            if (driverName.includes('3gang')) {
                capabilities.push('onoff.gang2', 'onoff.gang3');
            }
            break;
        case 'sensor':
            if (driverName.includes('temp')) capabilities.push('measure_temperature');
            if (driverName.includes('humid')) capabilities.push('measure_humidity');
            if (driverName.includes('motion') || driverName.includes('pir')) capabilities.push('alarm_motion');
            if (driverName.includes('water') || driverName.includes('leak')) capabilities.push('alarm_water');
            if (driverName.includes('battery')) capabilities.push('measure_battery');
            if (driverName.includes('co2')) capabilities.push('measure_co2');
            if (driverName.includes('pm25')) capabilities.push('measure_pm25');
            break;
        case 'thermostat':
            capabilities.push('target_temperature', 'measure_temperature', 'thermostat_mode');
            break;
        case 'curtain':
            capabilities.push('windowcoverings_set');
            break;
        default:
            capabilities.push('onoff');
    }
    
    // Add battery if device name suggests battery operation
    if (driverName.includes('battery') || driverName.includes('cr2032') || driverName.includes('wireless')) {
        if (!capabilities.includes('measure_battery')) {
            capabilities.push('measure_battery');
        }
    }
    
    return capabilities.length > 0 ? capabilities : ['onoff'];
}

// Fix all invalid drivers
let fixedDrivers = 0;

fs.readdirSync('drivers').forEach(driverName => {
    const composePath = `drivers/${driverName}/driver.compose.json`;
    
    if (fs.existsSync(composePath)) {
        try {
            let config = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            let needsFix = false;
            
            // Check and fix missing required fields
            if (!config.id) {
                config.id = driverName;
                needsFix = true;
            }
            
            if (!config.name || typeof config.name !== 'object') {
                config.name = {
                    en: driverName.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')
                };
                needsFix = true;
            }
            
            if (!config.class) {
                config.class = getDeviceClass(driverName);
                needsFix = true;
            }
            
            if (!config.capabilities || !Array.isArray(config.capabilities)) {
                config.capabilities = getCapabilities(driverName, config.class);
                needsFix = true;
            }
            
            if (!config.images) {
                config.images = {
                    small: './assets/images/small.png',
                    large: './assets/images/large.png'
                };
                needsFix = true;
            }
            
            // Ensure zigbee configuration
            if (!config.zigbee) {
                config.zigbee = {
                    manufacturerName: [
                        '_TZE284_aao6qtcs', '_TZE284_3towulqd', '_TZE284_bxoo2swd',
                        '_TZE200_cwbvmsar', '_TZE200_bjawzodf', '_TZE200_3towulqd',
                        '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZ3000_8ybe88nf',
                        'Tuya', 'MOES', 'BSEED'
                    ],
                    productId: ['TS0001', 'TS0011', 'TS011F', 'TS0201', 'TS0601'],
                    endpoints: {
                        '1': {
                            clusters: [0, 4, 5, 6],
                            bindings: [6]
                        }
                    },
                    learnmode: {
                        instruction: {
                            en: 'Press and hold the button until the LED blinks',
                            fr: 'Maintenez le bouton enfoncé jusqu\'à ce que la LED clignote'
                        }
                    }
                };
                needsFix = true;
            }
            
            if (needsFix) {
                fs.writeFileSync(composePath, JSON.stringify(config, null, 2));
                console.log(`✅ Fixed driver structure: ${driverName}`);
                fixedDrivers++;
            }
            
        } catch (e) {
            console.log(`❌ Could not fix driver: ${driverName} - ${e.message}`);
        }
    }
});

console.log(`\n🎉 STRUCTURE FIXES COMPLETE:`);
console.log(`✅ Fixed drivers: ${fixedDrivers}`);
console.log('🚀 Ready for validation!');
