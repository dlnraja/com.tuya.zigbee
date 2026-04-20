const fs = require('fs');
const path = require('path');

// We need to fix the flow action cards for ALL gang switches to use triggerCapabilityListener
// instead of setCapabilityValue. setCapabilityValue just updates Homey's UI without sending the Zigbee command.
const switchDrivers = ['switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang', 'switch_wall_5gang', 'switch_wall_6gang', 'switch_wall_7gang', 'switch_wall_8gang'];

for (const drv of switchDrivers) {
  const file = `drivers/${drv}/driver.js`;
  if (!fs.existsSync(file)) continue;

  let content = fs.readFileSync(file, 'utf8');

  // Replace setCapabilityValue(cap, true) with triggerCapabilityListener(cap, true)
  content = content.replace(/await args\.device\.setCapabilityValue\(([^,]+),\s*true\);/g, "await args.device.triggerCapabilityListener($1, true);");
  content = content.replace(/await args\.device\.setCapabilityValue\(([^,]+),\s*false\);/g, "await args.device.triggerCapabilityListener($1, false);");
  content = content.replace(/await args\.device\.setCapabilityValue\(([^,]+),\s*!v\);/g, "await args.device.triggerCapabilityListener($1, !v);");

  fs.writeFileSync(file, content);
  console.log(` Fixed flow actions in ${drv}/driver.js`);
}

