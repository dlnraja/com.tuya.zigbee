const regex1 = /\.(bak|backup|tmp|old|orig|swp|swo|rej)$/i;
const test1 = 'mfs_db.json.bak.sacred2.1783938509849';
console.log('regex1:', regex1.test(test1), '(should be false, ends with numbers)');

const regex2 = /\.bak/i;
const test2 = 'mfs_db.json.bak.sacred2.1783938509849';
console.log('regex2 (just .bak):', regex2.test(test2), '(should be true)');

const regex3 = /bak\./i;
const test3 = 'mfs_db.json.bak.sacred2.1783938509849';
console.log('regex3 (bak.):', regex3.test(test3), '(should be true)');
