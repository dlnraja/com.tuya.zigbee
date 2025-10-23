#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('📸 Copie des images USB...\n');

const sourceDir = 'drivers/avatto_usb_outlet/assets';
const targets = [
  'drivers/usb_outlet_1gang/assets',
  'drivers/usb_outlet_2port/assets',
  'drivers/usb_outlet_3gang/assets'
];

targets.forEach(targetDir => {
  // Créer dossier images si n'existe pas
  const targetImages = path.join(targetDir, 'images');
  if (!fs.existsSync(targetImages)) {
    fs.mkdirSync(targetImages, { recursive: true });
  }
  
  // Copier images
  ['small.png', 'large.png', 'xlarge.png'].forEach(img => {
    const src = path.join(sourceDir, 'images', img);
    const dst = path.join(targetImages, img);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      console.log(`✅ ${path.basename(targetDir)}: ${img}`);
    }
  });
  
  // Copier learnmode.svg si existe
  const learnmodeSrc = path.join(sourceDir, 'learnmode.svg');
  const learnmodeDst = path.join(targetDir, 'learnmode.svg');
  if (fs.existsSync(learnmodeSrc)) {
    fs.copyFileSync(learnmodeSrc, learnmodeDst);
    console.log(`✅ ${path.basename(targetDir)}: learnmode.svg`);
  }
});

console.log('\n✅ Images USB copiées!');
