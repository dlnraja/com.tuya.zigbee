
// FIX: Power Detection "mains" String
// Add this to BaseHybridDevice.js detectPowerSource() method
// After: if (typeof powerSource === 'string') {

const ps = powerSource.toLowerCase();

// FIX: Recognize "mains" as AC (discovered in Loïc's data)
if (ps === 'mains' || ps === 'main' || ps === 'ac') {
  this.powerType = 'AC';
  this.log('[POWER] ✅ AC/Mains powered device');
  
  // Remove incorrect battery capability if exists
  if (this.hasCapability('measure_battery')) {
    await this.removeCapability('measure_battery').catch(() => {});
    this.log('[FIX] ✅ Removed incorrect measure_battery from AC device');
  }
  
  return 'AC';
}

// Battery values
if (ps === 'battery' || ps === 'bat') {
  this.powerType = 'BATTERY';
  this.log('[POWER] ✅ Battery powered device');
  return 'BATTERY';
}
