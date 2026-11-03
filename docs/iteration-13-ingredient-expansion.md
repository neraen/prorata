# Extension de la bibliothèque d’ingrédients

80 aliments illustrés supplémentaires : 12 viandes/poissons/fruits de mer, 18 légumes/aromates, 14 épices/herbes, 12 féculents/légumineuses, 12 laitages/fromages et 12 aides culinaires.

Le style conserve le fond ivoire #F8F7F2, le rendu gouache/crayon, les couleurs pastel naturelles, le cadrage centré et l’absence de marque ou de texte. Génération avec l’outil intégré imagegen, un fichier source par aliment ; versions applicatives WebP de 256 × 256 pixels. Les 80 premiers fichiers sont conservés.

Les nouvelles entrées alimentent les suggestions locales et la banque d’ingrédients de recette. Leurs alias exacts sont reconnus par les illustrations du stock, des courses et des fiches de recette. Une unité de départ est renseignée pour chaque nouveau visuel et reste modifiable. Les produits référencés Open Food Facts gardent leur unité par défaut « pièce(s) ».

Le concentré de tomates reçoit son propre visuel, distinct du coulis. Les variantes culinaires restent des ingrédients distincts ; aucune nouvelle fusion de quantités n’est déduite de l’image.

La bibliothèque compte 160 visuels au total : 152 aliments et 8 produits maison/animaux. Les prompts et sujets de cette seconde série sont sauvegardés dans `docs/ingredient-illustration-prompts-v2.json` ; les fichiers se trouvent dans `frontend/public/illustrations/ingredients/`. Aucune génération au fil des saisies, migration ou variable Coolify supplémentaire.

Vérifications : 160 identifiants uniques et fichiers présents, aucun alias partagé entre deux visuels, 80 nouveaux WebP en 256 × 256 (375 394 octets), contrôle visuel de la planche complète. Compilation et lint (avertissement React Hook Form préexistant). Navigateur local : recherche Maïzena → Fécule de maïs, bûche de chèvre → Chèvre en bûche, côtes de porc et lait d’avoine, ajout des quatre ingrédients et contrôle des unités g/g/g/ml. La recherche par alias est disponible dans la banque de recette comme dans les suggestions existantes. Un alias exact ne propose plus une deuxième saisie libre en doublon.
