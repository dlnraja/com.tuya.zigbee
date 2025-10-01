Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('drivers\air_quality_monitor\assets\small.png')
Write-Host "$($img.Width)x$($img.Height)"
$img.Dispose()
