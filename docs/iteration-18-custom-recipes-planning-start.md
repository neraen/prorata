# Recettes personnalisées modifiables et semaine libre

Les deux membres du couple peuvent modifier une recette personnelle depuis le bouton « Modifier cette recette », placé en haut de sa fiche. Le formulaire est prérempli et conserve son identifiant, son auteur, ses métadonnées et ses liens avec les repas. Le classement des repas liés suit celui de la recette modifiée. Les recettes de l’application restent protégées côté serveur. Un rappel indique de régénérer les courses si les ingrédients changent ; les listes déjà créées ne sont pas modifiées implicitement.

Dans Ma semaine, « Commencer ma semaine le » permet de choisir une date puis de confirmer ce départ. La préférence est enregistrée dans les données partagées du couple. Exemple : vendredi 6 novembre 2026 → jeudi 12 novembre. Les flèches avancent/reculent de sept jours sans recaler sur le lundi ; le retour à notre semaine reprend le départ configuré. Après sept jours, la période courante avance automatiquement en conservant ce jour. Sans préférence, le lundi reste le comportement initial. Les repas existants gardent leurs dates.

Le planning, le lien vers l’assistant, les courses et les compteurs de l’accueil utilisent la même période. L’assistant enregistre explicitement planningStart dans sa proposition : même si les premiers jours sont décochés, l’acceptation prépare une liste unique pour les sept jours choisis. Les demandes anciennes sans cette propriété conservent leur comportement historique. Les jours déjà passés d’une période en cours ne sont pas proposés à l’IA. Les autres listes et les articles manuels sont conservés ; la liste de la période active est sélectionnée par défaut.

Validation : 115 tests PHPUnit / 749 assertions (22 notices préexistantes), trois tests Node sur les dates (6–12 novembre, navigation, changement d’heure, année bissextile, passage d’année, dates impossibles), build et lint sans erreur (avertissement React Hook Form existant). Commande des tests de calendrier : TZ=Europe/Paris node --experimental-strip-types --test scripts/planning_dates.test.mjs.

Parcours local avec comptes de démonstration : choix du 6 novembre, rechargement sans paramètre d’URL, consultation depuis le partenaire, génération des courses sur 6–12 novembre et compteur d’accueil aligné. Édition par Alex d’une recette créée par Sam : titre modifié, 340 g, préparation vide et auteur conservé. L’acceptation IA sur une période décalée est testée avec le client simulé ; aucun appel GPT réel n’a été lancé pour cette validation.

Aucune migration ou variable d’environnement supplémentaire.
