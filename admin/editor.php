<?php
/* Interface de l'éditeur : incluse par index.php après connexion seulement. */
if (!function_exists('is_logged_in') || !is_logged_in()) {
    http_response_code(403);
    exit;
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="csrf-token" content="<?= h(csrf_token()) ?>">
<title>Espace créateur — Esports Director</title>
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="creator.css">
</head>
<body>

<div class="editor-shell show" id="editorShell">
  <div class="topbar">
    <div class="container">
      <div class="brand"><span class="dot"></span> Espace créateur</div>
      <div style="display:flex;gap:10px;align-items:center;">
        <span class="status-pill" id="fileStatus"></span>
        <a href="../index.html" class="btn btn-ghost">← Voir le site public</a>
        <form method="post" action="./"><input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="action" value="logout"><button class="btn btn-ghost">Se déconnecter</button></form>
        <button class="btn btn-gold" id="saveBtn">💾 Enregistrer</button>
      </div>
    </div>
  </div>

  <div class="container" style="padding-top:28px;padding-bottom:60px;">
<?php if ($notice !== '' || $error !== ''): ?>
    <p class="flash" role="status"><?= h($notice !== '' ? $notice : $error) ?></p>
<?php endif; ?>

    <div class="panel">
      <h2>Informations générales</h2>
      <div class="grid-2">
        <div class="field"><label>Nom du jeu</label><input type="text" id="f_gameName"></div>
        <div class="field"><label>Version affichée</label><input type="text" id="f_version"></div>
      </div>
      <div class="field"><label>Accroche (tagline)</label><input type="text" id="f_tagline"></div>
      <div class="field"><label>Description</label><textarea id="f_description"></textarea></div>
    </div>

    <div class="panel">
      <h2>Téléchargement bêta</h2>
      <p class="section-sub" style="margin-bottom:14px;">
        Laissez le lien vide pour pointer automatiquement sur le paquet publié depuis cette page
        (<code>build/EsportsDirector_&lt;version&gt;.zip</code>). Renseignez-le seulement si vous hébergez
        le zip ailleurs — utile car beaucoup d'hébergeurs gratuits refusent un fichier de plus de 100 Mo.
      </p>
      <div class="field">
        <label>Lien de téléchargement (vide = paquet publié ici)</label>
        <input type="url" id="f_downloadUrl" placeholder="https://... (Google Drive, GitHub Releases, etc.)">
      </div>
      <div class="field"><label>Texte du bouton (vide = « Télécharger &lt;version&gt; »)</label><input type="text" id="f_downloadButtonLabel"></div>
      <div class="field"><label>Bandeau bêta (en haut de la page d'accueil)</label><textarea id="f_betaNotice"></textarea></div>
      <div class="field"><label>Note sous le bouton (taille, plateforme, lancement)</label><textarea id="f_downloadNote"></textarea></div>
      <div class="field"><label>Encadré sous les étapes d'installation (remontée de bugs)</label><textarea id="f_downloadHelpText"></textarea></div>
    </div>

    <div class="panel">
      <h2>Cagnotte et hébergement</h2>
      <div class="field"><label>Lien de la cagnotte (https, vide = « bientôt ouverte »)</label><input type="url" id="f_donationUrl" placeholder="https://..."></div>
      <div class="field"><label>Texte de présentation</label><textarea id="f_donationText"></textarea></div>
      <div class="grid-2">
        <div class="field"><label>Objectif en euros (vide = pas de jauge)</label><input type="number" id="f_donationGoal" min="0"></div>
        <div class="field"><label>Montant récolté en euros (mis à jour à la main)</label><input type="number" id="f_donationRaised" min="0"></div>
      </div>
      <div class="field"><label>Hébergeur du site (nom, adresse, contact) pour les mentions légales</label><textarea id="f_hostingInfo"></textarea></div>
    </div>

    <div class="panel">
      <h2>Fonctionnalités mises en avant</h2>
      <div id="featuresList"></div>
      <button class="add-row-btn" id="addFeatureBtn">+ Ajouter une fonctionnalité</button>
    </div>

    <div class="panel">
      <h2>Captures d'écran</h2>
      <p class="section-sub" style="margin-bottom:14px;">Ajoutées en base64 directement dans le fichier — restez sur des images légères et compressées.</p>
      <div id="shotsList" style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;"></div>
      <input type="file" id="shotUpload" accept="image/*" multiple style="display:none;">
      <button class="add-row-btn" id="addShotBtn">+ Ajouter une image</button>
    </div>

    <div class="panel">
      <h2>Notes de patch</h2>
      <div id="changelogList"></div>
      <button class="add-row-btn" id="addChangelogBtn">+ Ajouter une version</button>
    </div>

    <div class="panel">
      <h2>Questions fréquentes (FAQ)</h2>
      <div id="faqList"></div>
      <button class="add-row-btn" id="addFaqBtn">+ Ajouter une question</button>
    </div>

    <div class="panel">
      <h2>Contact &amp; mentions légales</h2>
      <p class="section-sub" style="margin-bottom:14px;">Utilisé sur la page Contact et sur les Mentions légales — c'est l'adresse à laquelle vos testeurs enverront leurs retours.</p>
      <div class="field"><label>Email de contact</label><input type="text" id="f_contactEmail" placeholder="contact@votredomaine.com"></div>
      <div class="grid-2">
        <div class="field"><label>Nom de l'éditeur (vous, ou votre structure)</label><input type="text" id="f_legalEntityName"></div>
        <div class="field"><label>Pays (droit applicable)</label><input type="text" id="f_legalCountry" placeholder="France"></div>
      </div>
      <div class="field"><label>Adresse</label><input type="text" id="f_legalAddress"></div>
    </div>

    <div class="panel">
      <h2>Téléchargement du jeu</h2>
      <p class="section-sub" style="margin-bottom:14px;">
        Le bouton ci-dessous lit le dossier source du jeu, minifie tout le JavaScript (code compact et
        illisible) et écrit le paquet dans <code>build/</code>, dans ce même dossier. C'est <b>ce fichier
        zip</b> que le bouton de téléchargement du site public propose directement aux testeurs : dès que
        vous publiez une nouvelle version <b>et que vous enregistrez</b> (le champ « Version affichée » se
        met à jour tout seul après publication), le lien du site pointe sur la nouvelle.
      </p>
      <p class="section-sub" style="margin-bottom:14px;">
        Nécessite Chrome ou Edge (sélection de dossier). On vous demandera de choisir deux dossiers : le
        dossier source du jeu (ex. « Version en developpement »), puis le dossier de ce site (celui qui
        contient le fichier <code>index.html</code>), pour y enregistrer le résultat dans son sous-dossier
        <code>build/</code>.
      </p>
      <button class="btn btn-gold" id="publishBtn">🚀 Publier une nouvelle version du jeu</button>
      <div id="publishProgress" style="margin-top:14px;font-size:13px;color:var(--text-secondary);"></div>
      <pre id="publishLog" style="margin-top:8px;max-height:220px;overflow:auto;background:var(--bg-tertiary);
        border:1px solid var(--border);border-radius:8px;padding:12px;font-size:12px;line-height:1.6;
        white-space:pre-wrap;display:none;"></pre>
    </div>

    <div class="panel">
      <h2>Changer le mot de passe</h2>
      <form method="post" action="./">
        <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
        <input type="hidden" name="action" value="password">
        <div class="field"><label>Mot de passe actuel</label><input type="password" name="current" autocomplete="current-password" required></div>
        <div class="grid-2">
          <input type="password" name="password" autocomplete="new-password" placeholder="Nouveau (<?= PASSWORD_MIN ?> caractères minimum)" required minlength="<?= PASSWORD_MIN ?>">
          <input type="password" name="confirm" autocomplete="new-password" placeholder="Confirmer" required>
        </div>
        <button class="btn btn-ghost" style="margin-top:10px;">Mettre à jour le mot de passe</button>
      </form>
    </div>

  </div>
</div>

<div class="toast" id="toast"></div>

<script src="../config.js?v=<?= (int) @filemtime(dirname(__DIR__) . '/config.js') ?>"></script>
<script src="creator.js"></script>
<script src="creator-publish.js"></script>
</body>
</html>
