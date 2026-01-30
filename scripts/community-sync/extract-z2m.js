#!/usr/bin/env node
const https = require('https'), fs = require('fs'), path = require('path');
const URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';

module.exports = () => {
  return new Promise((resolve) => {
    https.get(URL, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const fps = [...data.matchAll(/_TZ[A-Z0-9]{4}_[a-z0-9]{8}/g)].map(m => m[0]);
        const unique = [...new Set(fps)];
        resolve({count: unique.length, sample: unique.slice(0,30), src:'Z2M'});
      });
    }).on('error', e => resolve({error: e.message}));
  });
};
