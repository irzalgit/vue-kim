<?php
// gemini-proxy.php
// Proxy sederhana untuk memanggil Gemini API dari server (PHP),
// supaya API key tidak terekspos ke browser/frontend.

error_reporting(E_ALL & ~E_DEPRECATED & ~E_WARNING);
header('Content-Type: application/json');

// Hanya izinkan method POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Method not allowed']]);
    exit;
}

// Validasi asal request: hanya izinkan yang datang dari domain situs ini,
// supaya orang lain tidak bisa "numpang" pakai proxy (dan kuota Gemini) dari luar.
$allowedHosts = ['math315.id', 'www.math315.id', 'localhost', '127.0.0.1'];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';
$sourceHost = '';

if ($origin) {
    $sourceHost = parse_url($origin, PHP_URL_HOST) ?: '';
} elseif ($referer) {
    $sourceHost = parse_url($referer, PHP_URL_HOST) ?: '';
}

$isAllowed = false;
foreach ($allowedHosts as $host) {
    if ($sourceHost === $host || str_ends_with($sourceHost, '.' . $host)) {
        $isAllowed = true;
        break;
    }
}

if (!$isAllowed) {
    http_response_code(403);
    echo json_encode(['error' => ['message' => 'Akses ditolak: request tidak berasal dari domain yang diizinkan']]);
    exit;
}

// Ambil API key dari environment variable server.
// Di cPanel: Setup Node.js App / .htaccess SetEnv, atau di file terpisah.
// Di lokal (php -S / Termux): export lewat shell sebelum start server, contoh:
//   export VITE_GEMINI_API_KEY="key_kamu"
$apiKey = getenv('VITE_GEMINI_API_KEY') ?: getenv('GEMINI_API_KEY');

if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Gemini API key tidak ditemukan di server (set env VITE_GEMINI_API_KEY)']]);
    exit;
}

// Ambil body request dari frontend
$body = file_get_contents('php://input');
$payload = json_decode($body, true);

if (!$payload || !isset($payload['model'])) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Payload tidak valid, field "model" wajib diisi']]);
    exit;
}

$model = $payload['model'];

// Susun payload untuk Gemini API (buang field 'model' dari body, karena itu di URL)
$geminiPayload = $payload;
unset($geminiPayload['model']);

$url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-goog-api-key: ' . $apiKey,
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($geminiPayload));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => "Gagal menghubungi Gemini API: {$curlError}"]]);
    exit;
}

http_response_code($httpCode);
echo $response;
