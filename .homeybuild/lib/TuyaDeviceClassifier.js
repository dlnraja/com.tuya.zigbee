'use strict';

module.exports = {

  hasRtcScreen(device) {
    const model = device.getData()?.modelId || '';
    const manu = (device.getData()?.manufacturerName || '').toLowerCase();

    // Known LCD TS0601 families
    if (model === 'TS0601' && manu.startsWith('_tze')) {

      // Exclusions (no screen)
      if (manu.includes('ts0043') || manu.includes('ts0044')) {
        return false;
      }

      // Known RTC LCD batches
      const knownRtc = [
        '_tze284_vvmbj46n',
        '_tze284_kfhhe7qj',
        '_tze200_htnnfasr',
        '_tze200_lve3dvpy',
        '_tze284_9yapgbuv',
        '_tze200_bjawzodf'
      ];

      if (knownRtc.includes(manu)) return true;

      // Fallback: LCD devices usually have no polling
      return true;
    }

    return false;
  }
};
