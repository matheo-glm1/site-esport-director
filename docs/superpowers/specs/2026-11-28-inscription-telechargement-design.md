# Inscription avant téléchargement avec Brevo : conception courte

Remplace la version PHP, abandonnée. Les points **(mon choix)** sont à vérifier.

## But
Demander une adresse mail confirmée avant de proposer la démo, pour prévenir les testeurs des nouvelles versions et compter les inscrits. Pas de serveur à programmer. La connexion Google est abandonnée avec ce choix.

## Approches
| Approche | Compromis | Décision |
|---|---|---|
| Serveur PHP avec Google et lien par mail | Plus de contrôle, plus de code et d'entretien | Abandonnée par le créateur |
| Google Sheets avec Apps Script | Garde Google, mais un script à installer ; 100 mails par jour avec un compte Gmail | Non retenue |
| **Formulaire Brevo** | Simple ; pas de connexion Google | **Choisie** |

## Parcours
1. Les boutons « Télécharger » de l'accueil mènent à `telecharger.html`.
2. Cette page explique les étapes et a un bouton qui ouvre le formulaire hébergé par Brevo (un lien, sans script externe sur le site) **(mon choix)**.
3. Brevo envoie un mail de confirmation (double confirmation).
4. Le clic de confirmation renvoie vers `merci.html`, qui contient le bouton de téléchargement. Brevo permet cette [redirection](https://help.brevo.com/hc/en-us/articles/208771869-Create-a-sign-up-form-in-Brevo).

`merci.html` n'est liée depuis aucune page et demande aux moteurs de ne pas l'indexer.

## Réglages dans Brevo (par le créateur, avec guidage)
- Une liste dédiée à la démo.
- Un formulaire : adresse mail, et une case facultative non cochée « Prévenez-moi quand une nouvelle version sort », enregistrée comme information du contact.
- Double confirmation, avec redirection vers l'adresse publique de `merci.html`.
- Expéditeur vérifié.

Les annonces ne partent qu'aux contacts qui ont coché la case. Le nombre d'inscrits est le nombre de contacts de la liste, pas le nombre de joueurs actifs. Le fichier des adresses est l'export CSV de Brevo ; `admin/private/adresses-mail.csv` ne sera pas rempli.

## Changements du site
- `config.js` : nouveau réglage `signupFormUrl`, adresse du formulaire (en `https://`). Il est ajouté à l'éditeur et accepté par l'enregistrement existant, pour qu'il ne soit pas refusé ou effacé.
- Tant que `signupFormUrl` est vide, les boutons gardent le téléchargement direct actuel, pour ne pas casser le site avant la configuration **(mon choix)**. Si l'adresse du formulaire est renseignée, `telecharger.html` l'utilise. Si on ouvre cette page alors qu'elle est vide, elle renvoie à l'accueil.
- Nouvelles pages `telecharger.html` et `merci.html`, au style du site, avec la même protection de contenu que les autres pages.
- `merci.html` lit `downloadUrl` et la version dans `config.js`.
- Mentions légales : collecte par Brevo, buts, accord pour les annonces, désinscription, suppression via l'adresse de contact. Conservation jusqu'à la demande de suppression, au plus 3 ans après l'inscription **(mon choix)**. FAQ mise à jour. Ces textes ne sont pas un avis juridique.

## Limites acceptées
- **Le blocage est faible.** Le site ne peut pas savoir si un visiteur de `merci.html` s'est inscrit. L'adresse de cette page se partage, et le lien du jeu reste lisible dans `config.js` et sur GitHub. Le comptage manquera ces personnes.
- L'offre gratuite de Brevo est limitée à 300 envois par jour, confirmations et annonces comprises.
- La confirmation prouve l'accès à la boîte mail, pas l'identité ; les adresses jetables peuvent passer.

## Vérifications
- Sans `signupFormUrl` : téléchargement direct inchangé.
- Avec : les boutons passent par `telecharger.html`.
- Essai réel, après configuration et mise en ligne : mail reçu, redirection, téléchargement, contact dans la liste avec le bon choix pour les annonces.

## Hors périmètre
Retrait du code PHP existant de l'espace créateur, envoi automatique des annonces, comptage dans le jeu.
