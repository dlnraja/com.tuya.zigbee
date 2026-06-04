$json = Get-Content 'c:\Users\HP\Desktop\homey-app\tuya_repair\drivers\curtain_motor\driver.compose.json' | ConvertFrom-Json
$mfrs = $json.zigbee.manufacturerName
$lower = $mfrs | ForEach-Object { $_.ToLower() }
$dupes = $lower | Group-Object | Where-Object { $_.Count -gt 1 }
if ($dupes) {
  Write-Host 'Duplicates found:'
  foreach ($d in $dupes) {
    Write-Host ('  ' + $d.Name + ' (' + $d.Count + 'x)')
  }
} else {
  Write-Host 'No duplicates found'
}
Write-Host ('Total entries: ' + $mfrs.Count)
