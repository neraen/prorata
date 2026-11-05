# Épices, mélanges, aromates et shoyu

Complément de 60 illustrations : 36 épices et assaisonnements simples, 16 mélanges et 8 aromates. Les ingrédients déjà illustrés sont conservés. Génération avec imagegen intégré, un sujet par appel, même rendu gouache/crayon pastel sur fond ivoire. Versions applicatives WebP 256 × 256, 370 286 octets pour ce lot.

Shoyu, Sauce shoyu et Sauce soja japonaise deviennent des alias de l’entrée Sauce soja existante, avec son visuel et l’unité ml. Aucune deuxième entrée Shoyu n’est ajoutée. Référence terminologique : https://www.kikkoman.fr/produits/nos-sauces-soja.

Le paprika doux reçoit un visuel distinct du paprika fumé : l’ancien alias générique Paprika pointe désormais vers le doux. Cumin retrouve le visuel du cumin moulu, tandis que Graines de cumin conserve son visuel. Les suggestions existantes Cumin, Paprika et Herbes de Provence sont réutilisées ; 57 nouveaux noms sont ajoutés, pour 60 nouveaux sujets. Les formes explicitement différentes et les mélanges restent distincts. Les alias ambigus sont écartés, notamment Cumin noir pour Nigelle.

Validation : 300 identifiants uniques, 300 fichiers présents avec des empreintes différentes, aucun alias normalisé attribué à deux identifiants, exactement une suggestion locale par nouveau sujet. Les alias Shoyu/Paprika/Cumin et les entrées existantes sont vérifiés. Planche des 60 images contrôlée visuellement ; build frontend et lint sans erreur (avertissement React Hook Form préexistant). Aucune modification des recettes enregistrées, conversion de quantités, migration ou nouvelle variable Coolify.

Prompts : docs/ingredient-illustration-prompts-spices.json. Planche : docs/assets/ingredient-spices-preview.webp. Visuels applicatifs : frontend/public/illustrations/ingredients/.
