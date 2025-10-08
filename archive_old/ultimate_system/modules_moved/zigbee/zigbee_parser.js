// ZIGBEE PARSER - Module spécialisé Zigbee
const fs = require('fs');

const parseZigbeeDriver = (dir) => {
  const compose = `./drivers/${dir}/driver.compose.json`;
  
  if (fs.existsSync(compose)) {
    try {
      const data = JSON.parse(fs.readFileSync(compose, 'utf8'));
      
      return {
        id: data.id,
        name: data.name?.en || dir,
        class: data.class,
        zigbee: data.zigbee || {},
        isZigbee: !!(data.zigbee || data.class === 'sensor')
      };
    } catch(e) {
      return null;
    }
  }
  return null;
};

module.exports = { parseZigbeeDriver };
