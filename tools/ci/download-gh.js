const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const url = 'https://github.com/cli/cli/releases/download/v2.62.0/gh_2.62.0_windows_amd64.zip';
const out = path.join(os.tmpdir(), 'gh.zip');
const extractDir = 'C:\\Program Files\\GitHub CLI';

console.log('Downloading gh CLI...');
console.log('  From:', url);
console.log('  To:', out);

function go(targetUrl, redirects) {
  redirects = redirects || 0;
  if (redirects > 5) {
    console.error('  Too many redirects');
    return;
  }
  https.get(targetUrl, function(res) {
    console.log('  HTTP', res.statusCode, '(content-length:', res.headers['content-length'] || '?', ')');
    if (res.statusCode === 302 || res.statusCode === 301) {
      console.log('  Following redirect to:', res.headers.location);
      go(res.headers.location, redirects + 1);
      return;
    }
    if (res.statusCode !== 200) {
      console.error('  Download failed:', res.statusCode);
      return;
    }
    const file = fs.createWriteStream(out);
    res.pipe(file);
    let downloaded = 0;
    res.on('data', function(chunk) {
      downloaded += chunk.length;
    });
    file.on('finish', function() {
      file.close();
      const sizeMB = (fs.statSync(out).size / 1048576).toFixed(1);
      console.log('  Downloaded:', sizeMB + ' MB');
      // Extract
      try {
        fs.mkdirSync(extractDir, { recursive: true });
        console.log('  Extracting to:', extractDir);
        cp.execSync('powershell -NoProfile -Command "Expand-Archive -Path \'' + out + '\' -DestinationPath \'' + extractDir + '\' -Force"', { stdio: 'inherit' });
        console.log('  Extracted');
        const files = fs.readdirSync(extractDir);
        console.log('  Files in extract dir:', files.length, ':', files.slice(0, 3).join(','));
        // Cleanup
        try { fs.unlinkSync(out); console.log('  Cleaned up zip'); } catch (e) {}
      } catch (e) {
        console.error('  Extract failed:', e.message);
      }
    });
  }).on('error', function(e) {
    console.error('  Error:', e.message);
  });
}

go(url);
