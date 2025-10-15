require('child_process').execSync('git commit -m "fix: Remove fallback driver images - Force personalized" && git push', {cwd: __dirname, stdio: 'inherit'});
require('fs').unlinkSync(__filename);
