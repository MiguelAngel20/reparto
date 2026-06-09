<?php

/**
 * Genera una versión ligera del logo en WebP (public/images/logoreparto.webp).
 * El original (logoreparto.png) se conserva intacto.
 * Uso: php scripts/optimize-logo.php
 */
$source = __DIR__.'/../public/images/logoreparto.png';
$dest = __DIR__.'/../public/images/logoreparto.webp';

// Ancho máximo: 800px cubre pantallas retina (el logo se muestra a ~300-400px)
$maxWidth = 800;
$quality = 82;

if (! function_exists('imagewebp')) {
    fwrite(STDERR, "GD no tiene soporte WebP en esta instalación de PHP.\n");
    exit(1);
}

if (! file_exists($source)) {
    fwrite(STDERR, "No se encontró el logo: {$source}\n");
    exit(1);
}

[$srcW, $srcH] = getimagesize($source);
$logo = imagecreatefrompng($source);
imagesavealpha($logo, true);

$scale = min(1, $maxWidth / $srcW);
$dstW = (int) round($srcW * $scale);
$dstH = (int) round($srcH * $scale);

$canvas = imagecreatetruecolor($dstW, $dstH);
imagealphablending($canvas, false);
imagesavealpha($canvas, true);
$transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
imagefill($canvas, 0, 0, $transparent);

imagecopyresampled($canvas, $logo, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);
imagewebp($canvas, $dest, $quality);

imagedestroy($canvas);
imagedestroy($logo);

$originalKb = round(filesize($source) / 1024);
$newKb = round(filesize($dest) / 1024);

echo "Original: {$srcW}x{$srcH} ({$originalKb} KB)\n";
echo "Optimizado: {$dstW}x{$dstH} ({$newKb} KB) -> {$dest}\n";
