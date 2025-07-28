# Vérification en parallèle pour éviter les blocages
Start-Job -ScriptBlock { git status }
Start-Job -ScriptBlock { npm list }
Get-Job | Wait-Job | Receive-Job
