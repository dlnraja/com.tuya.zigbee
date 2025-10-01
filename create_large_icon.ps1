Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap(500, 500)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::FromArgb(255, 230, 230, 230))
$graphics.Dispose()
$bitmap.Save('drivers\air_quality_monitor\assets\images\large.png', [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
Write-Host 'Created 500x500 image for air_quality_monitor large.png'
