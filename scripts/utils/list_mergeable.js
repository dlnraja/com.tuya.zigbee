const app = require('./app.json');
const drivers = app.drivers || [];
const merged = {};

drivers.forEach(d => {
  const base = d.id
    .replace(/_aaa$/,'')
    .replace(/_aa$/,'')
    .replace(/_cr2032$/,'')
    .replace(/_cr2450$/,'')
    .replace(/_cr1632$/,'')
    .replace(/_battery$/,'')
    .replace(/_advanced$/,'')
    .replace(/_basic$/,'');
  
  if(!merged[base]) merged[base]=[];
  merged[base].push(d.id);
});

const toMerge = Object.entries(merged)
  .filter(([_,ids])=>ids.length>1)
  .sort((a,b)=>b[1].length-a[1].length)
  .slice(0,40);

console.log('Top 40 mergeable groups:');
toMerge.forEach(([base,ids])=>{
  console.log(`${base}: ${ids.length} variants - ${ids.join(', ')}`);
});

console.log(`\nTotal variants that can be merged: ${toMerge.reduce((sum,[_,ids])=>sum+ids.length-1,0)}`);
