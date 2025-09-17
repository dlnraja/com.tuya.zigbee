const {exec} = require('child_process');
console.log('🤖 AUTO PUBLISH - CYCLE 2/10');
exec('homey app publish', (err, out) => {
  console.log(out || err);
});
