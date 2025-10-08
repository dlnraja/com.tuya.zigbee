const { execSync } = require('child_process');
let i = 1;
function retry() {
    console.log(`🔄 ${i}`);
    execSync('git add -A && git commit -m "Retry ' + i + '" --allow-empty && git push origin master');
    i++;
    if (i <= 10) setTimeout(retry, 180000);
}
retry();
