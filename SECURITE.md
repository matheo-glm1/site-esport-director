# Mise en ligne et sécurité

## Hébergement nécessaire
Apache avec PHP 7.4 ou plus (de préférence une version encore maintenue), en HTTPS.
**GitHub Pages n'exécute pas PHP** : l'espace créateur n'y fonctionne pas, et il ne faut pas y publier `admin/`.
Sur nginx, les fichiers `.htaccess` sont ignorés : il faut refaire ces règles dans la configuration du serveur.

## À envoyer sur le serveur
Les fichiers `.html`, `.js`, `style.css`, `assets/`, `admin/` et les deux `.htaccess` (`.htaccess` et `admin/private/.htaccess`, souvent masqués par le logiciel FTP).
N'envoyez ni `.git/` ni le dossier source du jeu dans `build/`.

Le serveur doit pouvoir écrire dans `admin/private/`, ainsi que remplacer `config.js` à la racine.

## Première connexion
1. Créez sur le serveur `admin/private/setup-token.php` avec ce contenu, en remplaçant le texte par **votre propre code aléatoire d'au moins 20 caractères** :

   ```php
   <?php return 'REMPLACEZ-PAR-VOTRE-CODE';
   ```

   Ne gardez pas le texte d'exemple : il est public.
2. Ouvrez `https://votre-site/admin/`, saisissez le code et choisissez un mot de passe d'au moins 12 caractères, jamais utilisé ailleurs.
3. Le fichier du code est supprimé automatiquement.

Mot de passe oublié : supprimez `admin/private/secret.php` et recommencez.

## À vérifier une fois en ligne
Ces adresses doivent répondre « accès refusé » ou « introuvable » :
- `/admin/private/` et `/admin/private/secret.php`
- `/.git/config`
- `/SECURITE.md`

## Modifier le contenu
`config.js` est modifié **sur le serveur** par l'espace créateur. Avant de renvoyer vos fichiers, récupérez la version du serveur pour ne pas l'écraser. La version précédente est gardée dans `admin/private/config.previous.js`.

## Ce que cela ne couvre pas
La sécurité du compte d'hébergement, du FTP et de GitHub (activez la double authentification), les mises à jour de PHP, les attaques par saturation, et les outils chargés depuis `cdn.jsdelivr.net` par la publication du jeu.
L'ancienne empreinte du mot de passe reste dans l'historique Git : ne réutilisez jamais cet ancien mot de passe.
