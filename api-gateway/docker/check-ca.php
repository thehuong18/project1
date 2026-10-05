<?php
// Script kiểm tra kết nối MySQL với chứng chỉ CA
$host = getenv('DB_HOST');
$port = getenv('DB_PORT');
$db   = getenv('DB_DATABASE');
$user = getenv('DB_USERNAME');
$pass = getenv('DB_PASSWORD');
$ca   = getenv('MYSQL_ATTR_SSL_CA');

if (!$host || !$db || !$user || !$ca) {
    echo "Missing DB environment variables for CA check.\n";
    exit(0); // Không chặn container nếu thiếu biến, chỉ cảnh báo
}

try {
    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
    $options = [
        PDO::MYSQL_ATTR_SSL_CA => $ca,
        PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => true,
    ];
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "CA check passed: Connected to MySQL successfully.\n";
} catch (PDOException $e) {
    echo "CA check failed: " . $e->getMessage() . "\n";
    exit(1);
}
