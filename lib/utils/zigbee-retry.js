// lib/utils/zigbee-retry.js
const { pushLog } = require('./log-buffer');

async function configureReportingWithRetry(clusterObj, attr, options, maxRetries = 6) {
  let attempt = 0;
  const baseDelay = 1000;
  while (attempt < maxRetries) {
    try {
      await clusterObj.configureReporting(attr, options);
      pushLog(`configureReporting success for ${attr}`);
      return true;
    } catch (err) {
      attempt++;
      const wait = baseDelay * Math.pow(2, attempt);
      pushLog(`[ZIGBEE-RETRY] Attempt ${attempt}/${maxRetries} failed: ${err && err.message}. Retrying in ${wait}ms`);
      // If Zigbee starting error, keep retrying with exponential backoff
      await new Promise(r => setTimeout(r, wait));
    }
  }
  pushLog(`configureReporting failed after ${maxRetries} attempts for ${attr}`);
  return false;
}

async function readAttributeWithRetry(clusterObj, attr, maxRetries = 3) {
  let attempt = 0;
  const baseDelay = 500;
  while (attempt < maxRetries) {
    try {
      const result = await clusterObj.read(attr);
      pushLog(`readAttribute success for ${attr}: ${result}`);
      return result;
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) {
        pushLog(`readAttribute failed after ${maxRetries} attempts for ${attr}: ${err.message}`);
        throw err;
      }
      const wait = baseDelay * Math.pow(2, attempt);
      pushLog(`[ZIGBEE-RETRY] Read attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

module.exports = { configureReportingWithRetry, readAttributeWithRetry };
