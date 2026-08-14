'use strict';

function capabilityForGang(gang, device) {
  if (gang === 1) { return 'onoff'; }
  const dotted = `onoff.${gang}`;
  const gangNamed = `onoff.gang${gang}`;
  if (!device?.hasCapability) { return dotted; }
  if (device.hasCapability(dotted)) { return dotted; }
  if (device.hasCapability(gangNamed)) { return gangNamed; }
  return dotted;
}

function readCapability(device, capability) {
  try {
    return device.getCapabilityValue(capability);
  } catch (_) {
    return false;
  }
}

async function syncCapability(device, capability, value) {
  if (!device?.hasCapability?.(capability)) {return;}
  if (typeof device.safeSetCapabilityValue === 'function') {
    await device.safeSetCapabilityValue(capability, value).catch(() => {});
    return;
  }
  await device.setCapabilityValue?.(capability, value).catch(() => {});
}

function isMissingCapabilityListenerError(error) {
  const message = String(error?.message || error || '');
  return /missing capability listener|no capability listener/i.test(message);
}

async function setGangOnOff(device, gang, value) {
  if (!device) {return false;}
  const capability = capabilityForGang(gang, device);
  const nextValue = value === 'toggle'
    ? !readCapability(device, capability)
    : value === true;

  if (typeof device._setGangOnOff === 'function') {
    await device._setGangOnOff(gang, nextValue);
    await syncCapability(device, capability, nextValue);
    return true;
  }

  if (typeof device.triggerCapabilityListener === 'function') {
    try {
      await device.triggerCapabilityListener(capability, nextValue);
      await syncCapability(device, capability, nextValue);
      return true;
    } catch (error) {
      if (!isMissingCapabilityListenerError(error)) {throw error;}
      // Fall through to UI sync for legacy devices without a listener.
    }
  }

  await syncCapability(device, capability, nextValue);
  return true;
}

async function setAllGangsOnOff(device, gangCount, value) {
  if (!device) {return false;}
  for (let gang = 1; gang <= gangCount; gang++) {
    await setGangOnOff(device, gang, value);
  }
  return true;
}

module.exports = {
  capabilityForGang,
  setGangOnOff,
  setAllGangsOnOff,
};
