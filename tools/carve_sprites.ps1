Add-Type -AssemblyName System.Drawing

function Carve-Sheet {
  param(
    [string]$Src,
    [array]$Crops
  )

  $bmp = [System.Drawing.Bitmap]::FromFile($Src)
  $bg = $bmp.GetPixel(2, 2)
  $bgR = [int]$bg.R; $bgG = [int]$bg.G; $bgB = [int]$bg.B
  $tol = 6
  Write-Host "  bg=RGB($bgR,$bgG,$bgB) tol=$tol"

  foreach ($c in $Crops) {
    $sliceW = [int]$c.W
    $sliceH = $bmp.Height

    $slice = New-Object System.Drawing.Bitmap $sliceW, $sliceH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($slice)
    $g.DrawImage($bmp,
                 (New-Object System.Drawing.Rectangle 0, 0, $sliceW, $sliceH),
                 [int]$c.X, 0, $sliceW, $sliceH,
                 [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    $rect = New-Object System.Drawing.Rectangle 0, 0, $sliceW, $sliceH
    $data = $slice.LockBits($rect,
              [System.Drawing.Imaging.ImageLockMode]::ReadWrite,
              [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = $data.Stride
    $byteCount = $stride * $sliceH
    $bytes = New-Object byte[] $byteCount
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $byteCount)

    $minX = $sliceW; $maxX = -1; $minY = $sliceH; $maxY = -1
    $loR = $bgR - $tol; $hiR = $bgR + $tol
    $loG = $bgG - $tol; $hiG = $bgG + $tol
    $loB = $bgB - $tol; $hiB = $bgB + $tol

    for ($y = 0; $y -lt $sliceH; $y++) {
      $rowBase = $y * $stride
      for ($x = 0; $x -lt $sliceW; $x++) {
        $i = $rowBase + $x * 4
        $b = $bytes[$i]
        $gC = $bytes[$i + 1]
        $r = $bytes[$i + 2]
        if (($r -ge $loR) -and ($r -le $hiR) -and ($gC -ge $loG) -and ($gC -le $hiG) -and ($b -ge $loB) -and ($b -le $hiB)) {
          $bytes[$i + 3] = 0
        } else {
          if ($x -lt $minX) { $minX = $x }
          if ($x -gt $maxX) { $maxX = $x }
          if ($y -lt $minY) { $minY = $y }
          if ($y -gt $maxY) { $maxY = $y }
        }
      }
    }

    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $byteCount)
    $slice.UnlockBits($data)

    if ($maxX -lt $minX) {
      Write-Host "  $($c.Out): EMPTY (no non-bg pixels found)"
      $slice.Dispose()
      continue
    }

    $cropW = $maxX - $minX + 1
    $cropH = $maxY - $minY + 1
    $final = New-Object System.Drawing.Bitmap $cropW, $cropH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g2 = [System.Drawing.Graphics]::FromImage($final)
    $g2.DrawImage($slice,
                  (New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH),
                  $minX, $minY, $cropW, $cropH,
                  [System.Drawing.GraphicsUnit]::Pixel)
    $g2.Dispose()

    $final.Save($c.Out, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "  $($c.Out) -> $cropW x $cropH"
    $final.Dispose()
    $slice.Dispose()
  }

  $bmp.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
if (-not $root) { $root = $PWD.Path }
$assets = Join-Path $root 'assets'

# Source sheets are 347w x 213h. Three sprites, horizontal. Split: 0-115, 116-230, 231-346.
$thirds = @(
  @{ X = 0;   W = 116 },
  @{ X = 116; W = 115 },
  @{ X = 231; W = 116 }
)

Write-Host "`n=== Ammo-Packs-Misc.png (pistol/rifle/shotgun standard) ==="
Carve-Sheet "$assets\Ammo-Packs-Misc.png" @(
  @{ X = $thirds[0].X; W = $thirds[0].W; Out = "$assets\ammo-pistol.png" },
  @{ X = $thirds[1].X; W = $thirds[1].W; Out = "$assets\ammo-rifle.png" },
  @{ X = $thirds[2].X; W = $thirds[2].W; Out = "$assets\ammo-shotgun.png" }
)

Write-Host "`n=== Ammo-Packs2-misc.png (AP variants) ==="
Carve-Sheet "$assets\Ammo-Packs2-misc.png" @(
  @{ X = $thirds[0].X; W = $thirds[0].W; Out = "$assets\ammo-pistol-ap.png" },
  @{ X = $thirds[1].X; W = $thirds[1].W; Out = "$assets\ammo-rifle-ap.png" },
  @{ X = $thirds[2].X; W = $thirds[2].W; Out = "$assets\ammo-shotgun-ap.png" }
)

Write-Host "`n=== Health-Packs-Misc.png (health red, health green, armor) ==="
Carve-Sheet "$assets\Health-Packs-Misc.png" @(
  @{ X = $thirds[0].X; W = $thirds[0].W; Out = "$assets\health-red.png" },
  @{ X = $thirds[1].X; W = $thirds[1].W; Out = "$assets\health-green.png" },
  @{ X = $thirds[2].X; W = $thirds[2].W; Out = "$assets\armor.png" }
)

Write-Host "`nDone."
