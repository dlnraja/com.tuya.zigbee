#!/usr/bin/env node
const fs = require('fs'), path = require('path'), {execSync} = require('child_process');
const tmp = '/tmp/johan', repo = 'JohanBendz/com.tuya.zigbee';

module.exports = () => {
  try { execSync(`rm -rf ${tmp} && git clone --depth 1 https://github.com/${repo}.git ${tmp}`, {stdio:'pipe'}); } 
  catch(e) { return {error: e.message}; }
  
  const fps = [], dir = `${tmp}/drivers`;
  if (!fs.existsSync(dir)) return {error:'no drivers'};
  
  fs.readdirSync(dir).forEach(d => {
    try {
      const c = JSON.parse(fs.readFileSync(`${dir}/${d}/driver.compose.json`));
      const m = [].concat(c.zigbee?.manufacturerName || []);
      m.forEach(mfr => mfr && fps.push({mfr, driver: d, src:'Johan'}));
    } catch(e) {}
  });
  
  return {count: fps.length, fingerprints: fps.slice(0,50)};
};
