'use strict';
const fs = require('fs');
const path = require('path');

const BUILD_DIR = 'c:\\Users\\HP\\Desktop\\homey-app\\tuya_repair\\.homeybuild';

function getDirStats(dir) {
  let size = 0;
  let files = 0;
  let dirs = 0;

  function walk(current) {
    if (!fs.existsSync(current)) return;
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      dirs++;
      const entries = fs.readdirSync(current);
      for (const entry of entries) {
        walk(path.join(current, entry));
      }
    } else {
      files++;
      size += stat.size;
    }
  }

  walk(dir);
  return { size, files, dirs };
}

if (!fs.existsSync(BUILD_DIR)) {
  console.error('.homeybuild does not exist!');
  process.exit(1);
}

const entries = fs.readdirSync(BUILD_DIR);
for (const entry of entries) {
  const fullPath = path.join(BUILD_DIR, entry);
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    const stats = getDirStats(fullPath);
    console.log(`${entry}/: ${(stats.size / 1024 / 1024).toFixed(2)} MB, ${stats.files} files, ${stats.dirs} dirs`);
  } else {
    console.log(`${entry}: ${(stat.size / 1024).toFixed(2)} KB`);
  }
}
