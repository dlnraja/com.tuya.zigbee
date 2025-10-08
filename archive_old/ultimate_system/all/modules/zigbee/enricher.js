const fs = require('fs');

const enrichZigbee = (path) => {
  const f = `${path}/driver.compose.json`;
  if (fs.existsSync(f)) {
    let data = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!data.id || data.id.includes('*')) {
      data.id = `_TZ3000_${path.slice(-6)}`;
      fs.writeFileSync(f, JSON.stringify(data, null, 2));
      return true;
    }
  }
  return false;
};

module.exports = { enrichZigbee };
