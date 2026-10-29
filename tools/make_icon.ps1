# Builds Icons\icon.ico (16-256 px, PNG-compressed) from Icons\Designer.png, padded to a square.
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$src = [Drawing.Image]::FromFile((Join-Path $root "Icons\Designer.png"))
$sizes = 16, 24, 32, 48, 64, 128, 256

$pngs = foreach ($s in $sizes) {
  $bmp = New-Object Drawing.Bitmap $s, $s, ([Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = "HighQualityBicubic"
  $g.SmoothingMode = "HighQuality"
  $g.PixelOffsetMode = "HighQuality"
  $scale = [Math]::Min($s / $src.Width, $s / $src.Height)
  $w = $src.Width * $scale; $h = $src.Height * $scale
  $g.DrawImage($src, ($s - $w) / 2, ($s - $h) / 2, $w, $h)
  $g.Dispose()
  $ms = New-Object IO.MemoryStream
  $bmp.Save($ms, [Drawing.Imaging.ImageFormat]::Png)
  if ($s -eq 256) { $bmp.Save((Join-Path $root "Icons\icon.png"), [Drawing.Imaging.ImageFormat]::Png) }
  $bmp.Dispose()
  ,$ms.ToArray()
}
$src.Dispose()

$out = New-Object IO.MemoryStream
$bw = New-Object IO.BinaryWriter $out
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $sizes[$i]; $d = if ($s -ge 256) { 0 } else { $s }
  $bw.Write([byte]$d); $bw.Write([byte]$d); $bw.Write([byte]0); $bw.Write([byte]0)
  $bw.Write([uint16]1); $bw.Write([uint16]32)
  $bw.Write([uint32]$pngs[$i].Length); $bw.Write([uint32]$offset)
  $offset += $pngs[$i].Length
}
foreach ($p in $pngs) { $bw.Write($p) }
$bw.Flush()
[IO.File]::WriteAllBytes((Join-Path $root "Icons\icon.ico"), $out.ToArray())
