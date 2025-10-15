require('child_process').execSync('git add -A && git commit -m "v2.15.108" && git push', {cwd: __dirname, stdio: 'inherit'});
require('fs').unlinkSync(__filename);
