# Traitement intelligent de D:\Download\fold

Write-Host '🧠 Traitement intelligent de D:\Download\fold' -ForegroundColor Green

# 1. Copier les fichiers critiques
Copy-Item -Path 'D:\Download\fold\cursor_*.md' -Destination '.' -Force
Copy-Item -Path 'D:\Download\fold\cursor_*.ps1' -Destination '.' -Force
Copy-Item -Path 'D:\Download\fold\cursor_*.sh' -Destination '.' -Force

# 2. Traiter les références Zigbee
Copy-Item -Path 'D:\Download\fold\zigbee ref.txt' -Destination 'ref\zigbee_reference.txt' -Force

# 3. Traiter les bundles et archives
Copy-Item -Path 'D:\Download\fold\*.tar.gz' -Destination 'backups\' -Force
Copy-Item -Path 'D:\Download\fold\*.txt' -Destination 'docs\reference\' -Force

# 4. Mettre à jour la queue des tâches
if (Test-Path 'cursor_todo_queue.md') { Write-Host '📋 Queue mise à jour' -ForegroundColor Green }
