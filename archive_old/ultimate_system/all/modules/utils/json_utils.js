// JSON UTILS - Utilitaires JSON
const fs = require('fs');

const safeReadJSON = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch(e) {
    return null;
  }
};

const safeWriteJSON = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    return true;
  } catch(e) {
    return false;
  }
};

const validateJSON = (data) => {
  return data && typeof data === 'object' && !Array.isArray(data);
};

module.exports = { safeReadJSON, safeWriteJSON, validateJSON };
