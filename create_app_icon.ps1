Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap(75, 75)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::FromArgb(255, 230, 230, 230))
$graphics.Dispose()
$bitmap.Save('assets\small.png', [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
Write-Host 'Created 75x75 image for assets\small.png'
