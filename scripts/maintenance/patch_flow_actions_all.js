const fs = require('fs');

const files = [
  { f: 'drivers/switch_2gang/driver.js', max: 2 },
  { f: 'drivers/switch_3gang/driver.js', max: 3 },
  { f: 'drivers/switch_4gang/driver.js', max: 4 },
  { f: 'drivers/switch_6gang/driver.js', max: 6 }
];

for (const entry of files) {
  if (!fs.existsSync(entry.f)) continue;
  let content = fs.readFileSync(entry.f, 'utf8');
  
  const target = `await args.device.triggerCapabilityListener(cap, action === 'turn_on_all').catch(() => {});`;
  
  const replacement = `const val = action === 'turn_on_all';
                if (typeof args.device._setGangOnOff === 'function') {
                  await args.device._setGangOnOff(i, val);
                } else if (args.device.isZclOnlyDevice || args.device._isZclOnlyMode) {
                  const onOff = args.device.zclNode?.endpoints?.[i]?.clusters?.onOff || 
                                args.device.zclNode?.endpoints?.[i]?.clusters?.genOnOff ||
                                args.device._zclNode?.endpoints?.[i]?.clusters?.onOff || 
                                args.device._zclNode?.endpoints?.[i]?.clusters?.genOnOff;
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

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(entry.f, content);
    console.log('Patched turn_on_all in ' + entry.f);
  }
}
