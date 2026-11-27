<?php
/* Socle de l'espace créateur : en-têtes, session, jeton CSRF, mot de passe,
   limitation des essais. Compatible PHP 7.4 et plus. */
declare(strict_types=1);

const PRIVATE_DIR = __DIR__ . '/private';
const SECRET_FILE = PRIVATE_DIR . '/secret.php';
const SETUP_FILE = PRIVATE_DIR . '/setup-token.php';
const ATTEMPTS_FILE = PRIVATE_DIR . '/attempts.php';
const IDLE_TIMEOUT = 1800;          // 30 minutes sans activité
const ATTEMPT_WINDOW = 900;         // 15 minutes
const MAX_ATTEMPTS_PER_IP = 5;
const MAX_ATTEMPTS_TOTAL = 30;
const PASSWORD_MIN = 12;

ini_set('display_errors', '0');

function send_security_headers(): void
{
    header_remove('X-Powered-By');
    header("Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval'; "
        . "style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://cdn.jsdelivr.net; "
        . "worker-src blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    header('X-Frame-Options: DENY');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header('X-Robots-Tag: noindex, nofollow');
    header('Cache-Control: no-store');
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off')
        || (string) ($_SERVER['SERVER_PORT'] ?? '') === '443';
}

/* Sans HTTPS, le mot de passe circulerait en clair : seul un accès depuis
   la machine elle-même est alors accepté. */
function require_secure_transport(): void
{
    $local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
    if (!is_https() && !$local) {
        http_response_code(403);
        exit('Espace créateur accessible uniquement en HTTPS.');
    }
}

function start_secure_session(): void
{
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_cache_limiter('');             // garde notre Cache-Control
    session_name('ed_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/admin/index.php')), '/') . '/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
    if (!empty($_SESSION['auth']) && time() - ($_SESSION['seen'] ?? 0) > IDLE_TIMEOUT) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    $_SESSION['seen'] = time();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
}

function csrf_token(): string
{
    return $_SESSION['csrf'];
}

function csrf_valid($token): bool
{
    return is_string($token) && hash_equals($_SESSION['csrf'], $token);
}

/* Les fichiers privés sont des .php qui retournent une valeur : même servis
   par erreur (serveur qui ignore .htaccess), ils n'affichent rien. */
function read_private(string $file, $default)
{
    if (!is_file($file)) {
        return $default;
    }
    if (function_exists('opcache_invalidate')) {
        opcache_invalidate($file, true);
    }
    return include $file;
}

function write_private(string $file, $value): bool
{
    return write_atomic($file, "<?php\nreturn " . var_export($value, true) . ";\n");
}

function write_atomic(string $file, string $content): bool
{
    $tmp = $file . '.' . bin2hex(random_bytes(6)) . '.tmp';
    if (file_put_contents($tmp, $content, LOCK_EX) !== strlen($content) || !rename($tmp, $file)) {
        @unlink($tmp);
        return false;
    }
    if (function_exists('opcache_invalidate')) {
        opcache_invalidate($file, true);
    }
    return true;
}

function password_digest(): string
{
    $secret = read_private(SECRET_FILE, []);
    return (string) ($secret['password'] ?? '');
}

/* Change à chaque nouveau mot de passe : les autres sessions tombent. */
function auth_stamp(): string
{
    return hash('sha256', password_digest());
}

function is_logged_in(): bool
{
    return password_digest() !== '' && is_string($_SESSION['auth'] ?? null)
        && hash_equals(auth_stamp(), $_SESSION['auth']);
}

function log_in(): void
{
    session_regenerate_id(true);
    $_SESSION['auth'] = auth_stamp();
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

/* Compte la tentative AVANT de vérifier le mot de passe, sous verrou, pour
   que des requêtes simultanées ne contournent pas la limite. */
function register_attempt(): bool
{
    $lock = fopen(PRIVATE_DIR . '/attempts.lock', 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        return false;                       // en cas de doute, on refuse
    }
    $since = time() - ATTEMPT_WINDOW;
    $list = array_values(array_filter(read_private(ATTEMPTS_FILE, []), function ($a) use ($since) {
        return $a[0] > $since;
    }));
    $ip = hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? ''));
    $mine = count(array_filter($list, function ($a) use ($ip) {
        return $a[1] === $ip;
    }));
    $allowed = $mine < MAX_ATTEMPTS_PER_IP && count($list) < MAX_ATTEMPTS_TOTAL;
    if ($allowed) {
        $list[] = [time(), $ip];
        $allowed = write_private(ATTEMPTS_FILE, $list);
    }
    flock($lock, LOCK_UN);
    fclose($lock);
    return $allowed;
}

function clear_attempts(): void
{
    write_private(ATTEMPTS_FILE, []);
}

/* Retourne un message d'erreur, ou '' après avoir enregistré le mot de passe. */
function set_password(string $password, string $confirm): string
{
    if (strlen($password) < PASSWORD_MIN) {
        return 'Le mot de passe doit faire au moins ' . PASSWORD_MIN . ' caractères.';
    }
    if (strlen($password) > 72) {
        return 'Le mot de passe ne doit pas dépasser 72 octets.';
    }
    if (!hash_equals($password, $confirm)) {
        return 'Les deux mots de passe ne correspondent pas.';
    }
    if (!write_private(SECRET_FILE, ['password' => password_hash($password, PASSWORD_DEFAULT)])) {
        return "Écriture impossible dans admin/private/ : vérifiez les droits du dossier.";
    }
    return '';
}

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}
