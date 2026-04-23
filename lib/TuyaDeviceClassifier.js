'use strict';
const CI = require('./utils/CaseInsensitiveMatcher');

module.exports = {

  hasRtcScreen(device) {
    const model = device.getData()?.modelId || '';const manu = device.getData()?.manufacturerName || '';// Known LCD TS0601 families
    if (CI.equalsCI(model, 'TS0601') && CI.startsWithCI(manu, '_tze')) {

      // Exclusions (no screen)
      if (CI.containsCI(manu, 'ts0043') || CI.containsCI(manu, 'ts0044')) {
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

      if (CI.includesCI(knownRtc, manu)) return true;

      // Fallback: LCD devices usually have no polling
      return true;
    }

    return false;
  }
};



