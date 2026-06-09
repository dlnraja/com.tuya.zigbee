const fs = require('fs');
const files = [
  'drivers/switch_2gang/driver.js',
  'drivers/switch_3gang/driver.js',
  'drivers/switch_4gang/driver.js',
  'drivers/switch_6gang/driver.js'
];

const target = 'await args.device.triggerCapabilityListener(cap, val);';
const replacement = `if (typeof args.device._setGangOnOff === 'function') {
                  await args.device._setGangOnOff(idx + 1, val);
                } else if (args.device.isZclOnlyDevice || args.device._isZclOnlyMode) {
                  const onOff = args.device.zclNode?.endpoints?.[idx + 1]?.clusters?.onOff || 
                                args.device.zclNode?.endpoints?.[idx + 1]?.clusters?.genOnOff ||
                                args.device._zclNode?.endpoints?.[idx + 1]?.clusters?.onOff || 
                                args.device._zclNode?.endpoints?.[idx + 1]?.clusters?.genOnOff;
                  if (onOff) {
                    if (typeof onOff.writeAttributes === 'function') {
                      await onOff.writeAttributes({ onOff: val ? true : false }).catch(() => onOff[val ? 'setOn' : 'setOff']());
                    } else {
                      await onOff[val ? 'setOn' : 'setOff']();
                    }
                  }
                } else {
                  await args.device.triggerCapabilityListener(cap, val).catch(() => {});
                }
                
                if (typeof args.device.safeSetCapabilityValue === 'function') {
                  await args.device.safeSetCapabilityValue(cap, val).catch(() => {});
                } else {
                  await args.device.setCapabilityValue(cap, val).catch(() => {});
                }`;

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(f, content);
    console.log('Patched ' + f);
  } else {
    console.log('Skipped ' + f + ' (Target not found)');
  }
}
