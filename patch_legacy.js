const fs = require('fs');
const path = require('path');
const driversDir = path.join(process.cwd(), 'drivers');
const drivers = ['wall_switch_6_gang_tuya', 'wall_switch_5_gang_tuya', 'wall_switch_4_gang', 'wall_switch_4_gang_tuya', 'wall_switch_3_gang', 'wall_switch_2_gang', 'switch_3_gang', 'switch_2_gang_metering', 'switch_2_gang', 'socket_power_strip_four', 'socket_power_strip_four_two', 'socket_power_strip_four_three', 'smartplug_2_socket', 'double_power_point_2', 'dimmer_2_gang_tuya'];

drivers.forEach(d => {
  const devicePath = path.join(driversDir, d, 'device.js');
  if (fs.existsSync(devicePath)) {
    let content = fs.readFileSync(devicePath, 'utf8');
    let changed = false;

    if (content.includes("registerCapabilityListener('onoff', async (value) => {") && !content.includes("markAppCommand")) {
      content = content.replace(/registerCapabilityListener\('onoff', async \(value\) => \{/g, "registerCapabilityListener('onoff', async (value) => {\n      if (typeof this.markAppCommand === 'function') this.markAppCommand();");
      changed = true;
    }

    if (content.includes("await this.triggerCapabilityListener('onoff'") && !content.includes("_triggerPhysicalFlow")) {
      content = content.replace(/await this\.triggerCapabilityListener\('onoff', parsedValue\)/g, "if (typeof this._triggerPhysicalFlow === 'function') this._triggerPhysicalFlow(parsedValue);\n          await this.triggerCapabilityListener('onoff', parsedValue)");
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(devicePath, content);
      console.log(d + ' updated');
    }
  }
});
