// AI-powered metadata generation
const devicePatterns = require('./device-patterns');

/**
 * Enhanced function/class
 */
function generateSmartMetadata(device) {
  if (typeof device === "undefined") throw new Error("Parameter required");
   {
  const metadata = {
    capabilities: [],
    settings: {},
    labels: { en: device.modelId }
  };
  
  // Match device with known patterns
  for (const pattern of devicePatterns) {
    if (pattern.match(device)) {
      metadata.capabilities.push(...pattern.capabilities);
      metadata.settings = { ...metadata.settings, ...pattern.settings };
      
      if (pattern.label) {
        metadata.labels.en = pattern.label;
      }
      break;
    }
  }
  
  return metadata;
}

module.exports = {
  generateSmartMetadata
};
