$appJson = Get-Content -Raw 'app.json' | ConvertFrom-Json
$added = 0
foreach ($driver in $appJson.drivers) {
    if (-not $driver.images -and $driver.id) {
        $driver | Add-Member -NotePropertyName 'images' -NotePropertyValue @{
            small = "./drivers/$($driver.id)/assets/images/small.png"
            large = "./drivers/$($driver.id)/assets/images/large.png"
        } -Force
        $added++
    }
}
$appJson | ConvertTo-Json -Depth 100 | Set-Content 'app.json'
Write-Host "✅ $added images declarations added"
