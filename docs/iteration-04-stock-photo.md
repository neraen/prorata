# Stock par photo et suggestions mobiles

Depuis Repas > Notre stock > Ajouter depuis une photo : prise de photo avec la caméra arrière ou choix dans la photothèque, aperçu, puis lancement explicite de l’analyse OpenAI. La photo est redimensionnée à 1600 px maximum et réencodée en JPEG dans le navigateur, sans métadonnées EXIF. Elle n’est pas stockée dans la base ni envoyée avant l’action « Analyser avec l’IA ».

L’API privée `POST /api/household/assistant/pantry-photo` accepte uniquement une image intégrée JPEG/PNG/WebP, contrôle sa signature, son poids (2 Mo maximum) et ses dimensions (16 mégapixels). Aucun téléchargement d’URL distante. GPT utilise le même modèle, la même clé et le quota journalier du couple que l’assistant repas. La réservation du quota et le rejeu sont isolés par couple et par usage `pantry-photo`. Seuls le résultat, le hash de l’image et les jetons sont persistés, avec `store: false` côté OpenAI.

L’IA propose au maximum 40 aliments ; les identifications peu certaines sont décochées, une quantité inconnue reste vide et doit être saisie pour enregistrer l’aliment. Pas d’inférence de poids visuel, de date de péremption, de fraîcheur ou de contenu de boîte opaque. Noms libres ou références suggérées, unités, quantités, rayons et dates déclarées restent modifiables. Une correspondance exacte de nom normalisé avec un aliment du stock remplace sa quantité et l’indique dans le formulaire. Les doublons au sein de la sélection doivent être résolus avant validation. Les identifiants stables et une commande `pantry.import` atomique empêchent les imports partiels et la duplication lors d’une nouvelle tentative après perte de réponse.

Les suggestions d’aliments sont rendues dans un panneau fixe, au sein du dialogue natif si présent, et positionnées selon `visualViewport` : au-dessus ou au-dessous du champ selon l’espace disponible. Leur hauteur suit l’ouverture du clavier et elles défilent au toucher. Le dialogue adapte aussi sa hauteur à la zone réellement visible. Les champs utilisent une taille de 16 px pour éviter le zoom automatique au focus sur iOS.

## Déploiement

Aucune nouvelle variable Coolify ni migration. Les variables existantes `OPENAI_API_KEY`, `OPENAI_MEAL_MODEL` (gpt-4.1) et `OPENAI_MEAL_DAILY_LIMIT` sont réutilisées. L’image Nginx passe la limite de corps à 3 Mo et le délai FastCGI à 100 secondes pour accompagner les limites du client OpenAI. La caméra fonctionne en HTTPS, ou sur localhost en développement ; le choix de fichier reste disponible sur ordinateur.

## Vérifications

Tests PHP : transport vision structuré sans stockage fournisseur, rejet du MIME falsifié et des URL distantes avant quota, isolation par couple, rejeu sans double facturation, absence de photo dans les données persistées, rejet des quantités invalides, import atomique et réessai sans doublon. Build TypeScript/Vite, lint, conteneur Symfony et route vérifiés. La présence d’un clavier natif iOS/Android reste à confirmer sur appareil réel.

Documentation du format vision : https://developers.openai.com/api/docs/guides/images-vision
