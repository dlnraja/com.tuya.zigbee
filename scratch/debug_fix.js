const fn = 'writeInt32BE';
const s = 'dpData.writeInt32BE(value , 0);';
const regex = new RegExp(`${fn}\\(([^,()]+)\\s*[/*]\\s*([0-9.]+)\\)`, 'g');
console.log('Regex:', regex);
console.log('Match:', s.match(regex));
console.log('Replaced:', s.replace(regex, `${fn}($1, $2)`));
