# Parcours cuisine simplifié et accessibilité

Passe centrée sur un utilisateur peu familier des outils numériques : repères explicites, choix facultatifs repliés, prévention des erreurs et navigation au clavier.

- Assistant : trois étapes nommées (jours, idées, vérification), répartition automatique conservée par défaut ; types et budget déplacés dans une section facultative. Explication visible quand aucun jour n’est sélectionné, quand la répartition est invalide et quand le quota est épuisé. Définition de « joker », vocabulaire plus concret.
- Planning : aide pour une semaine vide, retour à la semaine courante, flèches de 44 px. L’action courses explique le résultat et rappelle de vérifier le stock.
- Préférences : suppression du deuxième éditeur de stock. Un lien conduit à l’écran stock. La nouvelle commande `profile.preferences` préserve le stock actuel côté serveur, même si le partenaire l’a modifié depuis l’ouverture du formulaire. L’ancienne commande reste compatible.
- Courses : confirmation avant retrait, distinction claire entre cocher et retirer, possibilité de réafficher tous les articles quand les articles achetés sont masqués, messages de partage moins techniques.
- Accessibilité : fenêtres communes en dialogue natif avec titre accessible, Échap, fond inactif et restitution du focus ; focus clavier visible ; lien d’évitement ; retour en haut et focus du contenu lors d’un changement d’écran ; erreurs reliées aux champs ; identifiants de champ uniques ; prise en compte des animations réduites ; champs cuisine à 16 px pour éviter le zoom automatique iOS.

## Vérification

Build TypeScript/Vite et lint (un avertissement préexistant dans PersonalPage). 88 tests PHP, dont un scénario de modification du stock par le partenaire pendant l’édition des préférences ; 22 notices PHPUnit préexistantes. Quatre tests Python de livraison.

Vérifications navigateur à 390 px : explication d’une sélection de jours vide et bouton désactivé, confirmation de retrait annulée sans suppression, retour du focus au bouton déclencheur, focus du contenu et défilement à zéro lors d’un changement d’écran, navigation vers une autre semaine et retour à la semaine courante. Les données de courses n’ont pas été modifiées par ces vérifications.

Ce travail n’est pas une certification WCAG ni un test utilisateur. Prochain contrôle utile : faire réaliser sans assistance quatre tâches par une personne novice (prévoir un dîner, produire les courses, cocher un achat, ajouter un aliment photographié), en notant où elle hésite.

## Modèle IA

GPT-4.1 est conservé. Un modèle de raisonnement peut être comparé pour les demandes combinant budget, temps, équipement, contraintes alimentaires et réemploi du stock. Aucun gain propre à cette application n’a été mesuré : comparer les mêmes cas et mesurer respect des contraintes, corrections nécessaires, temps d’attente et coût avant toute migration. La reconnaissance d’aliments visibles et le classement ne justifient pas à eux seuls une montée en gamme observée.

Référence officielle : https://developers.openai.com/api/docs/guides/model-selection

Aucune variable ni migration supplémentaire.
