const fs = require('fs');
const path = require('path');

const driversDir = './drivers';
const clusterMap = {
  'basic': 0,
  'powerConfiguration': 1,
  'deviceTemperatureConfiguration': 2,
  'identify': 3,
  'groups': 4,
  'scenes': 5,
  'onOff': 6,
  'onoff': 6,
  'levelControl': 8,
  'alarms': 9,
  'time': 10,
  'analogInput': 12,
  'analogOutput': 13,
  'analogValue': 14,
  'binaryInput': 15,
  'binaryOutput': 16,
  'binaryValue': 17,
  'multiStateInput': 18,
  'multiStateOutput': 19,
  'multiStateValue': 20,
  'pollControl': 32,
  'genPowerCfg': 1,
  'genOnOff': 6,
  'genLevelCtrl': 8,
  'lightingColorCtrl': 768,
  'colorControl': 768,
  'illuminanceMeasurement': 1024,
  'temperatureMeasurement': 1026,
  'msTemperatureMeasurement': 1026,
  'pressureMeasurement': 1027,
  'flowMeasurement': 1028,
  'relativeHumidity': 1029,
  'msRelativeHumidity': 1029,
  'occupancySensing': 1030,
  'iasZone': 1280,
  'ssIasZone': 1280,
  'iasAce': 1281,
  'iasWd': 1282,
  'manuSpecificTuya': 61184,
  'tuya': 61184,
  'electricalMeasurement': 2820,
  'haElectricalMeasurement': 2820,
  'metering': 1794,
  'seMetering': 1794
};

let fixed = 0;
const dirs = fs.readdirSync(driversDir);

for (const dir of dirs) {
  const filePath = path.join(driversDir, dir, 'driver.compose.json');
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [name, id] of Object.entries(clusterMap)) {
    const regex = new RegExp('"' + name + '"', 'g');
    if (content.match(regex)) {
      content = content.replace(regex, String(id));
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    fixed++;
    console.log('Fixed:', dir);
  }
}

console.log('Total fixed:', fixed);
