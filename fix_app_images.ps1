Add-Type -AssemblyName System.Drawing

# Créer large.png 500x500
$bitmap = New-Object System.Drawing.Bitmap(500, 500)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::FromArgb(255, 230, 230, 230))
$graphics.Dispose()
$bitmap.Save('assets\images\large.png', [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
Write-Host 'Created 500x500 image for assets\images\large.png'

# Créer small.png 250x175
$bitmap2 = New-Object System.Drawing.Bitmap(250, 175)
$graphics2 = [System.Drawing.Graphics]::FromImage($bitmap2)
$graphics2.Clear([System.Drawing.Color]::FromArgb(255, 230, 230, 230))
$graphics2.Dispose()
$bitmap2.Save('assets\images\small.png', [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap2.Dispose()
Write-Host 'Created 250x175 image for assets\images\small.png'
