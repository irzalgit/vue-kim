<?php
header('Content-Type: application/json; charset=utf-8');

$dir = __DIR__;
$videos = [];

if (is_dir($dir)) {
    $files = scandir($dir);

    foreach ($files as $file) {
        $path = $dir . DIRECTORY_SEPARATOR . $file;

        if (
            is_file($path) &&
            preg_match('/\.mp4$/i', $file)
        ) {
            $videos[] = $file;
        }
    }
}

sort($videos);

echo json_encode(
    $videos,
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);
