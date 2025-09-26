const fs = require('fs');
class MegaDumper {
  dumpAll() {
    const data = {drivers: {}, archives: {}};
    fs.readdirSync('./drivers').forEach(d => {
      const f = `./drivers/${d}/driver.compose.json`;
      if (fs.existsSync(f)) data.drivers[d] = JSON.parse(fs.readFileSync(f));
    });
    fs.writeFileSync('./dumps/complete_dump.json', JSON.stringify(data, null, 2));
  }
}
module.exports = new MegaDumper();