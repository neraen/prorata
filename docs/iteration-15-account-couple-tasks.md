# Mon compte et rappels de couple

L’avatar avec les initiales ouvre /profile depuis l’accueil, le budget et les autres écrans principaux. Mon compte regroupe l’identité, les rappels, les raccourcis du quotidien et la déconnexion. Les réglages /settings se concentrent sur la répartition du budget.

La liste mêle tâches personnelles (pastille lilas, libellé Perso) et tâches de couple (pastille verte, libellé Couple). Le choix est explicite à la création, Perso par défaut à l’ouverture. Des filtres Toutes/Perso/Couple permettent de réduire la liste. Les deux partenaires peuvent modifier, cocher, retirer et restaurer une tâche de couple. Les tâches existantes sans scope restent personnelles ; une modification de titre ou d’état ne peut changer leur visibilité. Les tâches restent exclues des réponses household et du contexte recettes IA.

Aucune migration ou variable supplémentaire. Validation : build frontend, lint sans erreur (avertissement existant React Hook Form), 110 tests PHPUnit / 725 assertions. Vérifications HTTP sur comptes locaux : partage, coche par le partenaire, isolation entre couples, protection des tâches privées. Parcours navigateur : accès depuis les initiales, déplacement hors des réglages, ajout Couple, filtres et présence des deux libellés.
