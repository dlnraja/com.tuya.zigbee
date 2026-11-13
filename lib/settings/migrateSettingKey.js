'use strict';

/** Read the old settings key, write the new one, leave the old value in place. */
async function migrateSettingKey(device, oldKey, newKey, value) {
  if (!device || typeof device.getSetting !== 'function' || typeof device.setSettings !== 'function') {
    return { wrote: false, reason: 'no-settings-api' };
  }
  const next = device.getSetting(newKey);
  const prev = device.getSetting(oldKey);
  if (next === undefined && prev === undefined) {
    return { wrote: false, reason: 'absent' };
  }
  let write = value;
  if (write === undefined) {
    write = next !== undefined ? next : prev;
  }
  if (next === write) {
    return { wrote: false, reason: 'unchanged', kept: prev, value: write };
  }
  await device.setSettings({ [newKey]: write });
  return { wrote: true, kept: prev, value: write };
}

module.exports = { migrateSettingKey };
