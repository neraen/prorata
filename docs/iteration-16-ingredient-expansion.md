# Troisième série de 80 ingrédients illustrés

80 nouvelles illustrations distinctes ont été générées avec l’outil intégré imagegen, dans le style gouache/crayon pastel naturel sur fond ivoire des séries précédentes. Aucun ancien visuel n’a été remplacé.

La série inclut les calamars à l’encre noire en conserve, représentés dans une boîte ouverte avec leur sauce noire, ainsi que poissons, fruits de mer, viandes, conserves, légumes, fruits, fruits secs, graines, laitages et condiments. Les variantes de recherche « calamar dans son encre » et « calamars à l’encre noire » sont prises en charge. Chaque nouveau visuel dispose de ses alias, rayon et unité initiale modifiable. Les suggestions déjà présentes (raviolis en conserve, soupe prête à réchauffer, reblochon) reçoivent leur image ; 77 nouveaux noms complètent les suggestions.

La bibliothèque contient désormais 240 visuels, dont 232 aliments et 8 produits maison/animaux. Les fichiers applicatifs sont des WebP de 256 × 256 pixels, totalisant 437 540 octets pour cette série. Les nouvelles images apparaissent dans la banque d’ingrédients, le stock, les courses et les ingrédients des recettes grâce au catalogue commun. Elles n’introduisent aucune conversion d’unité ou fusion de noms supplémentaire.

Prompts et sujets : docs/ingredient-illustration-prompts-v3.json. Images : frontend/public/illustrations/ingredients/. Planche de contrôle : docs/assets/ingredient-library-preview-v3.webp. Les sources générées restent conservées dans le dossier generated_images de Codex.

Vérifications : 80 sources et 80 nouveaux fichiers, 240 identifiants uniques et fichiers présents, absence de collisions entre alias normalisés, contrôle visuel des 80 sujets sur la planche complète, build frontend et lint sans erreur (avertissement React Hook Form préexistant). Aucune migration ni variable Coolify supplémentaire.
