'use strict';

function capabilityForGang(gang) {
  return gang === 1 ? 'onoff' : `onoff.gang${gang}`;
}

function readCapability(device, capability) {
  try {
    return device.getCapabilityValue(capability);
  } catch (_) {
    return false;
  }
}

async function syncCapability(device, capability, value) {
  if (!device?.hasCapability?.(capability)) return;
  if (typeof device.safeSetCapabilityValue === 'function') {
    await device.safeSetCapabilityValue(capability, value).catch(() => {});
    return;
  }
  await device.setCapabilityValue?.(capability, value).catch(() => {});
}

async function setGangOnOff(device, gang, value) {
  if (!device) return false;
  const capability = capabilityForGang(gang);
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
    } catch (_) {
      // Fall through to UI sync for legacy devices without a listener.
    }
  }

  await syncCapability(device, capability, nextValue);
  return true;
}

async function setAllGangsOnOff(device, gangCount, value) {
  if (!device) return false;
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
