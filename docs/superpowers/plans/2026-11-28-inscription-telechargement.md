# Inscription Brevo avant téléchargement : plan de code

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire passer le téléchargement par un formulaire Brevo à double confirmation.

**Architecture:** Site statique. L'accueil mène à `telecharger.html`, qui ouvre le formulaire hébergé par Brevo ; après confirmation, Brevo redirige vers `merci.html`. Deux fonctions partagées décident des liens.

**Tech Stack:** HTML et JavaScript sans bibliothèque ; l'enregistrement PHP existant n'est modifié que pour accepter le nouveau réglage.

**Spec:** `docs/superpowers/specs/2026-11-28-inscription-telechargement-design.md`

## Global Constraints
- Réglage `signupFormUrl` dans `config.js`, `https://` uniquement. Vide : téléchargement direct actuel inchangé.
- Aucun script ni cadre externe ; CSP des pages publiques identique à celle de `contact.html`.
- Textes en français, en-tête, pied de page et styles du site.
- `merci.html` n'est liée depuis aucune page et porte `<meta name="robots" content="noindex, nofollow">`.
- Conservation annoncée : jusqu'à la demande de suppression, au plus 3 ans après l'inscription.
- Commits locaux sur `refonte-site`, sans push.
- Node absent : les tests s'ouvrent dans le navigateur, servis par `& "C:\wamp64\bin\php\php8.3.14\php.exe" -S localhost:8000`.

## Review Focus
1. `signupFormUrl` en `http://`, `javascript:` ou relatif : traité comme vide, jamais suivi (tâche 1).
2. `signupFormUrl` entouré d'espaces : accepté après nettoyage (tâche 1).
3. Enregistrement depuis l'espace créateur : le réglage est conservé (tâche 2).
4. Aucun lien de jeu ni version : `merci.html` affiche « Bientôt disponible », sans lien cassé (tâche 1).
5. `config.js` absent : `telecharger.html` et `merci.html` affichent un message clair, sans redirection en boucle (tâche 1).

---

### Task 1: Parcours de téléchargement

**Files:** Create `telecharger.html`, `telecharger.js`, `merci.html`, `merci.js`, `tests/liens.html`, `tests/liens.js` ; Modify `common.js`, `site.js`, `config.js`, `style.css` (si nécessaire), `.htaccess`

**Interfaces — Produces** (dans `window.SiteUtils`) :
- `gameUrl(cfg): string` : `downloadUrl`, sinon `build/EsportsDirector_<version>.zip`, passé par `safeUrl` ; `''` si aucun.
- `formUrl(cfg): string` : `signupFormUrl` passé par `safeUrl(…, {httpsOnly:true})`.

- [ ] **Step 1: Écrire les tests.** `tests/liens.html` charge `../common.js` puis `liens.js`, et affiche chaque résultat puis `N échec(s)`.

```js
const { gameUrl, formUrl } = window.SiteUtils;
check('https accepté', formUrl({signupFormUrl:'https://exemple.sibforms.com/serve/abc'}) === 'https://exemple.sibforms.com/serve/abc');
check('espaces retirés', formUrl({signupFormUrl:'  https://a.test/f  '}) === 'https://a.test/f');
for (const v of ['', undefined, 'http://a.test/f', 'javascript:alert(1)', 'formulaire.html', '//a.test/f'])
  check('refusé ' + v, formUrl({signupFormUrl:v}) === '');
check('lien du jeu', gameUrl({downloadUrl:'https://a.test/j.zip', version:'V1'}) === 'https://a.test/j.zip');
check('zip local', gameUrl({version:'V1'}) === 'build/EsportsDirector_V1.zip');
check('rien', gameUrl({}) === '');
check('lien dangereux', gameUrl({downloadUrl:'javascript:alert(1)'}) === '');
```

- [ ] **Step 2:** Ouvrir `http://localhost:8000/tests/liens.html`. Attendu : échec, fonctions absentes.
- [ ] **Step 3:** Ajouter les deux fonctions ; recharger : `0 échec(s)`.
- [ ] **Step 4:** `site.js` : si `formUrl(cfg)`, `#downloadBtn` mène à `telecharger.html` avec le libellé actuel ; sinon comportement actuel. `#heroDownloadBtn` continue de descendre à la section. Dans `config.js`, ajouter `"signupFormUrl": ""`.
- [ ] **Step 5:** `telecharger.html` : trois étapes (formulaire, mail de confirmation, téléchargement), mention « vérifiez vos indésirables », lien vers les mentions légales, bouton « Recevoir le lien de téléchargement » vers `formUrl`, dans le même onglet. Formulaire vide : `location.replace('index.html#download')`.
- [ ] **Step 6:** `merci.html` : « Adresse confirmée ? Votre démo est prête. » **sans affirmer que le site a vérifié**, bouton vers `gameUrl` (sinon « Bientôt disponible », sans `href`), `downloadNote`, étapes d'installation de l'accueil. `.htaccess` : refuser `^(tests|docs)/` au public hors `localhost`.
- [ ] **Step 7: Vérifier dans le navigateur.** Formulaire vide : accueil inchangé et `telecharger.html` renvoie à l'accueil. Avec une adresse d'essai `https://example.com/formulaire` (remise à vide ensuite) : le parcours suit les liens attendus. `merci.html` pointe vers le jeu. Aucune erreur en console ; lisible à 375 px.
- [ ] **Step 8:** Commit `Ajoute le parcours d'inscription Brevo`, avec la conception et ce plan.

### Task 2: Espace créateur et textes

**Files:** Modify `admin/editor.php` (section « Téléchargement bêta »), `admin/creator.js` (chargement vers la ligne 35, enregistrement vers la ligne 158), `admin/save.php`, `mentions-legales.html`, `config.js` (FAQ)

**Interfaces — Consumes:** la clé `signupFormUrl`.

- [ ] **Step 1:** Champ `f_signupFormUrl` (« Formulaire d'inscription Brevo (vide = téléchargement direct) »), chargé et enregistré avec `trim()`. `save.php` : ajouter la clé aux textes autorisés ; refuser toute valeur non vide qui ne commence pas par `https://` ou échoue à `is_safe_url`, avec « Lien du formulaire refusé : utilisez une adresse https. »
- [ ] **Step 2:** Vérifier avec `php -l admin/save.php` et `php -l admin/editor.php` : aucune erreur de syntaxe. Sur une copie temporaire servie en local, avec son propre mot de passe d'essai : enregistrer une adresse `https` (conservée après rechargement), puis `http` (refusée).
- [ ] **Step 3:** Mentions légales, « Données personnelles » : retirer « ni formulaire » ; indiquer que le formulaire est hébergé par Brevo, les données (adresse, choix pour les annonces), les buts (accès à la démo, comptage des inscrits, annonces si accord), la désinscription, la suppression via l'adresse de contact et la conservation.
- [ ] **Step 4:** FAQ : adapter les réponses sur la gratuité et les nouvelles versions (inscription par mail ; annonces seulement si la case est cochée). Rédiger sans promettre que l'inscription est déjà active tant que le formulaire est vide.
- [ ] **Step 5:** Commit `Ajoute le réglage du formulaire et met à jour les textes`.

## Après le code (par le créateur, avec guidage)
Créer le compte, la liste, la case facultative et le formulaire à double confirmation dans Brevo ; mettre l'adresse publique de `merci.html` en redirection ; renseigner `signupFormUrl` et publier **en même temps** que les mentions légales ; faire un essai réel. Ne pas activer le formulaire avant la publication des textes.
