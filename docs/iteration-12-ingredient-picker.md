# Itération 12 — Banque d’ingrédients

Le formulaire de recette propose une banque illustrée avec recherche et boutons d’ajout. La fenêtre reste ouverte pour ajouter plusieurs aliments. Les ingrédients ajoutés sont repérés et peuvent être retirés par un second appui ; les variantes singulier/pluriel contrôlées ne créent pas de doublons dans la banque. Les tomates fraîches restent distinctes du coulis et des tomates concassées.

Les aliments du stock, des recettes personnelles et des recettes planifiées remontent avant les essentiels. Le catalogue complet est accessible avec « Voir tous les aliments ». Une recherche sans résultat permet d’ajouter le nom librement. Open Food Facts reste une recherche explicite avec repli local et saisie libre si le service est indisponible.

Après un ajout, la recherche est vidée. Si elle avait le focus, celui-ci est conservé pour taper l’aliment suivant sans rouvrir le clavier. À la fermeture, le premier champ quantité manquant reçoit le focus ; sinon le bouton d’ajout est retrouvé. Échap ferme la banque sans fermer la recette. Les fenêtres utilisent le viewport visible et un défilement interne, avec les actions dans la partie fixe.

Les quantités sont laissées vides jusqu’à confirmation par l’utilisateur. Une unité de départ est proposée et reste modifiable ; les produits Open Food Facts prennent « pièce(s) » par défaut. Les noms, unités et rayons sont modifiables dans la recette. La suppression du dernier ingrédient est autorisée, mais l’enregistrement nécessite au moins un ingrédient valide.

`HouseholdDialog` est isolé dans son propre composant et réexporté pour les autres écrans. La banque est un dialogue natif rendu dans un portail hors du formulaire, sans formulaire imbriqué ni soumission lors des ajouts.

Validation : compilation et lint (avertissement React Hook Form préexistant). Navigateur local : ajout de tomates, riz et ingrédient libre à la suite, recherche remise à zéro et focus conservé, unités modifiables, titre et choix conservés au retour, quantité initiale vide, fermeture par Échap avec conservation de la recette, sauvegarde et recherche de la recette. Aucune modification des contrats serveur ni migration. Le comportement exact du clavier virtuel reste à confirmer sur appareil iOS/Android réel.

Le second appui sur une carte sélectionnée retire toutes les lignes de cet aliment. La carte reste disponible dans la banque, y compris pour un nom libre ; une nouvelle sélection restaure les quantités, unités et rayons précédemment saisis pendant cette édition. Les cartes exposent leur sélection avec `aria-pressed` et restent retirable même à la limite de 100 ingrédients.
