# Fetch all manufacturerName from Johan Bendz and compare with ours

$johanDrivers = Get-Content "scripts/audit/johan_drivers.txt" | Where-Object { $_.Trim() -ne "" }
$ourIds = @{}
$johanIds = @{}
$missingIds = @()

# Get our IDs
Get-ChildItem -Path "drivers\*\driver.compose.json" | ForEach-Object {
  $content = Get-Content $_.FullName -Raw | ConvertFrom-Json
  $driver = $_.Directory.Name
  if ($content.zigbee.manufacturerName) {
    foreach ($id in $content.zigbee.manufacturerName) {
      $ourIds[$id] = $driver
    }
  }
}

Write-Host "Our app: $($ourIds.Count) unique IDs"
Write-Host "Johan Bendz: $($johanDrivers.Count) drivers"
Write-Host ""

# Fetch Johan's IDs
$count = 0
foreach ($driver in $johanDrivers) {
  $url = "https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/SDK3/drivers/$driver/driver.compose.json"
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction SilentlyContinue
    $json = $response.Content | ConvertFrom-Json
    if ($json.zigbee.manufacturerName) {
      foreach ($id in $json.zigbee.manufacturerName) {
        if (-not $johanIds.ContainsKey($id)) {
          $johanIds[$id] = @()
        }
        $johanIds[$id] += $driver

        if (-not $ourIds.ContainsKey($id)) {
          $missingIds += [PSCustomObject]@{
            Id          = $id
            JohanDriver = $driver
          }
        }
      }
    }
  }
  catch {
    # Skip errors
  }
  $count++
  if ($count % 20 -eq 0) {
    Write-Host "  Processed $count/$($johanDrivers.Count)..."
  }
}

Write-Host ""
Write-Host "Johan total: $($johanIds.Count) unique IDs"
Write-Host "Missing from our app: $($missingIds.Count) IDs"
Write-Host ""

# Group by driver
$grouped = $missingIds | Group-Object -Property JohanDriver | Sort-Object -Property Count -Descending

Write-Host "Top missing by Johan driver:"
$grouped | Select-Object -First 20 | ForEach-Object {
  Write-Host "  $($_.Name): $($_.Count) IDs"
}

# Save missing IDs
$missingIds | ConvertTo-Json -Depth 10 | Out-File "scripts/audit/missing_ids.json" -Encoding UTF8
Write-Host ""
Write-Host "Saved to scripts/audit/missing_ids.json"
