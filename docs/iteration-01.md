# Itération 1 — Le quotidien à deux

La PWA reste dans `frontend`, avec l’API Symfony dans `backend`. Le nom Prorata est conservé en attendant un éventuel changement d’identité.

## Parcours disponible

- Accueil : repas du jour, semaine, liste et aperçu du budget.
- Repas : recettes personnelles du couple, trois recettes de l’app, modification par l’auteur, déjeuner et dîner sur toute semaine, portions ajustables.
- Courses : génération par semaine, regroupement par ingrédient et unité, conversion kg/g et l/ml, classement par rayon, ajouts manuels, suppression et cases partagées.
- Budget : prorata, dépenses, virements, dépenses personnelles et réglages.
- Stats : total du mois et répartition par catégories existantes.

Les recettes personnelles sont visibles au partenaire ; elles ne sont pas publiques. Le catalogue communautaire, l’assistant OpenAI, les connecteurs produits et la ventilation des tickets sont les itérations suivantes.

## Données et synchronisation

`GET /api/household` et `POST /api/household/commands` utilisent le couple de l’utilisateur authentifié. Le client ne choisit pas l’identifiant du couple. Les commandes sont validées côté serveur, puis appliquées avec contrôle de version et nouvelle tentative en cas de modification simultanée. Les 200 derniers identifiants de commandes sont conservés contre les rejeux récents.

Pour cette première itération, les données repas/courses sont un document JSON du couple, avec une révision séparée. Si le volume du catalogue ou les usages augmentent, isoler les recettes, plannings et articles dans des tables dédiées.

Le navigateur actualise les données toutes les dix secondes tant que l’espace est ouvert. Un cache local est isolé par couple et utilisateur. Les cases de la checklist passent par une file persistante : elles restent modifiables sans l’API, même après rechargement, puis sont envoyées à la reconnexion. La création de recettes, les changements du planning, la génération et les ajouts/suppressions demandent une connexion. Prévoir une première visite connectée pour constituer le cache. En cas de changement concurrent de la même case, la dernière commande appliquée gagne.

Régénérer une semaine remplace uniquement ses ingrédients générés, garde les autres semaines et les articles manuels, et conserve les cases cochées si la quantité n’augmente pas. Une quantité augmentée remet l’article à prendre. Deux unités non convertibles restent séparées. La normalisation porte sur les espaces et la casse ; les synonymes d’ingrédients ne sont pas fusionnés.

Cocher un article ne crée aucune dépense. Les statistiques reflètent les catégories des dépenses réelles, sans inventer une répartition légumes/viande à partir d’un montant global.

## Mise en service

Appliquer la migration `Version20261101120000` avant de mettre cette version du frontend en service. Elle ajoute `household_data` et `household_revision` à `couple`, sans réécrire les dépenses. Le pipeline Coolify actuel ne lance pas les migrations : cette étape reste distincte du déploiement.

Commande habituelle depuis le backend, avec la configuration de l’environnement ciblé :

```sh
php bin/console doctrine:migrations:migrate --no-interaction
```

Aucune migration ni mise en production n’a été exécutée pendant cette itération. Les vérifications HTTP et navigateur ont utilisé une base SQLite temporaire.

## Vérification

```sh
cd frontend
npm run lint
npm run build
cd ../backend
php vendor/bin/phpunit --do-not-cache-result
```

Les tests HouseholdService couvrent portions, conversions, génération répétée, conservation des ajouts et des semaines, validation, droits d’auteur, isolation des couples, rejeu et conflit de révisions. Le parcours navigateur couvre création, planning, génération, checklist, rechargement pendant une coupure de l’API et synchronisation après reprise.
