const fs = require('fs');
class MegaParser {
  parseDrivers() {
    const drivers = {};
    fs.readdirSync('./drivers').forEach(d => {
      const f = `./drivers/${d}/driver.compose.json`;
      if (fs.existsSync(f)) drivers[d] = JSON.parse(fs.readFileSync(f));
    });
    return drivers;
  }
  extractIDs(text) {
    return {
      mfg: text.match(/_TZ[A-Z0-9_]+/g) || [],
      prod: text.match(/TS[0-9A-F]+/g) || []
    };
  }
}
module.exports = new MegaParser();