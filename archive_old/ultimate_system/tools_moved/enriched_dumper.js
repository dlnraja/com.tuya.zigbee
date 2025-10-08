#!/usr/bin/env node
// ENRICHED DUMPER - Historical techniques
const fs = require('fs');

class EnrichedDumper {
  dumpDrivers() {
    const drivers = {};
    fs.readdirSync('./drivers').forEach(d => {
      const f = `./drivers/${d}/driver.compose.json`;
      if (fs.existsSync(f)) drivers[d] = JSON.parse(fs.readFileSync(f));
    });
    fs.writeFileSync('./dumps/drivers_dump.json', JSON.stringify(drivers, null, 2));
  }
}

module.exports = new EnrichedDumper();