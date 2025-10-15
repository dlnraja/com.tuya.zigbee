require('child_process').execSync('git commit -m "clean" && git push', {cwd: __dirname, stdio: 'inherit'});
require('fs').unlinkSync(__filename);
