<?php
// list.php
// Taruh file ini di dalam folder public/videos/
// Script ini otomatis membaca semua file .mp4 di folder yang sama
// dan mengembalikannya sebagai JSON, tanpa perlu edit kode manual.

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); // boleh dihapus kalau tidak perlu akses lintas domain

$dir = __DIR__; // folder tempat file list.php ini berada (yaitu folder videos/)
$videos = [];

if (is_dir($dir)) {
    $files = scandir($dir);
    foreach ($files as $file) {
        // Hanya ambil file .mp4, abaikan file lain (termasuk list.php sendiri)
        if (preg_match('/\.mp4$/i', $file)) {
            $videos[] = $file;
        }
    }
}

// Urutkan A-Z
sort($videos);

echo json_encode($videos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
