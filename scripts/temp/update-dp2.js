const fs = require('fs');
let txt = fs.readFileSync('drivers/soil_sensor/device.js', 'utf8');

const replaceBlock = 
        102: { capability: 'measure_luminance', divisor: 1 },
        103: { capability: null, setting: 'report_interval', min: 30, max: 1200 },
        104: { capability: null, setting: 'soil_calibration', min: -30, max: 30 },
        105: { capability: null, setting: 'humidity_calibration', min: -30, max: 30 },
        106: { capability: null, setting: 'illuminance_calibration', min: -1000, max: 1000 },
        107: { capability: null, setting: 'temperature_calibration', min: -20, max: 20 },
        110: { capability: null, setting: 'soil_warning', min: 0, max: 100 },
        111: { capability: 'alarm_water', transform: (v) => v === 1 },
        112: { capability: 'measure_conductivity', divisor: 1 }, // soil fertility uS/cm
        113: { capability: null, setting: 'soil_fertility_calibration', min: -1000, max: 1000 },
        114: { capability: null, setting: 'soil_fertility_warning_setting', min: 0, max: 5000 },
        115: { capability: null, setting: 'soil_fertility_warning_v1', min: 0, max: 5000 },
;

// Extract regex logic into simpler replace
const startMarker = "102: { capability: 'measure_luminance', divisor: 1 },";
const endMarker = "// FALLBACK DPs for other soil sensor variants";

const startIndex = txt.indexOf(startMarker);
const endIndex = txt.indexOf(endMarker);

if (startIndex > -1 && endIndex > -1) {
    const part1 = txt.substring(0, startIndex);
    const part2 = txt.substring(endIndex);
    txt = part1 + replaceBlock + "\n        " + part2;
    fs.writeFileSync('drivers/soil_sensor/device.js', txt);
    console.log("Updated device.js with full A89G12C & TS0601 DP list");
} else {
    console.log("Markers not found");
}

