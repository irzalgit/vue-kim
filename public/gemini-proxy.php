<?php
// gemini-proxy.php
// Proxy sederhana untuk memanggil Gemini API dari server (PHP),
// supaya API key tidak terekspos ke browser/frontend.

error_reporting(E_ALL & ~E_DEPRECATED & ~E_WARNING);
header('Content-Type: application/json');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

header('Access-Control-Allow-Origin: *');

// Hanya izinkan method POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Method not allowed']]);
    exit;
}

// Validasi asal request: izinkan same-origin / host cPanel
$allowedHosts = ['math315.id', 'www.math315.id', 'localhost', '127.0.0.1'];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';
$serverHost = $_SERVER['HTTP_HOST'] ?? '';
$sourceHost = '';

if ($origin) {
    $sourceHost = parse_url($origin, PHP_URL_HOST) ?: '';
} elseif ($referer) {
    $sourceHost = parse_url($referer, PHP_URL_HOST) ?: '';
}

$isAllowed = false;

// Jika request berasal dari host server saat ini (cPanel domain) atau tidak ada header origin/referer (same-origin fetch)
if (!$sourceHost) {
    $isAllowed = true;
} elseif ($serverHost) {
    $cleanServerHost = explode(':', $serverHost)[0];
    if ($sourceHost === $cleanServerHost || (function_exists('str_ends_with') ? str_ends_with($sourceHost, '.' . $cleanServerHost) : substr($sourceHost, -strlen('.' . $cleanServerHost)) === '.' . $cleanServerHost)) {
        $isAllowed = true;
    }
}

if (!$isAllowed && $sourceHost) {
    foreach ($allowedHosts as $host) {
        $matches = ($sourceHost === $host) || (function_exists('str_ends_with') ? str_ends_with($sourceHost, '.' . $host) : substr($sourceHost, -strlen('.' . $host)) === '.' . $host);
        if ($matches) {
            $isAllowed = true;
            break;
        }
    }
}

if (!$isAllowed) {
    http_response_code(403);
    echo json_encode(['error' => ['message' => 'Akses ditolak: request tidak berasal dari domain yang diizinkan']]);
    exit;
}

// Ambil API key dari environment variable server / .htaccess SetEnv / REDIRECT_ (FastCGI/PHP-FPM)
$apiKey = getenv('VITE_GEMINI_API_KEY') ?: getenv('GEMINI_API_KEY');
if (!$apiKey && isset($_SERVER['VITE_GEMINI_API_KEY'])) {
    $apiKey = $_SERVER['VITE_GEMINI_API_KEY'];
}
if (!$apiKey && isset($_SERVER['REDIRECT_VITE_GEMINI_API_KEY'])) {
    $apiKey = $_SERVER['REDIRECT_VITE_GEMINI_API_KEY'];
}
if (!$apiKey && isset($_SERVER['GEMINI_API_KEY'])) {
    $apiKey = $_SERVER['GEMINI_API_KEY'];
}
if (!$apiKey && isset($_SERVER['REDIRECT_GEMINI_API_KEY'])) {
    $apiKey = $_SERVER['REDIRECT_GEMINI_API_KEY'];
}
if (!$apiKey && isset($_ENV['VITE_GEMINI_API_KEY'])) {
    $apiKey = $_ENV['VITE_GEMINI_API_KEY'];
}
if (!$apiKey && isset($_ENV['GEMINI_API_KEY'])) {
    $apiKey = $_ENV['GEMINI_API_KEY'];
}

// Fallback baca dari .env jika server PHP-FPM / cPanel mengisolasi env vars
if (!$apiKey && file_exists(__DIR__ . '/../.env')) {
    $envLines = @file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($envLines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($envK, $envV) = explode('=', $line, 2);
            $envK = trim($envK);
            $envV = trim($envV, " \t\n\r\0\x0B\"'");
            if (($envK === 'GEMINI_API_KEY' || $envK === 'VITE_GEMINI_API_KEY') && $envV) {
                $apiKey = $envV;
                break;
            }
        }
    }
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
