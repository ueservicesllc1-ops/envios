Add-Type -AssemblyName System.Drawing

function Create-PosIcon([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Background gradient
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.ColorTranslator]::FromHtml("#050a14"),
        [System.Drawing.ColorTranslator]::FromHtml("#0f1b2b"),
        45.0
    )
    $g.FillRectangle($brush, $rect)

    # Emerald & Gold Rim
    $penWidth = [Math]::Max(2, [int]($size * 0.035))
    $goldPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#10b981"), $penWidth)
    $inset = [int]($size * 0.05)
    $innerRect = New-Object System.Drawing.Rectangle $inset, $inset, ($size - 2 * $inset), ($size - 2 * $inset)
    $g.DrawEllipse($goldPen, $innerRect)

    # Secondary inner gold ring
    $penWidth2 = [Math]::Max(1, [int]($size * 0.012))
    $goldPen2 = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#f59e0b"), $penWidth2)
    $inset2 = [int]($size * 0.09)
    $innerRect2 = New-Object System.Drawing.Rectangle $inset2, $inset2, ($size - 2 * $inset2), ($size - 2 * $inset2)
    $g.DrawEllipse($goldPen2, $innerRect2)

    # Central Letter 'POS'
    $fontSize = [int]($size * 0.28)
    $font = New-Object System.Drawing.Font("Georgia", $fontSize, [System.Drawing.FontStyle]::Bold)
    $goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#34d399"))

    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = New-Object System.Drawing.RectangleF 0, ($size * 0.18), $size, ($size * 0.45)
    $g.DrawString("POS", $font, $goldBrush, $textRect, $sf)

    # Subtitle 'FALCONI'
    $subFontSize = [Math]::Max(7, [int]($size * 0.085))
    $subFont = New-Object System.Drawing.Font("Arial", $subFontSize, [System.Drawing.FontStyle]::Bold)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#f8fafc"))
    $subRect = New-Object System.Drawing.RectangleF 0, ($size * 0.62), $size, ($size * 0.18)
    $g.DrawString("FALCONI", $subFont, $whiteBrush, $subRect, $sf)

    # Badge 'PUNTO DE VENTA'
    $catFontSize = [Math]::Max(5, [int]($size * 0.052))
    $catFont = New-Object System.Drawing.Font("Arial", $catFontSize, [System.Drawing.FontStyle]::Bold)
    $catBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#fbbf24"))
    $catRect = New-Object System.Drawing.RectangleF 0, ($size * 0.78), $size, ($size * 0.12)
    $g.DrawString("PUNTO DE VENTA", $catFont, $catBrush, $catRect, $sf)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created: $outputPath ($($size)x$($size))"
}

$destDir = "e:\Envios\puntodeventa\public\icons"
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir }

Create-PosIcon 180 "$destDir\icon-180.png"
Create-PosIcon 192 "$destDir\icon-192.png"
Create-PosIcon 512 "$destDir\icon-512.png"
Create-PosIcon 180 "e:\Envios\puntodeventa\public\apple-touch-icon.png"
