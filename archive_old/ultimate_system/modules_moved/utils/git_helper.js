// GIT HELPER - Utilitaire Git modulaire
const { execSync } = require('child_process');

const gitFix = () => {
  try {
    execSync('git stash', {stdio: 'pipe'});
    execSync('git pull --rebase', {stdio: 'pipe'});
    execSync('git stash pop', {stdio: 'pipe'});
    return true;
  } catch(e) {
    return false;
  }
};

const gitPush = (message) => {
  try {
    execSync(`git add -A && git commit -m "${message}" && git push`, {stdio: 'pipe'});
    return true;
  } catch(e) {
    return false;
  }
};

module.exports = { gitFix, gitPush };
