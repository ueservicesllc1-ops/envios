Add-Type -AssemblyName System.Drawing

function Create-FalconiIcon([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Background gradient
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.ColorTranslator]::FromHtml("#0b0f19"),
        [System.Drawing.ColorTranslator]::FromHtml("#1a2236"),
        45.0
    )
    $g.FillRectangle($brush, $rect)

    # Gold rim / border
    $penWidth = [Math]::Max(2, [int]($size * 0.03))
    $goldPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#f59e0b"), $penWidth)
    $inset = [int]($size * 0.05)
    $innerRect = New-Object System.Drawing.Rectangle $inset, $inset, ($size - 2 * $inset), ($size - 2 * $inset)
    $g.DrawEllipse($goldPen, $innerRect)

    # Secondary subtle golden glow ring
    $penWidth2 = [Math]::Max(1, [int]($size * 0.01))
    $goldPen2 = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#78350f"), $penWidth2)
    $inset2 = [int]($size * 0.09)
    $innerRect2 = New-Object System.Drawing.Rectangle $inset2, $inset2, ($size - 2 * $inset2), ($size - 2 * $inset2)
    $g.DrawEllipse($goldPen2, $innerRect2)

    # Central Letter 'F' (Luxury Serif style)
    $fontSize = [int]($size * 0.42)
    $font = New-Object System.Drawing.Font("Georgia", $fontSize, [System.Drawing.FontStyle]::Bold)
    $goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#fbbf24"))

    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = New-Object System.Drawing.RectangleF 0, ($size * 0.12), $size, ($size * 0.55)
    $g.DrawString("F", $font, $goldBrush, $textRect, $sf)

    # Subtitle text 'FALCONI'
    $subFontSize = [Math]::Max(7, [int]($size * 0.085))
    $subFont = New-Object System.Drawing.Font("Arial", $subFontSize, [System.Drawing.FontStyle]::Bold)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#e2e8f0"))
    $subRect = New-Object System.Drawing.RectangleF 0, ($size * 0.65), $size, ($size * 0.18)
    $g.DrawString("FALCONI", $subFont, $whiteBrush, $subRect, $sf)

    # Category 'PARFUMS'
    $catFontSize = [Math]::Max(5, [int]($size * 0.055))
    $catFont = New-Object System.Drawing.Font("Arial", $catFontSize, [System.Drawing.FontStyle]::Regular)
    $catBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#f59e0b"))
    $catRect = New-Object System.Drawing.RectangleF 0, ($size * 0.78), $size, ($size * 0.12)
    $g.DrawString("ASESOR", $catFont, $catBrush, $catRect, $sf)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created: $outputPath ($($size)x$($size))"
}

$destDir = "e:\Envios\catalogo-asesor\public\icons"
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir }

Create-FalconiIcon 180 "$destDir\icon-180.png"
Create-FalconiIcon 192 "$destDir\icon-192.png"
Create-FalconiIcon 512 "$destDir\icon-512.png"
Create-FalconiIcon 180 "e:\Envios\catalogo-asesor\public\apple-touch-icon.png"
