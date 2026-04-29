const s = 'return match ? parseInt(match[1] );'        ;
const r = /\? ([^?:]+);/g;
console.log(s.replace(r, '? $1 ;'));
