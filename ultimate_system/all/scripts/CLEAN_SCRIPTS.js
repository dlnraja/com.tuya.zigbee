const fs = require('fs');

console.log('🧹 CLEAN SCRIPTS');

fs.readdirSync('.').filter(f => f.endsWith('.js') && !['app.js'].includes(f)).forEach(f => {
  try {
    fs.renameSync(f, `./ultimate_system/all/scripts/${f}`);
    console.log(`✅ ${f}`);
  } catch(e) {
    fs.unlinkSync(f);
    console.log(`🗑️ ${f}`);
  }
});

console.log('✅ Done');
