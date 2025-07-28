# Travail en arrière-plan pour éviter les blocages
Start-Job -ScriptBlock { git status } -Name 'GitStatus'
Start-Job -ScriptBlock { npm list } -Name 'NpmList'
Start-Sleep -Seconds 2
Get-Job | Receive-Job
Get-Job | Remove-Job
