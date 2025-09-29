// COHERENCE CHECKER - Vérification cohérence spécialisée
const fs = require('fs');
const { safeReadJSON } = require('../utils/json_utils');

const checkCoherence = (driverPath) => {
  const compose = safeReadJSON(`${driverPath}/driver.compose.json`);
  const driverName = driverPath.split('/').pop();
  
  if (!compose) return { coherent: false, issues: ['No compose file'] };
  
  const issues = [];
  
  // Vérifier cohérence nom/dossier
  if (compose.name?.en && !compose.name.en.toLowerCase().includes(driverName.toLowerCase().slice(0, 5))) {
    issues.push('Name/folder mismatch');
  }
  
  // Vérifier cohérence class/capabilities
  if (compose.class === 'sensor' && !compose.capabilities?.includes('measure_temperature')) {
    issues.push('Sensor without temperature capability');
  }
  
  return {
    coherent: issues.length === 0,
    issues,
    driver: driverName
  };
};

module.exports = { checkCoherence };
