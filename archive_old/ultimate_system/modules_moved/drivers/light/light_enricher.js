// LIGHT ENRICHER - Module spécialisé éclairage
const { safeReadJSON, safeWriteJSON } = require('../../utils/json_utils');

const enrichLight = (driverPath) => {
  const compose = `${driverPath}/driver.compose.json`;
  const data = safeReadJSON(compose);
  
  if (data && data.class === 'light') {
    // Enrichir éclairage
    if (!data.capabilities) {
      data.capabilities = ['onoff', 'dim'];
    }
    
    if (!data.energy) {
      data.energy = { approximation: { usageConstant: 10 } };
    }
    
    return safeWriteJSON(compose, data);
  }
  
  return false;
};

module.exports = { enrichLight };
