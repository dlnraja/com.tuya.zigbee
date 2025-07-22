
Write-Host "Installation des dépendances..."
npm install

Write-Host "Exécution des scripts..."
npm run sync-drivers
npm run generate-icons
npm run parse-docs

Write-Host "Validation Homey"
homey app validate

Write-Host "Push GitHub"
git add .
git commit -m "feat: auto deploy rebuild"
git push origin master
