'use strict';
// v9.0.40: MCU Version Request Helper
// Inspired by Z2M's configureMcuVersionRequest pattern
// Standardizes MCU version request and data query initialization

/**
 * Send MCU version request and data query to a Tuya device
 * This is the standard initialization sequence for TS0601 devices
 * @param {object} cluster - TuyaSpecificCluster instance
 * @param {object} options
 * @param {boolean} options.sendDataQuery - Whether to send data query after version request (default: true)
 * @param {number} options.delayBetween - Delay between commands in ms (default: 100)
 * @returns {Promise<boolean>}
 */
async function configureMcuVersionRequest(cluster, options = {}) {
  const { sendDataQuery = true, delayBetween = 100 } = options;

  try {
    // Step 1: MCU Version Request (0x10)
    // Buffer [0x00, 0x00] = standard version request
    // Buffer [0x00, 0x02] = version request with data query hint
    await cluster.mcuVersionRequest({ data: Buffer.from([0x00, 0x02]) });

    if (delayBetween > 0) {
      await new Promise(r => this.homey.setTimeout(r, delayBetween));
    }

    // Step 2: Data Query (0x03)
    // Requests device to report all current DP values
    if (sendDataQuery) {
      await cluster.dataQuery({});
    }

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Send time sync to a Tuya device
 * @param {object} cluster - TuyaSpecificCluster instance
 * @param {number} format - Time format (from TuyaTimeSyncFormats)
 * @returns {Promise<boolean>}
 */
async function sendTimeSync(cluster, format) {
  try {
    const now = new Date();
    const timeData = formatTimeSync(now, format);
    await cluster.sendFrame(0xEF00, timeData, { commandId: 0x24 });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Format time data for Tuya time sync
 * @param {Date} date
 * @param {number} format
 * @returns {Buffer}
 */
function formatTimeSync(date, format) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const weekday = date.getDay() || 7; // 1=Mon, 7=Sun

  // Standard Tuya format: [YY,MM,DD,HH,MM,SS,Wd]
  return Buffer.from([
    year - 2000,
    month,
    day,
    hours,
    minutes,
    seconds,
    weekday,
  ]);
}

module.exports = {
  configureMcuVersionRequest,
  sendTimeSync,
  formatTimeSync,
};
