<?php
/* Enregistre config.js. N'accepte que les champs prévus, avec le bon type. */
declare(strict_types=1);
require __DIR__ . '/lib.php';

send_security_headers();
require_secure_transport();
start_secure_session();
header('Content-Type: application/json; charset=utf-8');

const MAX_BODY = 7000000;

function reply(int $status, string $error = ''): void
{
    http_response_code($status);
    echo json_encode($error === '' ? ['ok' => true] : ['error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

function is_text($v, int $max = 20000): bool
{
    return is_string($v) && strlen($v) <= $max;
}

function is_list($v): bool
{
    return is_array($v) && count($v) <= 200 && ($v === [] || array_keys($v) === range(0, count($v) - 1));
}

function is_record($v, array $keys): bool
{
    if (!is_array($v) || array_diff(array_keys($v), $keys)) {
        return false;
    }
    foreach ($v as $item) {
        if (!is_text($item) && !is_bool($item)) {
            return false;
        }
    }
    return true;
}

/* https, ou chemin relatif au site. */
function is_safe_url(string $url): bool
{
    $url = trim($url);
    return $url === '' || preg_match('~^https://[^\s<>"\']+$~i', $url) === 1
        || preg_match('~^(?![a-z][a-z0-9+.\-]*:)(?![\\\\/]{2})[^\x00-\x1f<>"\'\\\\]+$~i', $url) === 1;
}

function is_safe_image($src): bool
{
    return is_string($src) && (preg_match('~^data:image/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$~i', $src) === 1
        || (strlen($src) < 2000 && is_safe_url($src)));
}

function validate(array $cfg): string
{
    $texts = ['gameName', 'tagline', 'version', 'description', 'betaNotice', 'downloadUrl', 'downloadButtonLabel',
        'downloadNote', 'downloadHelpText', 'contactEmail', 'legalEntityName', 'legalAddress', 'legalCountry',
        'donationUrl', 'donationText', 'donationGoal', 'donationRaised', 'hostingInfo'];
    $textLists = ['features', 'origins'];
    $recordLists = ['changelog' => ['version', 'highlight'], 'faq' => ['question', 'answer'],
        'disciplines' => ['name', 'playable']];

    foreach ($cfg as $key => $value) {
        if (in_array($key, $texts, true)) {
            if (!is_text($value)) {
                return "Champ invalide : $key";
            }
        } elseif (in_array($key, $textLists, true) || isset($recordLists[$key]) || $key === 'screenshots') {
            if (!is_list($value)) {
                return "Liste invalide : $key";
            }
            foreach ($value as $item) {
                if ($key === 'screenshots') {
                    if (is_string($item)) {
                        $ok = is_safe_image($item);
                    } else {
                        $ok = is_record($item, ['src', 'full', 'title', 'text'])
                            && is_safe_image($item['src'] ?? null)
                            && (!isset($item['full']) || is_safe_image($item['full']));
                    }
                } else {
                    $ok = isset($recordLists[$key]) ? is_record($item, $recordLists[$key]) : is_text($item);
                }
                if (!$ok) {
                    return "Élément invalide dans : $key";
                }
            }
        } else {
            return 'Champ inconnu : ' . substr((string) $key, 0, 40);
        }
    }
    if (empty($cfg['gameName'])) {
        return 'Le nom du jeu est obligatoire.';
    }
    if (!is_safe_url($cfg['downloadUrl'] ?? '')) {
        return 'Lien de téléchargement refusé : utilisez une adresse https.';
    }
    $donation = trim($cfg['donationUrl'] ?? '');
    if ($donation !== '' && (stripos($donation, 'https://') !== 0 || !is_safe_url($donation))) {
        return 'Lien de cagnotte refusé : utilisez une adresse https.';
    }
    return '';
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    reply(405, 'Méthode refusée.');
}
if (!is_logged_in()) {
    reply(401, 'Session expirée : reconnectez-vous dans un autre onglet, puis rechargez.');
}
if (!csrf_valid($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) {
    reply(403, 'Jeton de sécurité invalide : rechargez la page.');
}
if (stripos((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') !== 0) {
    reply(415, 'Format refusé.');
}
$body = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
if ($body === false || strlen($body) > MAX_BODY) {
    reply(413, 'Configuration trop lourde : réduisez les images ajoutées.');
}
$cfg = json_decode($body, true, 8);
if (!is_array($cfg)) {
    reply(400, 'JSON illisible.');
}
$problem = validate($cfg);
if ($problem !== '') {
    reply(422, $problem);
}

$target = dirname(__DIR__) . '/config.js';
$json = json_encode($cfg, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === false) {
    reply(400, 'Texte illisible dans la configuration.');
}
if (is_file($target)) {
    @copy($target, PRIVATE_DIR . '/config.previous.js');
}
if (!write_atomic($target, "window.SITE_CONFIG = $json;\n")) {
    reply(500, 'Écriture impossible : vérifiez les droits sur config.js et son dossier.');
}
@chmod($target, 0644);
reply(200);
