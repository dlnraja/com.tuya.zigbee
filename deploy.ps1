
# PowerShell script to setup and deploy project
Write-Host "Installing dependencies..."
npm install

Write-Host "Running automation scripts..."
npm run sync-drivers
npm run generate-icons
npm run parse-docs

Write-Host "Pushing to GitHub..."
git add .
git commit -m "feat: auto-generated Homey Tuya Zigbee app"
git push origin master
