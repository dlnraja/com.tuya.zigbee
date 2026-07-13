const fs = require('fs');
for (const app of ['master', 'stable']) {
  const c = JSON.parse(fs.readFileSync(app + '/app.json','utf8'));
  const m = JSON.parse(fs.readFileSync(app + '/data/mfs_db.json','utf8'));
  console.log(app + ' v' + c.version + ': devices=' + Object.keys(m.devices).length + ', mappings=' + Object.keys(m.driverMapping).length + ', couples=' + Object.keys(m.sacredCouples || {}).length);
}
