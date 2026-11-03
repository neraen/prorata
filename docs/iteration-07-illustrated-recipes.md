# Interface dessinée et catalogue de départ

Préférence utilisateur : illustrations dessinées. Six illustrations originales ont été générées avec le skill imagegen intégré, puis optimisées en WebP (640 px) et copiées dans `frontend/public/illustrations`. Elles représentent des familles de plats ; les ingrédients exacts restent dans le texte de la recette. Aucune photo de site tiers n’est reprise. Les images sont incluses dans le précache PWA.

- Accueil : menu du jour illustré, texte plus court et accès aux repas conservé.
- Repas : action principale illustrée pour organiser la semaine, vignettes des plats planifiés. L’onglet recettes masque les actions du planning.
- Recettes : grille à deux colonnes, filtres quotidien/équilibré/plaisir/joker, recherche et filtre d’origine facultatif. Les cartes affichent titre, durée et portions. Le changement de type est replié dans la fiche pour privilégier les ingrédients et la préparation.
- Depuis une fiche, le plat choisi reste sélectionné lors de la planification. Une notice guide le choix du jour ; un créneau déjà occupé est signalé avant enregistrement.
- Parcours de semaine : sélection des jours plus compacte et revue finale illustrée.

## Catalogue

24 recettes de base, dont les trois recettes initiales. Les 21 ajouts sont des textes originaux rédigés pour l’application, avec quantités pour deux, instructions numérotées, temps total, équipement, catégorie et indication de régime. Pas de copie de recettes ou de photos d’un éditeur tiers, ni de calories ou de prix inventés. Les recettes n’ont pas fait l’objet de tests culinaires physiques ; les temps sont des repères à adapter au matériel et aux produits.

Le catalogue contient des plats végétaux, des œufs, de la volaille, du bœuf, du poisson, des plats plaisir et des jokers prêts à réchauffer. Les compositions des produits préparés doivent être vérifiées sur leurs emballages. Les catégories sont des repères d’usage et ne remplacent pas une analyse nutritionnelle.

`RecipeCatalog::merge()` enrichit aussi les états des couples déjà existants. Le contenu applicatif est rafraîchi, tandis que les recettes personnelles et les choix de catégories sont conservés, y compris le choix explicite de laisser une recette non classée. La fusion est idempotente et ne nécessite pas de migration SQL. Les types par défaut utilisent la provenance `catalog`, distincte d’un choix utilisateur ou d’un classement IA.

Les métadonnées de régime du catalogue et les conflits évidents d’ingrédients sont vérifiés lors de la récupération des recettes et de leur validation. Le vocabulaire des fromages a été complété pour les conflits évidents avec le lait et le régime végétalien. Les étiquettes et les traces doivent toujours être vérifiées, comme indiqué dans l’assistant.

## Vérifications

97 tests PHP, 696 assertions (22 notices PHPUnit préexistantes) ; quatre tests Python de livraison ; build TypeScript/Vite et lint (un avertissement préexistant dans PersonalPage). Vérifications navigateur : catalogue reçu par un compte existant, filtre Joker, recherche sans résultat et remise à zéro, ouverture d’une nouvelle recette et conservation de sa sélection en passant au planning. Les essais de planification ont été annulés avant enregistrement.

Aucune variable Coolify ni migration supplémentaire.
