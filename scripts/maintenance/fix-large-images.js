#!/usr/bin/env node
/**
 * FIX LARGE IMAGES - Workaround for Homey CLI bug
 * 
 * The Homey CLI doesn't copy large.png files to .homeybuild
 * This script copies them manually after build
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const BUILD_DIR = path.join(ROOT, '.homeybuild', 'drivers');

// Only run if .homeybuild exists (after build)
if (!fs.existsSync(BUILD_DIR)) {
  console.log('⏭️  .homeybuild not found, skipping image fix');
  process.exit(0);
}

// ===== MINIFY app.json to pass Homey size limit =====
const APP_JSON_PATH = path.join(ROOT, '.homeybuild', 'app.json');
const ROOT_APP_JSON_PATH = path.join(ROOT, 'app.json');

for (const p of [APP_JSON_PATH, ROOT_APP_JSON_PATH]) {
  if (fs.existsSync(p)) {
    try {
      const raw = fs.readFileSync(p, 'utf8');
      let app = JSON.parse(raw);
      let rLower=0, rTrans=0, fTrans=0;
      const keep = new Set(['en', 'nl']);
      
      app.drivers.forEach(d => {
        if(d.zigbee && Array.isArray(d.zigbee.manufacturerName)) {
          let mixed = new Set();
          d.zigbee.manufacturerName.forEach(m => {
            if(m !== m.toLowerCase() && m !== m.toUpperCase()) mixed.add(m.toLowerCase());
          });
          d.zigbee.manufacturerName = d.zigbee.manufacturerName.filter(m => {
            if((m === m.toLowerCase() || m === m.toUpperCase()) && mixed.has(m.toLowerCase())) {
              rLower++; return false;
            }
            return true;
          });
        }
        if(d.settings) {
          d.settings.forEach(s => {
            ['label','hint'].forEach(k => {
              if(s[k] && typeof s[k]==='object') {
                Object.keys(s[k]).forEach(lang => {
                  if(!keep.has(lang)) { delete s[k][lang]; rTrans++; }
                });
              }
            });
            if(s.values) {
              s.values.forEach(v => {
                if(v.label && typeof v.label==='object') {
                  Object.keys(v.label).forEach(lang => {
                    if(!keep.has(lang)) { delete v.label[lang]; rTrans++; }
                  });
                }
              });
            }
          });
        }
      });
      
      if(app.flow) {
        ['triggers','conditions','actions'].forEach(k => {
          if(app.flow[k]) {
            app.flow[k].forEach(f => {
              ['title','titleFormatted'].forEach(tk => {
                if(f[tk] && typeof f[tk]==='object') {
                  Object.keys(f[tk]).forEach(lang => {
                    if(!keep.has(lang)) { delete f[tk][lang]; fTrans++; }
                  });
                }
              });
              if(f.args) {
                f.args.forEach(a => {
                  if(a.title && typeof a.title==='object') {
                    Object.keys(a.title).forEach(lang => {
                      if(!keep.has(lang)) { delete a.title[lang]; fTrans++; }
                    });
                  }
                });
              }
              if(f.tokens) {
                f.tokens.forEach(t => {
                  if(t.title && typeof t.title==='object') {
                    Object.keys(t.title).forEach(lang => {
                      if(!keep.has(lang)) { delete t.title[lang]; fTrans++; }
                    });
                  }
                });
              }
            });
          }
        });
      }
      
      const minified = JSON.stringify(app);
      fs.writeFileSync(p, minified, 'utf8');
      const saved = raw.length - minified.length;
      console.log(` — Minified ${path.basename(path.dirname(p))}/${path.basename(p)} from ${(raw.length / 1048576).toFixed(2)} MB to ${(minified.length / 1048576).toFixed(2)} MB (saved ${(saved / 1048576).toFixed(2)} MB)`);
    } catch (e) {
      console.error(` — Failed to minify ${p}:`, e.message);
    }
  } else {
    console.log(` — ${p} not found, skipping minification`);
  }
}

let copied = 0;

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
  fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
);

for (const driver of drivers) {
  // Check both possible locations for large.png
  const sources = [
    path.join(DRIVERS_DIR, driver, 'assets', 'images', 'large.png'),
    path.join(DRIVERS_DIR, driver, 'assets', 'large.png')
  ];
  
  for (const src of sources) {
    if (fs.existsSync(src)) {
      const dstDir = path.join(BUILD_DIR, driver, 'assets', 'images');
      const dst = path.join(dstDir, 'large.png');
      
      // Create directory if needed
      if (!fs.existsSync(dstDir)) {
        fs.mkdirSync(dstDir, { recursive: true });
      }
      
      // Copy file
      fs.copyFileSync(src, dst);
      copied++;
      break; // Found and copied, move to next driver
    }
  }
}

console.log(`✅ Copied ${copied} large.png files to .homeybuild`);
