
/**
 * FIX POWER DETECTION - Add to BaseHybridDevice.js
 * 
 * In detectPowerSource() method, add this fix:
 */

// FIX: Handle "mains" string value
if (typeof powerSource === 'string') {
  const ps = powerSource.toLowerCase();
  
  if (ps === 'mains' || ps === 'main' || ps === 'ac') {
    this.powerType = 'AC';
    this.log('[POWER] ✅ AC/Mains powered device');
    
    // Remove incorrect battery capability
    if (this.hasCapability('measure_battery')) {
      await this.removeCapability('measure_battery');
      this.log('[FIX] ✅ Removed incorrect measure_battery from AC device');
    }
    
    return 'AC';
  }
  
  if (ps === 'battery' || ps === 'bat') {
    this.powerType = 'BATTERY';
    return 'BATTERY';
  }
}

// Continue with normal detection...
