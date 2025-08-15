console.log('TEST TERMINAL - DÉMARRAGE');
console.log('=' .repeat(30));

const fs = require('fs');

if (fs.existsSync('app.json')) {
    console.log('✅ app.json trouvé');
} else {
    console.log('❌ app.json manquant');
}

if (fs.existsSync('drivers')) {
    console.log('✅ dossier drivers trouvé');
} else {
    console.log('❌ dossier drivers manquant');
}

console.log('FIN DU TEST');
console.log('Retour à la ligne final');
