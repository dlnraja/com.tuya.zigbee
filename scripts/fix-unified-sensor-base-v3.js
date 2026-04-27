const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../lib/devices/UnifiedSensorBase.js');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the humidity block
const badHumidity = `'measure_humidity',\n        (value) => Math.round(safeParse(value));`;
const goodHumidity = `'measure_humidity',\n        (value) => Math.round(safeParse(value))\n      );\n    }`;

if (content.indexOf(badHumidity) !== -1) {
    content = content.replace(badHumidity, goodHumidity);
    console.log('Fixed humidity block');
} else {
    // If it was deleted, restore it
    const tempBlockEnd = "await this._setupZCLCluster(clusters,\n        ['temperatureMeasurement', 'msTemperatureMeasurement'],\n        'measure_temperature',\n        (value) => Math.round(safeMultiply(safeDivide(safeParse(value, 100, 10)), 10))\n      );\n    }";
    const batteryBlockStart = "    // Battery (0x0001)";
    
    if (content.indexOf(tempBlockEnd) !== -1 && content.indexOf(batteryBlockStart) !== -1 && content.indexOf('measure_humidity') === -1) {
        const humidityBlock = `

    // Humidity (0x0405)
    if (!customHandlers.relativeHumidity && !customHandlers.msRelativeHumidity) {
      await this._setupZCLCluster(clusters,
        ['relativeHumidity', 'msRelativeHumidity'],
        'measure_humidity',
        (value) => Math.round(safeParse(value))
      );
    }
`;
        content = content.replace(tempBlockEnd, tempBlockEnd + humidityBlock);
        console.log('Restored humidity block');
    }
}

fs.writeFileSync(filePath, content);
console.log('Success');
