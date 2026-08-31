#!/usr/bin/env node
'use strict';

const rf = require('../../lib/utils/rf-channel-coexistence');

function assert(cond, msg) {
  if (!cond) {throw new Error(msg);}
}

assert(rf.zigbeeCenterMhz(15) === 2425, 'Zigbee 15 centre');
assert(rf.wifiCenterMhz(1) === 2412, 'Wi-Fi 1 centre');
assert(rf.wifiCenterMhz(11) === 2462, 'Wi-Fi 11 centre');

const o1 = rf.zigbeeChannelsOverlappedByWifi(1, 20);
assert(o1.includes(11) && o1.includes(14) && !o1.includes(20), 'Wi-Fi 1 overlaps low Zigbee');

const s15vs1 = rf.scoreWifiZigbeePair(1, 15, 20);
const s15vs11 = rf.scoreWifiZigbeePair(11, 15, 20);
assert(s15vs11.score > s15vs1.score, 'Zigbee 15 should score better vs Wi-Fi 11 than vs Wi-Fi 1');

const rec = rf.recommendZigbeeChannels([1, 6, 11], 20);
assert(rec.preferred.includes(15) && rec.preferred.includes(20) && rec.preferred.includes(25), 'preferred 15/20/25');

const tips = rf.formatCoexistenceTips();
assert(tips.some((t) => /≠|different numbering/i.test(t)), 'numbering tip present');

console.log('rf-channel-coexistence-smoke: OK');
console.log('  preferred:', rec.preferred.join(','));
console.log('  avoid:', rec.avoid.join(','));
