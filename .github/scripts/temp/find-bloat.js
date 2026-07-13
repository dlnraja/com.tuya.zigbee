'use strict';
const fs = require('fs');
const path = require('path');
const ignoreWalk = require('ignore-walk');

const walker = new ignoreWalk.Walker({
  path: '.',
  ignoreFiles: ['.homeyignore', '$default-ignore-rules'],
  includeEmpty: true,
  follow: true,
});

const ignoreRules = [
  '.*',
  '.homeybuild',
  '*.{ts,mts,cts}',
  'tsconfig.json',
  'env.json',
  '*.compose.json',
  'node_modules',
];
walker.onReadIgnoreFile('$default-ignore-rules', ignoreRules.join('\r\n'), () => {});

walker.on('done', (entries) => {
  const files = entries.map(e => {
    try {
      const stat = fs.statSync(e);
      return { path: e, size: stat.size };
    } catch {
      return { path: e, size: 0 };
    }
  });
  
  // Sort by size desc
  files.sort((a, b) => b.size - a.size);
  
  console.log('Total files:', files.length);
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  console.log('Total uncompressed size:', (totalSize/1024/1024).toFixed(2) + ' MB');
  
  console.log('\nTop 50 largest files:');
  files.slice(0, 50).forEach(f => {
    console.log(`  ${(f.size/1024/1024).toFixed(2)} MB -> ${f.path}`);
  });
}).start();
