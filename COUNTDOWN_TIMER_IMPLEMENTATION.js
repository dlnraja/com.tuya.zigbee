
/**
 * COUNTDOWN TIMER IMPLEMENTATION
 * 
 * Based on Loïc's device data:
 * - OnOff cluster attribute 16385 (0x4001) = onTime
 * - OnOff cluster attribute 16386 (0x4002) = offWaitTime
 * 
 * Add to device.js:
 */

async setCountdownTimer(gang, seconds) {
  try {
    const endpoint = this.zclNode.endpoints[gang];
    
    if (!endpoint || !endpoint.clusters.onOff) {
      throw new Error(`Gang ${gang} not available`);
    }
    
    this.log(`[COUNTDOWN] Setting gang ${gang} for ${seconds}s`);
    
    // Write onTime attribute (native Zigbee)
    await endpoint.clusters.onOff.writeAttributes({
      onTime: seconds
    });
    
    // Turn on the gang
    await endpoint.clusters.onOff.on();
    
    this.log(`[COUNTDOWN] ✅ Gang ${gang} will turn off in ${seconds}s`);
    
    return true;
  } catch (err) {
    this.error(`[COUNTDOWN] Failed for gang ${gang}:`, err);
    throw err;
  }
}

// Usage in flow card handler:
this.homey.flow.getActionCard('set_countdown')
  .registerRunListener(async (args) => {
    const { gang, duration } = args;
    await args.device.setCountdownTimer(parseInt(gang), parseInt(duration));
  });
