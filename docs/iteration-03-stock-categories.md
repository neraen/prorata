# Itération 3 — Stock et saisie des aliments

## Ce qui est disponible

- Écran `Repas > Notre stock`, partagé par le couple, avec ajout, modification, retrait, quantités et dates déclarées. L’assistant utilise ce même stock, déjà présent dans le profil cuisine. Les mutations du stock ciblent un article et préservent les autres préférences du couple. La limite est désormais de 200 articles.
- Saisie libre et suggestions dans le stock, le profil, les ingrédients des recettes et les articles des courses. Un petit vocabulaire courant fonctionne sans service externe ; les noms déjà utilisés par le couple sont également proposés.
- Recherche supplémentaire explicite dans Open Food Facts. Le nom reste libre, même si aucun résultat n’existe ou si le fournisseur est indisponible. L’utilisateur ne doit pas créer un dictionnaire d’aliments avant d’utiliser l’application.
- Type facultatif pour une recette : À classer, Quotidien, Équilibré, Plaisir ou Joker. Le type peut être choisi dans le formulaire ou directement depuis la fiche, y compris pour une recette de l’app. Le classement est propre au couple et ne modifie pas le contenu d’une recette d’un autre auteur.
- Suggestion GPT du type et classement automatique à l’enregistrement si le champ reste vide et que l’option est cochée. L’utilisateur peut remplacer la suggestion. Une faible confiance laisse le type vide. Une panne d’IA ne bloque pas l’enregistrement normal de la recette.
- Les recettes générées par l’assistant conservent leur type fourni lors de la génération. Un classement manuel est transmis dans le contexte et ne peut pas être silencieusement remplacé lors de la reprise d’une recette enregistrée.

Le stock reste déclaratif : il n’est pas décrémenté automatiquement après les repas. La liste des courses inclut les quantités complètes des recettes, à vérifier avec ce qui est déjà disponible.

## Open Food Facts

L’intégration utilise l’API de suggestions de taxonomie `ingredients`, conçue pour la saisie assistée. Elle n’utilise pas la recherche plein texte de produits à chaque frappe. La recherche externe part seulement après le clic de l’utilisateur et les résultats sont mis en cache côté serveur. Le nom d’application est fourni dans User-Agent. Les suggestions restent des libellés d’ingrédients ; elles ne constituent ni une liste complète de produits vendus ni une preuve de composition nutritionnelle.

Les libellés sont résolus par lot via `taxonomy_canonicalize_tags` afin de conserver l’identifiant renvoyé par Open Food Facts. Si cette résolution échoue, le libellé reste sélectionnable et aucun identifiant n’est inventé. Une panne de suggestions revient à la saisie libre. Les résultats sont bornés et les appels ont un délai maximal.

Une référence facultative est conservée sur un ingrédient : `{source, type, id}`. Le type distingue un terme d’ingrédient d’un produit spécifique. Cette itération relie des ingrédients ; elle n’implémente pas encore de recherche de produits de marque, de lecture de code-barres, de Nutri-Score ni de calcul des nutriments. Modifier librement le nom d’un aliment efface la référence sélectionnée pour éviter de conserver une association devenue fausse.

Les données fournies par Open Food Facts ne sont pas nécessairement complètes ou exactes. L’attribution ODbL et un lien vers les conditions sont visibles avec les suggestions externes. Revoir les conditions applicables et déclarer l’usage de l’API avant un usage public à grande échelle. Aucun formulaire externe de déclaration n’a été soumis pendant le développement.

## Classement IA

Le prompt dédié est dans `backend/resources/prompts/recipe-classifier.fr.md`. Il distingue la faible préparation d’un joker de la durée totale de cuisson : une pizza surgelée au four peut être un joker ; des raviolis faits maison avec pâte et farce ne le sont pas. Le classement Équilibré décrit une intention culinaire observable, pas une note médicale ou une analyse nutritionnelle chiffrée.

`POST /api/household/assistant/classify` valide la recette avant l’appel et renvoie une suggestion, une justification courte et un niveau de confiance. Le modèle reste celui configuré pour l’assistant. Le transport partagé utilise des sorties structurées et `store=false`. Les appels de classement partagent le quota quotidien du couple avec les propositions de planning, avec suivi des jetons et protection contre le rejeu d’un même identifiant.

Le champ `purpose` distingue les appels de classement des brouillons de planning. Un classement n’apparaît jamais comme un planning à approuver et ne peut pas être accepté par l’endpoint d’approbation des repas.

`categorySource` indique le choix manuel ou une suggestion IA. Il s’agit de métadonnées de l’application sur un contenu modifiable par le couple. Les types des repas déjà planifiés peuvent représenter une intention fixée pour ce créneau ; modifier une recette ne réécrit pas cet historique.

## Caméra : étape proposée

L’analyse du frigo par image ou par quelques images d’une vidéo est envisageable, mais n’est pas implémentée dans cette itération. Le premier parcours envisagé est : une ou plusieurs photos, aliments repérés avec les incertitudes, correction des noms et des quantités, puis confirmation pour mettre à jour le stock.

Ne pas déduire automatiquement un poids ou une date qui n’est pas lisible, le contenu d’une boîte fermée ni la quantité restante dans un emballage opaque. Ne pas présenter une reconnaissance d’image comme une garantie de fraîcheur ou de sécurité. Le composant de suggestions et les commandes de stock peuvent servir à corriger les résultats avant validation.

## Mise en service et vérification

La migration `Version20261101230000` ajoute `purpose` à `meal_assistant_run`, après les migrations des deux premières itérations. Seule la base SQLite de démonstration a été mise à jour ici. La production n’a pas été migrée ni déployée.

Les tests couvrent les suggestions réelles simulées, le cache et la panne du fournisseur, la conservation des références, les identifiants du stock ancien, les modifications isolées du stock, le classement facultatif, le remplacement d’une suggestion, la séparation des brouillons et le respect d’un classement manuel dans le contexte de planning.

Les vérifications réelles sur la démonstration ont porté sur Open Food Facts, le classement GPT d’une pizza surgelée et de raviolis maison, l’ajout d’un aliment suggéré avec référence, le choix manuel remplaçant la suggestion et le classement d’une recette laissée vide à l’enregistrement.

Références :

- https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/taxonomy/get-api-v3-taxonomy_suggestions-taxonomy/
- https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/taxonomy/get-api-v3-taxonomy-canonicalize-tags/
- https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- https://developers.openai.com/api/docs/guides/images-vision
