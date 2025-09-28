// SWITCH ENRICHER - Module spécialisé interrupteurs  
const { safeReadJSON, safeWriteJSON } = require('../../utils/json_utils');

const enrichSwitch = (driverPath) => {
  const compose = `${driverPath}/driver.compose.json`;
  const data = safeReadJSON(compose);
  
  if (data && (data.class === 'socket' || data.class === 'switch')) {
    // Enrichir switch
    if (!data.capabilities) {
      data.capabilities = ['onoff'];
    }
    
    if (!data.energy) {
      data.energy = { approximation: { usageConstant: 5 } };
    }
    
    return safeWriteJSON(compose, data);
  }
  
  return false;
};

module.exports = { enrichSwitch };
