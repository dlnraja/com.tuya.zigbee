const fs = require('fs');
let txt = fs.readFileSync('drivers/soil_sensor/device.js', 'utf8');

const replaceBlock = "\n" +
"        102: { capability: 'measure_luminance', divisor: 1 },\n" +
"        103: { capability: null, setting: 'report_interval', min: 30, max: 1200 },\n" +
"        104: { capability: null, setting: 'soil_calibration', min: -30, max: 30 },\n" +
"        105: { capability: null, setting: 'humidity_calibration', min: -30, max: 30 },\n" +
"        106: { capability: null, setting: 'illuminance_calibration', min: -1000, max: 1000 },\n" +
"        107: { capability: null, setting: 'temperature_calibration', min: -20, max: 20 },\n" +
"        110: { capability: null, setting: 'soil_warning', min: 0, max: 100 },\n" +
"        111: { capability: 'alarm_water', transform: (v) => v === 1 },\n" +
"        112: { capability: 'measure_conductivity', divisor: 1 }, // soil fertility uS/cm\n" +
"        113: { capability: null, setting: 'soil_fertility_calibration', min: -1000, max: 1000 },\n" +
"        114: { capability: null, setting: 'soil_fertility_warning_setting', min: 0, max: 5000 },\n" +
"        115: { capability: null, setting: 'soil_fertility_warning_v1', min: 0, max: 5000 },\n";

const startMarker = "102: { capability: 'measure_luminance', divisor: 1 },";
const endMarker = "// ═══════════════════════════════════════════════════════════════════\r\n        
let endMarker2 = "// ═══════════════════════════════════════════════════════════════════\n        

const startIndex = txt.indexOf(startMarker);
let endIndex = txt.indexOf(endMarker);
if (endIndex === -1) endIndex = txt.indexOf(endMarker2);

if (startIndex > -1 && endIndex > -1) {
    const part1 = txt.substring(0, startIndex);
    const part2 = txt.substring(endIndex);
    txt = part1 + replaceBlock + "        " + part2;
    fs.writeFileSync('drivers/soil_sensor/device.js', txt);
    console.log("Updated device.js with full A89G12C & TS0601 DP list");
} else {
    console.log("Markers not found");
}

