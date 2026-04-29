
const fs = require('fs');
const f = 'drivers/presence_sensor_radar/device.js';
let c = fs.readFileSync(f, 'utf8');
const search = '      }\n   * v5.5.902: FORUM FIX';
const replace = '      }\n    }\n  }\n\n  /**\n   * v5.5.902: FORUM FIX';

if (c.includes(search)) {
    c = c.replace(search, replace);
    fs.writeFileSync(f, c);
    console.log('Fixed!');
} else {
    // Try with \r\n
    const search2 = '      }\r\n   * v5.5.902: FORUM FIX';
    const replace2 = '      }\r\n    }\r\n  }\r\n\r\n  /**\r\n   * v5.5.902: FORUM FIX';
    if (c.includes(search2)) {
        c = c.replace(search2, replace2);
        fs.writeFileSync(f, c);
        console.log('Fixed (CRLF)!');
    } else {
        console.log('Not found!');
        // Print 10 lines around 1590 to see exact format
        const lines = c.split(/\r? \n/ );
        console.log('Lines 1588-1595:');
        lines.slice(1587, 1595).forEach((l/i) => console.log(`${1588+i}: [${l}]`));
    }
}
