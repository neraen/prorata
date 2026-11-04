# Liste personnelle dans les réglages

Une carte « Mes petites tâches » permet d’ajouter une tâche au clavier ou avec le bouton +, de la renommer en touchant son texte, de la cocher et de la retirer. Les tâches terminées sont repliables. Le retrait est réversible avec Annuler ou depuis les tâches retirées.

La liste est personnelle au membre dans son couple actuel. Elle est sauvegardée côté serveur dans les données existantes du couple : aucune migration ni variable Coolify supplémentaire. Les réponses partagées retirent systématiquement les tâches privées ; l’API /api/tasks ne retourne que les tâches du membre authentifié. Le contexte de l’assistant repas ne les inclut pas. Les écritures nécessitent une connexion ; les erreurs conservent la saisie et rétablissent l’état affiché.

Validation : 107 tests PHPUnit / 711 assertions ; build frontend et lint sans erreur (avertissement préexistant React Hook Form). Vérifications HTTP avec comptes de démonstration : authentification, persistance, isolation entre partenaires et couples, refus de modifier la tâche d’un autre membre, absence de tâches dans les réponses partagées. Parcours navigateur : ajout par bouton et Entrée, coche, renommage, retrait, annulation, rechargement et regroupement des tâches terminées.
