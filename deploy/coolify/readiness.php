<?php
// Read-only check: database connectivity, JWT key pair and PHP-FPM socket.
try {
    $url = parse_url((string) getenv('DATABASE_URL'));
    if (!$url || !isset($url['host'], $url['user'], $url['path'])) {
        throw new RuntimeException('Invalid database configuration');
    }
    $pdo = new PDO(
        sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $url['host'], $url['port'] ?? 3306, rawurldecode(ltrim($url['path'], '/'))),
        rawurldecode($url['user']), rawurldecode($url['pass'] ?? ''),
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 3]
    );
    $pdo->query('SELECT 1');
    $private = openssl_pkey_get_private(
        file_get_contents((string) getenv('JWT_SECRET_KEY')),
        (string) getenv('JWT_PASSPHRASE')
    );
    $public = openssl_pkey_get_public(file_get_contents((string) getenv('JWT_PUBLIC_KEY')));
    if (!$private || !$public || openssl_pkey_get_details($private)['key'] !== openssl_pkey_get_details($public)['key']) {
        throw new RuntimeException('Invalid JWT keys');
    }
    if (PHP_SAPI === 'cli') {
        $socket = @fsockopen('127.0.0.1', 9000, $errno, $error, 2);
        if (!$socket) {
            throw new RuntimeException('PHP-FPM unavailable');
        }
        fclose($socket);
    }
    echo "ok\n";
} catch (Throwable $exception) {
    if (PHP_SAPI !== 'cli') {
        http_response_code(503);
    }
    echo "not ready\n";
    exit(1);
}
