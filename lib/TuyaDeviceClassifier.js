'use strict';

module.exports = {

  hasRtcScreen(device) {
    const model = device.getData()?.modelId || '';
    const manu = device.getData()?.manufacturerName || '';

    // Known LCD TS0601 families
    if (model === 'TS0601' && manu.startsWith('_TZE')) {

      // Exclusions (no screen)
      if (manu.includes('TS0043') || manu.includes('TS0044')) {
        return false;
      }

      // Known RTC LCD batches
      const knownRtc = [
        '_TZE284_vvmbj46n',
        '_TZE284_kfhhe7qj',
        '_TZE200_htnnfasr',
        '_TZE200_lve3dvpy',
        '_TZE284_9yapgbuv',
        '_TZE200_bjawzodf'
      ];

      if (knownRtc.includes(manu)) return true;

      // Fallback: LCD devices usually have no polling
      return true;
    }

    return false;
  }
};
