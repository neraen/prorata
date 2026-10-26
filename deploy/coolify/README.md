# Prorata : préparation Coolify / Infomaniak

État : configuration préparée pour essais, pas encore déployée.
Base de travail examinée : commit `9bc03af2275845de6c872dc1e67c77bf43c5cf03`.
Le frontend de ce commit appelle des routes personal/transfers absentes du backend.
Comparaison avec `backend.tar.gz` du 26 octobre : 60 fichiers (src, migrations,
composer.json et composer.lock) identiques ; aucun fichier différent dans cet ensemble.
Le frontend OVH n'a pas été comparé à la version GitHub.

## Architecture

- Traefik Coolify termine HTTPS et transmet au service `web` sur le port interne 80.
- `web` contient le frontend compilé et passe `/api/` au PHP-FPM privé.
- `php` rejoint le réseau de la base MySQL déjà restaurée. Aucune base n'est créée
  par ce Compose et aucun port hôte n'est publié.
- Les clés JWT viennent d'un répertoire externe en lecture seule.
- Aucune migration, initialisation de base ou génération de clés JWT au démarrage.
- Pas de worker ou de tâche périodique ; mailer désactivé pendant la validation.
- La readiness vérifie MySQL, la paire de clés et PHP-FPM. Elle ne certifie pas
  l'adéquation du schéma au code ni le bon fonctionnement de tous les endpoints.

## Prérequis avant Deploy

1. Backend comparé à la sauvegarde OVH ; valider les écrans du frontend GitHub.
2. Base `prorata-mysql-validation` saine, import et nombres de lignes contrôlés.
3. Sur Infomaniak, vérifier le réseau Docker réel de cette ressource ; le renseigner
   dans DATABASE_NETWORK (le défaut `coolify` est à vérifier).
4. Transférer l'archive JWT sauvegardée sur Infomaniak et restaurer ses fichiers
   dans `/data/prorata-validation/jwt`. Le compte PHP `www-data` de l'image Alpine
   (UID/GID 82) doit pouvoir lire les clés et traverser le répertoire : permissions
   0700 sur le répertoire, 0600 sur private.pem, propriétaire 82:82.
   Ne pas remplacer les clés par une nouvelle paire.
5. Récupérer la passphrase JWT existante depuis la configuration OVH, en privé.
   Ne pas la coller dans un message ni la committer.
6. Lancer le premier déploiement manuellement et sans déploiement automatique.

## Paramètres Coolify (une fois ces fichiers présents dans la branche choisie)

- Source : dépôt GitHub `neraen/prorata`, branche `codex/prorata-coolify`.
- Build strategy : Docker Compose.
- Base Directory : `/`.
- Docker Compose Location : `/compose.coolify.yaml`.
- Domaine de validation : `https://prorata.clement-silvestre.fr`, service `web`, port 80.
  Ne modifier aucun DNS de `clement-silvestre.com` pendant les essais.
- Les tests utilisent la copie des données, pas la production : ne pas y saisir
  de dépenses réelles avant la bascule. Les données de test seront écrasées par
  la dernière restauration.

Variables d'exécution uniquement, à saisir dans Coolify :

| Variable | Valeur |
| --- | --- |
| APP_SECRET | Secret Symfony existant, récupéré en privé |
| DATABASE_URL | URL interne de la NOUVELLE base, utilisateur applicatif `prorata` |
| JWT_PASSPHRASE | Passphrase correspondant aux clés sauvegardées |
| DEFAULT_URI | `https://prorata.clement-silvestre.fr` |
| CORS_ALLOW_ORIGIN | `^https://prorata[.]clement-silvestre[.]fr$` |
| DATABASE_NETWORK | Nom vérifié du réseau Docker de MySQL |
| JWT_DIRECTORY | `/data/prorata-validation/jwt` |

DATABASE_URL doit inclure `/prorata?serverVersion=8.4.8&charset=utf8mb4`.
Encoder les caractères spéciaux du mot de passe dans l'URL ; ne pas encoder l'URL
entière. Ne jamais utiliser l'IP OVH ni le compte root pour l'application.

## Vérifications après démarrage

- HTTPS valide, /login, manifest PWA et /healthz accessibles.
- Connexion avec un compte existant et vérification du couple, dépenses, montants,
  historique et soldes. Contrôler les logs lors de chaque test.
- Examiner les versions Doctrine et l'écart de schéma en lecture seule.
  Ne pas lancer `doctrine:schema:update --force` pour corriger un écart.
- Vérifier le comportement du cache PWA lors d'un changement de compte : la
  configuration existante met les réponses API en cache, à auditer avant ouverture.
- Tester un redéploiement : mêmes clés et même base, frontend actualisé.
- Configurer et tester les sauvegardes externes avant ouverture aux utilisateurs.

## Bascule finale (à exécuter séparément)

Mettre les écritures OVH en maintenance, arrêter les éventuels producteurs/consommateurs
de tâches Prorata, refaire un dump cohérent, le restaurer dans la cible validée,
contrôler les données et ouvrir la nouvelle adresse. L'ancien domaine doit ensuite
rediriger vers le nouveau sans permettre d'écrire dans l'ancienne base.
La PWA installée sur l'ancien domaine a une origine distincte ; prévoir reconnexion
et réinstallation sur la nouvelle adresse. Garder sauvegardes et ancien serveur.
Après de nouvelles écritures sur Infomaniak, revenir à OVH exige une synchronisation
des données ; un changement DNS seul n'est pas un retour arrière sûr.

## Limites de validation locale

Syntaxe Compose, shell et PHP vérifiée. Frontend compilé avec succès via npm ci
et VITE_API_URL=/api npm run build. npm signale 26 vulnérabilités de dépendances
(2 faibles, 4 modérées, 20 élevées) : impact et mises à jour à examiner avant production.
Le daemon Docker du Mac est arrêté :
les images et la configuration Nginx n'ont pas encore été testées en conteneurs.
Les versions d'image sont des familles versionnées, pas des digests immuables ;
consigner les digests des images validées avant la production.
