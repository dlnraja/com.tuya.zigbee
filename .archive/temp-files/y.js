require('child_process').execSync('git add -A && git commit -m "v2.16.0 - Force new CDN URL" && git push', {cwd: __dirname, stdio: 'inherit'});
require('fs').unlinkSync(__filename);
