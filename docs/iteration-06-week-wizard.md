# Organiser la semaine en quatre étapes

L’entrée « Organiser notre semaine » remplace le formulaire unique de l’assistant. Le planning et l’édition ponctuelle d’un repas restent accessibles directement.

1. **Les repas** : date de début, personnes, dîners et midis facultatifs, sélection de chaque créneau. Les repas déjà planifiés sont affichés et protégés. Jusqu’à 14 créneaux par proposition.
2. **Nos envies** : mélange automatique, répartition personnalisable, budget et demande libre facultatifs. Les préférences et allergies du couple restent utilisées.
3. **Notre stock** : lecture et correction du stock, ajout manuel, retrait confirmé et reconnaissance photo dans une fenêtre intégrée au parcours. Possibilité de continuer sans compléter le stock.
4. **La semaine** : relecture des recettes, remplacement d’un plat par une recette enregistrée et validation. La création des courses est cochée par défaut, et peut être désactivée.

Les étapes précédentes restent accessibles sans perdre les choix. Le parcours en cours est conservé en sessionStorage, par utilisateur et couple, pour reprendre après rechargement ou passage dans le profil. Les brouillons IA restent enregistrés côté serveur ; une proposition précédente peut être reprise explicitement. Une proposition inchangée peut être revue sans nouvel appel IA. Modifier ses choix ou le stock entraîne une nouvelle proposition au retour de l’étape stock.

Les portions sont une option de la demande : elles ne modifient pas le profil permanent du couple. Le contexte et la validation des recettes utilisent ces portions. Le budget reste indicatif, sans catalogue de prix marchand. Une semaine de plus de sept repas dispose d’un plafond de sortie adapté ; la limite quotidienne de demandes reste inchangée.

## Remplacement

`POST /api/household/assistant/proposals/{id}/replace` ne fait aucun appel au modèle. Le serveur vérifie le couple, le statut du brouillon, le profil/stock, le créneau et l’existence de la recette dans la bibliothèque du couple. Les portions, contraintes, équipement, temps et allocations du stock sont revalidés avant de sauvegarder. Un remplacement incompatible laisse le brouillon intact. Les conseils et hypothèses IA devenus obsolètes sont retirés ; le coût du nouveau plat est inconnu et une invitation à revérifier le budget est affichée.

## Validation et courses

L’acceptation existante accepte maintenant `createShoppingList` (booléen, faux par défaut pour compatibilité). Quand il est vrai, validation du planning et génération des courses sont exécutées dans une même transaction. Les semaines calendaires concernées sont recalculées, sans supprimer les ajouts manuels ni les semaines non concernées. Une nouvelle tentative d’une acceptation déjà effectuée ne duplique ni les repas ni les courses. La liste inclut les quantités complètes : l’utilisateur vérifie ensuite les aliments déjà disponibles.

## Vérification et déploiement

94 tests PHP (360 assertions, 22 notices PHPUnit préexistantes) ; tests Python de déploiement ; build TypeScript/Vite, lint et injection Symfony. Les nouveaux scénarios couvrent la sélection de 14 créneaux, les portions personnalisées sans modification du profil, le remplacement sans consommation IA, l’isolation par couple, le refus des remplacements incompatibles et l’acceptation avec courses sans doublon.

Parcours navigateur sur compte local de démonstration : sélection midi/soir, portions à quatre, étapes successives, conservation du budget et de la demande libre après rechargement, fenêtre photo intégrée, génération réelle, remplacement par une recette enregistrée, retour au stock puis revue sans régénération, validation finale et arrivée sur les courses avec quantités adaptées. Les données de production n’ont pas été utilisées pour ces essais.

Aucune migration ni variable supplémentaire. Tester le clavier natif et la caméra sur un téléphone réel reste utile.
