// SCHEMA VALIDATOR - Validation schéma spécialisée
const { safeReadJSON } = require('../utils/json_utils');

const validateSchema = (driverPath) => {
  const compose = safeReadJSON(`${driverPath}/driver.compose.json`);
  
  if (!compose) return { valid: false, errors: ['File not found'] };
  
  const errors = [];
  const required = ['id', 'name', 'class'];
  
  required.forEach(field => {
    if (!compose[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  if (compose.id && compose.id.length < 5) {
    errors.push('ID too short');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    driver: driverPath.split('/').pop()
  };
};

module.exports = { validateSchema };
