# Itération 2 — Assistant cuisine contextualisé

## Parcours

Depuis Repas, ouvrir « Préparer nos repas avec l’assistant ». Le profil cuisine du couple permet de renseigner portions, temps total, repère de budget hebdomadaire, alimentation, allergies/intolérances, goûts, habitudes, équipement, jokers et stock quantifié/daté. Il est partagé avec le partenaire.

Sélectionner de 1 à 7 créneaux libres, répartir les repas entre Quotidien / Équilibré / Plaisir / Joker et préciser si nécessaire une enveloppe pour cette sélection et une demande ponctuelle. GPT propose les plats, les raisons de ses choix, les ingrédients, les hypothèses et les points à vérifier. Le contexte documentaire utilisé reste consultable. Les propositions sont des brouillons ; une validation distincte ajoute les recettes nouvelles et les repas en une seule opération.

## Configuration

Le modèle par défaut est `gpt-4.1`, comme demandé pour la famille GPT-4. Il reste configurable via `OPENAI_MEAL_MODEL` ; aucun basculement silencieux vers un autre modèle. L’accès au modèle a été vérifié avec la clé existante de Synastry. Cette clé a été reprise uniquement dans `backend/.env.local`, ignoré par Git et protégé en lecture. Le projet Synastry n’a pas été modifié. Ne jamais définir une variable `VITE_` pour la clé.

Exemple sans secret : `backend/.env.openai.example`. Variables :

```dotenv
OPENAI_API_KEY=
OPENAI_MEAL_MODEL=gpt-4.1
OPENAI_MEAL_DAILY_LIMIT=20
```

Les appels passent par Symfony HttpClient vers l’API Responses, avec `store=false`, un schéma JSON strict, une limite de sortie et un délai maximal. Les erreurs exposées à la PWA ne contiennent ni les réponses brutes du fournisseur ni les secrets. Le mode `store=false` n’est pas une promesse d’absence de tout traitement ou de toute rétention technique par le fournisseur.

La clé locale ne configure pas la production. Les variables correspondantes sont préparées dans `compose.coolify.yaml` ; les renseigner dans l’environnement du serveur lors de la mise en service. Les images ne doivent pas embarquer les fichiers secrets.

Appliquer la migration `Version20261101200000` après celle de l’itération 1 et avant de déployer cette version : elle crée `meal_assistant_run`. Le pipeline Coolify actuel ne lance pas les migrations. Aucune migration de production ni aucun déploiement n’a été effectué pendant cette itération. Seule la base SQLite de démonstration a été mise à jour pour les vérifications.

## Personnalisation et récupération documentaire

Le contexte est construit sur le serveur à partir du couple authentifié. Aucune donnée d’un autre couple n’est recherchée. Aucun revenu, e-mail, nom de membre ou historique de paiement n’est ajouté au contexte. Le budget alimentaire est celui que le couple déclare dans son profil.

Le mécanisme est une récupération documentaire locale : classement lexical des recettes par demande, goûts et ingrédients du stock, avec un signal de familiarité issu des repas récemment planifiés. Au maximum 16 recettes pertinentes, les 42 derniers jours de planning et les repas déjà fixés autour des créneaux ciblés sont envoyés avec le profil. L’historique est borné à 60 repas. Les recettes comportant un conflit alimentaire évident ou un équipement requis indisponible sont écartées avant l’appel. Pour les anciennes recettes, une extraction simple repère certains équipements dans les instructions.

Il n’y a pas de base vectorielle ni d’embeddings dans cette version. Les habitudes sont explicites ; le système ne prétend pas connaître les repas effectivement consommés ni les préférences apprises à partir d’un planning seul. Un futur index sémantique peut remplacer le classement local sans modifier le contrat des propositions.

## Prompt

Le prompt versionné est dans `backend/resources/prompts/meal-assistant.fr.md`. Il couvre :

- hiérarchie entre contraintes impératives et préférences ;
- équilibre alimentaire courant, sans régime médical ni valeurs nutritionnelles inventées ;
- plaisir sans transformation systématique en version allégée ;
- jokers réellement prêts à consommer/réchauffer, sans fausse préparation maison ;
- réutilisation des recettes connues avec identifiants documentaires vérifiables ;
- optimisation globale, stock, variété, effort, réemploi des ingrédients ;
- distinction entre prix estimés, quantités consommées et achats de conditionnements ;
- données documentaires traitées comme données, jamais comme instructions de l’agent ;
- expression des inconnues et des conflits au lieu d’inventer un contexte personnel.

## Contrôles et limites

Le serveur contrôle les dates, les créneaux libres, les portions, le temps total, la répartition des catégories, les unités, les références documentaires et l’équipement. Pour les recettes réutilisées, les ingrédients et instructions sont repris de la recette canonique, avec ajustement des quantités aux portions demandées.

Le stock est réparti dans l’ordre des repas et des dates limites déclarées. Les unités kg/g et l/ml sont normalisées et une même quantité n’est pas attribuée plusieurs fois dans la proposition. Les allocations effectives sont affichées ; les compléments nécessaires sont signalés. Le rapprochement reste fondé sur les noms normalisés et les unités compatibles : les synonymes, marques et conversions pièce/poids ne sont pas inventés. Les estimations de coût du modèle ne sont pas recalculées comme un devis marchand.

Le stock reste déclaré et n’est pas décrémenté après les repas. La génération habituelle des courses inclut toujours les ingrédients complets des recettes : l’utilisateur vérifie ce qu’il possède déjà. Cette itération ne constitue pas un inventaire automatique.

Un filtre rejette certains allergènes/exclusions évidents, mais ce filtre et GPT ne remplacent pas les informations des emballages. Les allergènes cachés, traces et compositions des plats préparés ne sont pas connus sans API produits. Une vérification explicite reste nécessaire.

La réservation de quota est persistante et sérialisée par couple, avec un plafond configurable. Chaque tentative réservée compte, même si elle échoue ensuite. Les jetons retournés par OpenAI sont enregistrés, y compris lorsque la validation de la proposition échoue. Un identifiant de requête permet de rejouer une demande après une réponse réseau perdue sans refaire l’appel payant.

À l’approbation : le brouillon est relu depuis la base, son couple est contrôlé et le profil/stock ainsi que les recettes référencées sont comparés à leur version d’origine. Un créneau rempli par le partenaire n’est jamais écrasé. L’opération est atomique et une approbation répétée ne duplique pas les recettes. Le client ne peut pas soumettre son propre plan sous une commande interne de validation.

## Vérifications

- Tests unitaires avec transport OpenAI simulé et base SQLite en mémoire : profil, récupération, contraintes, schéma de requête, erreurs/refus/réponse incomplète, quotas, isolation, rejeu et approbation.
- Générations réelles GPT-4.1 sur les seules données fictives de la démonstration.
- Vérification dans la PWA de la demande, de la prévisualisation et du parcours d’approbation.
- Compilation TypeScript/Vite et lint. Les avertissements déjà présents dans les anciennes parties sont distincts des nouveaux tests de l’assistant.

Références : [GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
