<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

send_security_headers();
require_secure_transport();
start_secure_session();

$error = '';
$notice = '';
$post = function (string $key): string {
    return is_string($_POST[$key] ?? null) ? $_POST[$key] : '';
};

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = $post('action');
    if (!csrf_valid($_POST['csrf'] ?? null)) {
        http_response_code(403);
        $error = 'La page a expiré. Réessayez.';
    } elseif ($action === 'setup' && password_digest() === '') {
        // Le premier mot de passe exige un code que seul celui qui a accès
        // aux fichiers du serveur peut avoir déposé.
        $expected = (string) read_private(SETUP_FILE, '');
        if (!register_attempt()) {
            http_response_code(429);
            $error = 'Trop d’essais. Attendez 15 minutes.';
        } elseif (strlen($expected) < 20 || !hash_equals($expected, $post('token'))) {
            $error = 'Code d’installation refusé.';
        } else {
            $error = set_password($post('password'), $post('confirm'));
            if ($error === '') {
                @unlink(SETUP_FILE);
                clear_attempts();
                log_in();
                header('Location: ./', true, 303);
                exit;
            }
        }
    } elseif ($action === 'login') {
        if (!register_attempt()) {
            http_response_code(429);
            $error = 'Trop d’essais. Attendez 15 minutes.';
        } elseif (password_digest() !== '' && password_verify($post('password'), password_digest())) {
            clear_attempts();
            log_in();
            header('Location: ./', true, 303);
            exit;
        } else {
            $error = 'Mot de passe incorrect.';
        }
    } elseif ($action === 'logout') {
        $_SESSION = [];
        session_regenerate_id(true);
        header('Location: ./', true, 303);
        exit;
    } elseif ($action === 'password' && is_logged_in()) {
        if (!register_attempt()) {
            http_response_code(429);
            $error = 'Trop d’essais. Attendez 15 minutes.';
        } elseif (!password_verify($post('current'), password_digest())) {
            $error = 'Mot de passe actuel incorrect.';
        } else {
            $error = set_password($post('password'), $post('confirm'));
            if ($error === '') {
                clear_attempts();
                log_in();
                $notice = 'Mot de passe mis à jour.';
            }
        }
    }
}

if (is_logged_in()) {
    require __DIR__ . '/editor.php';
    exit;
}
$needsSetup = password_digest() === '';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Espace créateur</title>
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="creator.css">
</head>
<body>
<div class="lock-wrap">
  <div class="lock-card">
    <h1>Espace créateur</h1>
<?php if ($error !== ''): ?>
    <p class="form-error" role="alert"><?= h($error) ?></p>
<?php endif; ?>
<?php if (!$needsSetup): ?>
    <form method="post" action="./">
      <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
      <input type="hidden" name="action" value="login">
      <div class="field"><label for="password">Mot de passe</label>
        <input type="password" id="password" name="password" autocomplete="current-password" required></div>
      <button class="btn btn-gold btn-block">Se connecter</button>
    </form>
<?php elseif (is_file(SETUP_FILE)): ?>
    <p>Première connexion : saisissez le code d’installation, puis choisissez un mot de passe.</p>
    <form method="post" action="./">
      <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
      <input type="hidden" name="action" value="setup">
      <div class="field"><label for="token">Code d’installation</label>
        <input type="password" id="token" name="token" autocomplete="off" required></div>
      <div class="field"><label for="password">Mot de passe (<?= PASSWORD_MIN ?> caractères minimum)</label>
        <input type="password" id="password" name="password" autocomplete="new-password" required minlength="<?= PASSWORD_MIN ?>"></div>
      <div class="field"><label for="confirm">Confirmez-le</label>
        <input type="password" id="confirm" name="confirm" autocomplete="new-password" required></div>
      <button class="btn btn-gold btn-block">Créer le mot de passe</button>
    </form>
<?php else: ?>
    <p>Aucun mot de passe n’est défini. Créez sur le serveur le fichier
      <code>admin/private/setup-token.php</code> (voir <code>SECURITE.md</code>), puis rechargez cette page.</p>
<?php endif; ?>
  </div>
</div>
</body>
</html>
