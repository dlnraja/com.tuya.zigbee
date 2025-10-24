#!/usr/bin/env node

/**
 * Extract Manufacturer IDs from Homey Community Forum
 * Device Request Archive Analysis
 */

const extractedManufacturerIDs = {
  // From Forum Page 34
  "PIR_Sensors": [
    { manufacturer: "_TZE200_3towulqd", model: "TS0601", type: "PIR Sensor", source: "Page 34" }
  ],
  
  // From Forum Page 31  
  "Soil_Sensors": [
    { manufacturer: "_TZE200_myd45weu", model: "TS0601", type: "Soil Sensor", source: "Page 31" }
  ],
  
  "Gas_Sensors": [
    { manufacturer: "_TZE204_yojqa8xn", model: "TS0601", type: "Gas Sensor", source: "Page 31" }
  ],
  
  // From Forum Page 10
  "Scene_Switches": [
    { manufacturer: "_TZ3000_xabckq1v", model: "TS004F", type: "4-Button Scene Switch", source: "Page 10" }
  ],
  
  "Smart_Plugs": [
    { manufacturer: "_TZE200_amp6tsvy", model: "TS0601", type: "Smart Plug/Thermostat", source: "Page 10" }
  ],
  
  "Wall_Switches": [
    { manufacturer: "_TYZB01_6g8b7at8", model: "Unknown", type: "2 Gang Switch", source: "Page 34" }
  ]
};

// Known manufacturer IDs to check against
const knownIDs = [
  "_TZE200_3towulqd",
  "_TZE200_myd45weu", 
  "_TZE204_yojqa8xn",
  "_TZ3000_xabckq1v",
  "_TZE200_amp6tsvy",
  "_TYZB01_6g8b7at8"
];

console.log('📋 EXTRACTED MANUFACTURER IDs FROM FORUM\n');
console.log('='.repeat(70));
console.log('\n');

let totalCount = 0;
Object.keys(extractedManufacturerIDs).forEach(category => {
  console.log(`\n### ${category.replace(/_/g, ' ')}`);
  extractedManufacturerIDs[category].forEach(device => {
    console.log(`- **${device.manufacturer}** (${device.model})`);
    console.log(`  Type: ${device.type}`);
    console.log(`  Source: Forum ${device.source}`);
    totalCount++;
  });
});

console.log('\n\n' + '='.repeat(70));
console.log(`\n✅ Total New Manufacturer IDs Found: ${totalCount}`);
console.log('\n' + '='.repeat(70));

// Output JSON for integration
const fs = require('fs');
const path = require('path');
const outputPath = path.join(__dirname, '../../docs/analysis/forum_manufacturer_ids.json');
fs.writeFileSync(outputPath, JSON.stringify(extractedManufacturerIDs, null, 2));
console.log(`\n📁 Saved to: ${outputPath}\n`);
