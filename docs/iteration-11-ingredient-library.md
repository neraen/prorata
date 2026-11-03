# Itération 11 — Illustrations et courses mixtes

## Bibliothèque
80 illustrations originales créées avec l’outil intégré imagegen : 72 aliments et 8 objets pour la maison ou les animaux. Style gouache/crayon pastel, fond ivoire, objets centrés et sans marque. Les noms et variantes reconnus sont définis dans `frontend/src/features/household/ingredientCatalog.json` ; les fichiers optimisés sont placés dans `frontend/public/illustrations/ingredients/`.

Le même visuel est réutilisé pour les alias contrôlés d’un aliment. Un pictogramme de paquet sert de repli pour les articles inconnus ; aucun visuel alimentaire arbitraire n’est associé à une saisie libre. Les images sont décoratives, les noms restent affichés et accessibles. Le chargement est différé et les fichiers sont inclus dans le cache PWA existant. Aucune génération à la saisie et aucune nouvelle variable.

Les illustrations apparaissent dans les suggestions d’aliments et d’articles, les lignes du stock et des courses, ainsi que les ingrédients des fiches de recettes.

## Quantités
La génération des courses regroupe les besoins d’un même aliment pour une semaine, avec des composants distincts par unité :
- 0,5 kg + 350 g → 850 g (conversion exacte).
- 0,5 l + 200 ml → 700 ml (conversion exacte).
- 3 tomates + 350 g de tomates → une ligne « 3 pièce(s) + 350 g ».

Aucune conversion implicite pièces/poids ou volume/poids, puisqu’il faudrait connaître le calibre ou la densité. Les portions des repas continuent de mettre à l’échelle tous les composants. Une augmentation d’un composant décoche l’article. Les variantes singulier/pluriel connues sont réunies ; les produits préparés ou variétés non équivalentes ne sont pas rapprochés par similarité. Les références de produits différentes restent séparées.

Les champs scalaires `quantity`/`unit` restent renseignés pour compatibilité ; le nouveau champ `quantities` porte tous les composants exacts. Le regroupement s’applique à la prochaine génération des courses. Les coches des anciennes lignes sont reprises lorsque les quantités achetées couvrent les nouveaux besoins.

## Maison et animaux
Les articles ajoutés à la main sont conservés lors de la régénération d’une semaine. Les rayons Maison & hygiène et Animaux, ainsi que les suggestions savon, litière, croquettes, lessive, etc. sont disponibles dans les courses. La saisie libre et les unités kg, g, l, ml et pièce(s) restent possibles. Le rayon d’un article reconnu est proposé automatiquement et reste modifiable.

Ces deux rayons ne font pas partie des ingrédients de recettes ou du stock culinaire utilisé par l’assistant.

## Vérifications
103 tests PHP et 693 assertions, avec 22 notices préexistantes ; 4 tests Python de déploiement. Compilation TypeScript/Vite et lint (avertissement React Hook Form préexistant). Test HTTP local : pièces et grammes réunis sans approximation, coche conservée après régénération, savon et litière préservés. Contrôle des images par planches et vérification visuelle des parcours stock/courses/recettes dans le navigateur.
