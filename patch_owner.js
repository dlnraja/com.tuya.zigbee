const fs = require('fs');
const glob = require('glob');

const files = glob.sync('.github/scripts/*.js');
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes("const OWNER_USERS=new Set(['dlnraja'")) {
    content = content.replace("const OWNER_USERS=new Set(['dlnraja',", "const REPO_OWNER=process.env.GITHUB_REPOSITORY_OWNER||'dlnraja';\nconst OWNER_USERS=new Set([REPO_OWNER,'dlnraja',");
    changed = true;
  }
  
  if (content.includes("return author.toLowerCase() === 'dlnraja';")) {
    content = content.replace("return author.toLowerCase() === 'dlnraja';", "return author.toLowerCase() === 'dlnraja' || author.toLowerCase() === (process.env.GITHUB_REPOSITORY_OWNER||'').toLowerCase();");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
    changedFiles++;
  }
});

console.log('Total files updated: ' + changedFiles);
