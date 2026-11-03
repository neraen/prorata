# Visuels génériques explicites

Le choix d’une illustration à partir de mots dans le nom d’un plat a été supprimé : il attribuait la même image de nourriture à des recettes différentes. Les références d’illustration par famille ont également été retirées des 21 ajouts du catalogue.

Deux nouveaux visuels dessinés, générés avec imagegen et livrés en WebP local précaché :

- carnet de recettes vide pour les recettes personnelles, y compris celles partagées dans le couple ;
- assiette vide et cadre vierge pour les recettes qui n’ont pas d’illustration dédiée.

Les trois recettes du catalogue pour lesquelles une illustration a été créée spécifiquement (pâtes tomates/mozzarella, curry pois chiches/épinards, omelette aux champignons) conservent leur image. La correspondance est explicite par identifiant, jamais déduite du titre. Les propositions IA réutilisant l’une de ces recettes peuvent retrouver son illustration par `existingRecipeId` ; une nouvelle proposition sans image utilise le visuel générique.

Les cartes et les fiches portent un badge « Visuel générique ». La grande modale de sélection distingue « Recette personnelle · visuel générique » et « Sans image du plat · visuel générique », en précisant « ne représente pas le plat ». Les petites vignettes utilisent les mêmes dessins sans badge pour rester lisibles. L’illustration décorative du bouton d’organisation de semaine reste distincte de l’image d’une recette.

Vérification navigateur : recette personnelle « Soupe de carottes maison » → carnet ; recette du catalogue « Gratin de pommes de terre et reblochon » → assiette vide ; recette dédiée « Curry de pois chiches et épinards » → illustration du curry. Vérification des légendes et du format des cartes. Aucun repas n’a été enregistré pendant ces essais. Build, lint et 97 tests PHP réussis (22 notices PHPUnit préexistantes, un avertissement lint préexistant).

Aucune migration ni variable supplémentaire.
