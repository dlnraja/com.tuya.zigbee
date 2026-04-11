const { extractMfrFromText, extractAllFP, buildFullIndex } = require('./.github/scripts/load-fingerprints.js');
const text = \Hi @dlnraja ,

I've encountered an identification issue with the Tuya Microwave Motion Sensor (ZG-204ZE) . Even though the device seems to be included in the presence_sensor_radar driver, it still pairs as a "Basic Zigbee Device".

After checking the driver.compose.json and comparing it to my device interview, I found a mismatch in how the identification strings are categorized:

My Device reports:

Manufacturer Name: ZG-204ZE

Model ID: CK-BL702-MWS-01(7016)

The issue in driver.compose.json:
Currently, ZG-204ZE is listed in the productId array (which corresponds to the Model ID), but it is missing from the manufacturerName array. Since my device specifically sends ZG-204ZE as its Manufacturer Name, Homey fails to match the driver.

Suggested fix:
Please add "ZG-204ZE" to the manufacturerName array in the zigbee section of the driver.

Current Interview Data:

JSON
{
"ids": {
"modelId": "CK-BL702-MWS-01(7016)",
"manufacturerName": "ZG-204ZE"
}
}
Thank you for looking into this!\;

const {allMfrs:iM2,allPids:iP2}=buildFullIndex();
const {mfr:eM2,pid:eP2}=extractAllFP(text,iM2,iP2);
console.log('MFR:', eM2);
console.log('PID:', eP2);
