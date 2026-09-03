# ═══════════════════════════════════════════════════════════════
#  Nasazeni fotek do assets/  —  zdroj: Downloads\Andrea_Barvirova_foto_*
#  Zmensi na 2000 px delsi strana, ulozi jako JPEG q85 do assets\.
#  Spousteni:  powershell -ExecutionPolicy Bypass -File .\_podklady\nasad-fotky.ps1
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$src  = Join-Path $env:USERPROFILE 'Downloads'
$root = Split-Path -Parent $PSScriptRoot
$dst  = Join-Path $root 'assets'
$maxEdge = 2000
$quality = 85

$map = [ordered]@{
  'Andrea_Barvirova_foto_-33 (1).jpg' = 'katka-portret.jpg'  # zahrada, sedi, ruce na koleni
  'Andrea_Barvirova_foto_-21 (1).jpg' = 'mistnost.jpg'       # detail rukou na tvari (na sirku)
  'Andrea_Barvirova_foto_-18 (1).jpg' = 'ruce-detail.jpg'    # Katka do objektivu (na sirku)
  'Andrea_Barvirova_foto_-19 (1).jpg' = 'rozhovor.jpg'       # stoji za lehatkem (na vysku)
  'Andrea_Barvirova_foto_-16 (1).jpg' = 'ruce-prace.jpg'     # ruce drzi hlavu shora (na vysku)
}

# --- kontrola pred zapisem ---
$chyby = @()
foreach ($k in $map.Keys) {
  if (-not (Test-Path (Join-Path $src $k))) { $chyby += "Chybi zdroj: $k" }
}
if (-not (Test-Path $dst)) { $chyby += "Chybi cilova slozka: $dst" }
if ($chyby.Count -gt 0) {
  Write-Host "`nNic jsem nezapsal:" -ForegroundColor Red
  $chyby | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}

# --- zaloha stavajicich ---
$existujici = $map.Values | Where-Object { Test-Path (Join-Path $dst $_) }
if ($existujici) {
  $zal = Join-Path $PSScriptRoot ('zaloha-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
  New-Item -ItemType Directory -Path $zal | Out-Null
  foreach ($f in $existujici) { Copy-Item (Join-Path $dst $f) $zal }
  Write-Host "Zaloha puvodnich: $zal" -ForegroundColor Yellow
}

# --- JPEG encoder ---
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$par = New-Object System.Drawing.Imaging.EncoderParameters(1)
$par.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)

Write-Host ""
foreach ($k in $map.Keys) {
  $inPath  = Join-Path $src $k
  $outPath = Join-Path $dst $map[$k]

  $img = [System.Drawing.Image]::FromFile($inPath)
  $w = $img.Width; $h = $img.Height
  $scale = [Math]::Min(1.0, $maxEdge / [Math]::Max($w, $h))
  $nw = [int]([Math]::Round($w * $scale)); $nh = [int]([Math]::Round($h * $scale))

  $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $nw, $nh)
  $g.Dispose()
  $bmp.Save($outPath, $enc, $par)
  $bmp.Dispose(); $img.Dispose()

  $kb = [int]((Get-Item $outPath).Length / 1KB)
  Write-Host ("OK  {0,-22} {1}x{2} -> {3}x{4}  {5} KB" -f $map[$k], $w, $h, $nw, $nh, $kb)
}

Write-Host "`nHotovo. Chybi jeste assets\katka-portret-omne.jpg (Katka v zahrade s bilymi kvety)." -ForegroundColor Yellow
Write-Host "Pak spust druhe okno Claude Code se zadanim z _podklady\ZADANI.md." -ForegroundColor Green
