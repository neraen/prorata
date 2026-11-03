# Connexions aux enseignes — état de recherche du 3 novembre 2026

Les recherches n’ont pas identifié de documentation publique officielle permettant à cette PWA de créer directement un panier Lidl ou E.Leclerc avec une simple clé API. Cette absence de résultat n’exclut pas des interfaces privées ou des accès partenaires. Aucun connecteur de panier ni récupération d’identifiants d’enseigne n’a été ajouté dans cette itération.

## Trois besoins distincts

1. **Identifier les produits.** Open Food Facts peut fournir les fiches par code-barres, avec les données disponibles de composition et de nutrition. L’application utilise déjà les suggestions d’ingrédients ; une prochaine étape peut ajouter les produits et leurs EAN sans confondre un aliment générique (200 g de pâtes) avec un paquet marchand (500 g).
2. **Connaître des prix.** Open Prices est une base ouverte de prix observés. Les observations proviennent notamment d’étiquettes et de tickets. Elles doivent être présentées avec leur date, leur magasin et leurs preuves ; leur présence et leur fraîcheur ne sont pas garanties pour tous les produits. Elles ne prouvent pas un stock disponible et ne permettent pas d’envoyer un panier marchand.
3. **Remplir un panier de drive.** Il faut un accès prévu pour l’intégration : partenaire de l’enseigne ou prestataire dont l’accès et les capacités sont vérifiés. Choisir d’abord un magasin pilote ; gérer ensuite sa session autorisée, sa recherche de produits, le rapprochement des ingrédients, les formats de vente, les quantités de paquets, les substitutions, les prix et les disponibilités. L’utilisateur relit les correspondances et le total avant de poursuivre sa commande dans l’enseigne.

## Enseignes

- **E.Leclerc Drive** : le parcours officiel commence par le choix d’un magasin, puis la connexion et l’ajout des produits. Le magasin doit donc être une donnée du connecteur. La FAQ de Jow cite E.Leclerc parmi ses enseignes partenaires ; cela démontre l’existence d’intégrations commerciales, pas une API Jow réutilisable librement par cette application.
- **Lidl** : Lidl présente une fonctionnalité de liste de courses dans Lidl Plus. Aucun mécanisme public d’import de notre liste ou de création d’un panier n’a été établi par les sources consultées. Une ouverture de site ou un partage de texte doit être nommé comme tel, sans afficher « connecté » ni promettre un panier synchronisé.

## Ordre proposé

Commencer par un export/partage propre de la liste, puis les codes-barres et des prix observés clairement datés. Pour un vrai panier automatique, piloter une enseigne et un magasin après obtention d’un accès adapté. Garder une interface de connecteur séparant `searchProducts`, `getOffer` et `prepareCart` : chaque capacité est annoncée uniquement si elle est réellement disponible. Une observation de prix ou un lien vers un site ne doit jamais activer la capacité panier.

Les sites et endpoints privés peuvent évoluer ; leur automatisation demanderait un suivi propre à chaque enseigne. Pour une base de produit maintenable, privilégier un accès documenté et convenu plutôt que déduire la disponibilité d’une API à partir des requêtes d’une application mobile.

## Sources primaires consultées

- Open Food Facts, documentation API : https://openfoodfacts.github.io/openfoodfacts-server/api/
- Open Food Facts, Product prices / Open Prices : https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/product-prices/
- E.Leclerc, Comment faire vos courses dans un Drive : https://faq.e.leclerc/hc/fr/articles/26988303348625-Comment-faire-vos-courses-dans-un-Drive
- Lidl, Liste de courses : https://www.lidl.fr/c/lidl-plus-liste-de-courses/s10028960
- Jow, enseignes disponibles : https://jow.fr/help?question=mon-enseigne-n-est-pas-disponible-sur-jow
