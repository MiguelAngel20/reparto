<?php

/**
 * Genera los íconos PWA a partir del logo (public/images/logoreparto.png).
 * Uso: php scripts/generate-pwa-icons.php
 */
$source = __DIR__.'/../public/images/logoreparto.png';
$outDir = __DIR__.'/../public/icons';

if (! file_exists($source)) {
    fwrite(STDERR, "No se encontró el logo: {$source}\n");
    exit(1);
}

if (! is_dir($outDir)) {
    mkdir($outDir, 0755, true);
}

[$srcW, $srcH] = getimagesize($source);
$logo = imagecreatefrompng($source);
imagesavealpha($logo, true);

echo "Logo origen: {$srcW}x{$srcH}\n";

/**
 * Crea un ícono cuadrado centrando el logo sobre fondo.
 * $padRatio: porcentaje de margen alrededor (0 = sin margen).
 * $bg: null = transparente, o [r,g,b].
 */
function makeIcon($logo, int $srcW, int $srcH, int $size, float $padRatio, ?array $bg, string $dest): void
{
    $canvas = imagecreatetruecolor($size, $size);
    imagesavealpha($canvas, true);

    if ($bg === null) {
        $fill = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
    } else {
        $fill = imagecolorallocate($canvas, $bg[0], $bg[1], $bg[2]);
    }
    imagefill($canvas, 0, 0, $fill);

    $inner = (int) round($size * (1 - 2 * $padRatio));
    $scale = min($inner / $srcW, $inner / $srcH);
    $dstW = (int) round($srcW * $scale);
    $dstH = (int) round($srcH * $scale);
    $dstX = (int) (($size - $dstW) / 2);
    $dstY = (int) (($size - $dstH) / 2);

    imagecopyresampled($canvas, $logo, $dstX, $dstY, 0, 0, $dstW, $dstH, $srcW, $srcH);
    imagepng($canvas, $dest);
    imagedestroy($canvas);

    echo "Generado: {$dest} ({$size}x{$size})\n";
}

$white = [255, 255, 255];

// Íconos estándar (fondo blanco para que se vea bien en cualquier launcher)
makeIcon($logo, $srcW, $srcH, 192, 0.08, $white, $outDir.'/icon-192.png');
makeIcon($logo, $srcW, $srcH, 512, 0.08, $white, $outDir.'/icon-512.png');

// Maskable: más margen (zona segura ~80%) para que Android lo recorte en círculo sin cortar el logo
makeIcon($logo, $srcW, $srcH, 512, 0.18, $white, $outDir.'/icon-512-maskable.png');

// Apple touch icon (iOS no soporta transparencia en home screen)
makeIcon($logo, $srcW, $srcH, 180, 0.08, $white, $outDir.'/apple-touch-icon.png');

imagedestroy($logo);

echo "Listo.\n";
