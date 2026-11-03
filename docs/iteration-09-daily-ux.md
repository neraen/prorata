# Itération 09 — Usage quotidien et pastels

## Objectif
Réduire les choix nécessaires pour agir au quotidien, avec une présentation plus douce et une hiérarchie claire.

## Parcours
- Accueil : une action prioritaire selon le dîner et la liste de courses, accès direct aux recettes prévues ou au choix du repas manquant, raccourcis dépense et stock.
- Courses : recherche avec remise à zéro, filtre facultatif par semaine (les ajouts manuels restent visibles), ajout en continu, progression et accès au ticket prérempli lorsque les articles sont cochés. Retour à la liste après l’enregistrement du ticket.
- Stock : accès direct à l’ajout, recherche avec sortie explicite et rappel que les quantités sont déclaratives. Les dates passées ou proches sont à vérifier ; aucune promesse de sécurité alimentaire.
- Budget : tous les raccourcis visibles sans balayage horizontal, états de chargement et erreurs explicites, nouvelles actions dans les états vides. Les filtres peuvent être réinitialisés. Une répartition prorata indisponible ne produit plus un aperçu arbitraire à 50/50.
- Connexion : affichage facultatif du mot de passe, autocomplétion et erreurs annoncées. Invitation : statut exact du code et vérification manuelle de l’arrivée du partenaire.

## Présentation
Fond ivoire, encre vert foncé, surfaces sauge, pêche, lavande et bleu. Cartes et navigation flottante avec relief discret. Focus clavier visible et préférence de mouvement réduit conservés. Les visuels génériques restent signalés comme non représentatifs.

## Vérifications
- Compilation TypeScript/Vite et lint (avertissement React Hook Form préexistant).
- 97 tests PHP / 675 assertions, avec 22 notices PHPUnit préexistantes ; 4 tests Python de déploiement.
- Navigateur local : accueil, choix direct du déjeuner, recette directe, recherche courses sans résultat, ajout en continu avec remise à zéro et focus, ticket prérempli puis retour aux courses après sauvegarde sur les données de test.
- Navigateur local : ajout direct au stock, recherche stock sans résultat, budget, dépenses, virements, personnel, bilan, réglages et chargement de l’assistant. Aucun débordement horizontal de page sur le viewport disponible.

Cette passe ne constitue ni une certification WCAG ni un test utilisateur avec des personnes novices. Les nouveaux états d’erreur financière sont contrôlés dans le code ; aucune panne réelle de production n’a été provoquée pour les tester. Le clavier virtuel iOS/Android reste à vérifier sur appareil réel.
