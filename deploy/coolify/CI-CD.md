# Déployer Prorata après un push

La branche principale est `master`. Un commit local ne déclenche rien : il faut le pousser sur GitHub.

Le workflow `.github/workflows/deploy.yml` exécute les tests PHPUnit et construit les images PHP et web. Les pull requests vers master et la branche de préparation sont également vérifiées, sans déploiement. Si toutes les vérifications passent sur master, GitHub demande à Coolify de déployer le SHA exact puis attend son résultat et teste `/healthz` en HTTPS.

## Activation initiale

1. Attendre que les vérifications GitHub Actions soient vertes sur `codex/prorata-coolify`, puis fusionner cette branche dans `master` (elle contient aussi les fichiers Docker actuellement utilisés).
2. Dans la ressource Prorata de Coolify, choisir `master` dans Git Source. Conserver Compose, base `/`, fichier `/compose.coolify.yaml`, domaine, variables, réseaux et stockage actuels.
3. Désactiver le déploiement automatique natif sur push dans Coolify : GitHub Actions doit être le seul déclencheur automatique afin d'attendre les tests.
4. Activer l'API dans Settings > Advanced si nécessaire. Créer dans Keys & Tokens un jeton dédié GitHub Actions, avec les permissions lecture, écriture et déploiement. L'écriture sert uniquement à fixer `git_commit_sha`. Le conserver dans GitHub, jamais dans le dépôt ou une conversation.
5. GitHub > Settings > Secrets and variables > Actions > Secrets : ajouter `COOLIFY_TOKEN`. Dans Variables, ajouter `COOLIFY_AUTO_DEPLOY` avec la valeur `true`.
6. GitHub > Actions > Prorata CI and deployment > Run workflow > `master` pour le premier déploiement contrôlé.

Le job utilise l'environnement GitHub `production` et la ressource Coolify `q9dnj8bmilarh0oxjqwfoeko`. Aucun identifiant MySQL ni clé JWT n'est transmis à GitHub Actions. Ces secrets restent dans Coolify et sur le VPS. La base restaurée existante est conservée.

## Au quotidien

Créer une branche de travail, modifier le code et ouvrir une pull request vers master. Une fois les tests verts, fusionner : le push résultant déclenche le déploiement. Un push direct sur master fonctionne également. Configurer une règle de protection de master si l'on veut imposer une PR et les vérifications.

Les déploiements sont sérialisés et un ancien commit qui n'est plus en tête de master est ignoré. Ne pas lancer un déploiement manuel concurrent. Coolify reste fixé sur le dernier SHA demandé : son bouton Redeploy reconstruit ce SHA. Pour une nouvelle version, pousser sur master ou lancer le workflow depuis master.

Pour désactiver l'automatisation : mettre `COOLIFY_AUTO_DEPLOY=false`. Pour revenir au code précédent : créer un revert Git du commit problématique sur master ; le pipeline déploie ce nouveau commit. Cela ne restaure pas la base.

## Limites et données

Les images sont vérifiées sur GitHub puis reconstruites par Coolify : ce n'est pas une promotion d'images identiques par digest. Les images de base peuvent évoluer entre les deux builds. Compose peut occasionner une courte interruption. Un échec de démarrage après remplacement des conteneurs n'effectue pas de rollback automatique.

Le pipeline n'exécute aucune migration SQL, aucun import et aucune commande de suppression de volume. Toute évolution du schéma doit être préparée et sauvegardée séparément. Prévoir des sauvegardes automatiques hors VPS avant les évolutions de données. Confirmer aussi la fin de bascule depuis OVH pour éviter deux bases de production divergentes.

Un timeout GitHub ne prouve pas que Coolify s'est arrêté : consulter son historique avant de relancer. Les journaux détaillés de déploiement restent dans Coolify.

Références : https://coolify.io/docs/api/endpoints/applications/update-application-by-uuid et https://coolify.io/docs/core/automation/deploy-webhooks.
