// SENSOR ENRICHER - Module spécialisé capteurs
const { safeReadJSON, safeWriteJSON } = require('../../utils/json_utils');

const enrichSensor = (driverPath) => {
  const compose = `${driverPath}/driver.compose.json`;
  const data = safeReadJSON(compose);
  
  if (data && data.class === 'sensor') {
    // Enrichir capteur
    if (!data.capabilities) {
      data.capabilities = ['measure_temperature', 'measure_humidity'];
    }
    
    if (!data.energy) {
      data.energy = { batteries: ['CR2032'] };
    }
    
    return safeWriteJSON(compose, data);
  }
  
  return false;
};

module.exports = { enrichSensor };
