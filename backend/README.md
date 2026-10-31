# Prorata Backend API

Backend API REST pour l'application PWA "Dépenses de couple au prorata".

## Stack technique

- **Framework:** Symfony 8.0 LTS
- **PHP:** 8.4+
- **ORM:** Doctrine 3.6
- **Auth:** LexikJWTAuthenticationBundle (JWT Bearer tokens)
- **Base de données:** MySQL 8.4
- **Tests:** PHPUnit 13

## Installation

### 1. Cloner et installer les dépendances

```bash
cd backend
composer install
```

### 2. Configurer l'environnement

Copier et adapter le fichier `.env.local`:

```bash
cp .env .env.local
# Éditer .env.local avec vos paramètres
```

Variables importantes:
```env
DATABASE_URL="mysql://user:password@127.0.0.1:3306/prorata?serverVersion=8.4&charset=utf8mb4"
JWT_PASSPHRASE=your-secure-passphrase
CORS_ALLOW_ORIGIN='^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$'
```

### 3. Générer les clés JWT

```bash
mkdir -p config/jwt
openssl genpkey -out config/jwt/private.pem -aes256 -algorithm rsa -pkeyopt rsa_keygen_bits:4096
openssl pkey -in config/jwt/private.pem -out config/jwt/public.pem -pubout
```

Entrer le passphrase configuré dans `JWT_PASSPHRASE`.

### 4. Créer la base de données et exécuter les migrations

```bash
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
```

### 5. Lancer le serveur

```bash
# Avec Symfony CLI
symfony serve

# Ou avec PHP
php -S localhost:8000 -t public
```

## Structure du projet

```
src/
├── Controller/Api/          # Controllers REST
│   ├── AbstractApiController.php
│   ├── AuthController.php
│   ├── CoupleController.php
│   ├── ExpenseController.php
│   ├── PersonalExpenseController.php
│   ├── TransferController.php
│   └── MonthController.php
├── DTO/
│   ├── Request/             # DTOs de requêtes avec validation
│   └── Response/            # DTOs de réponses
├── Entity/                  # Entités Doctrine
├── Exception/               # Exceptions métier
├── EventListener/           # Listeners (gestion erreurs API)
├── Repository/              # Repositories Doctrine
└── Service/                 # Services domaine
    ├── CoupleContextService.php
    ├── ProrataWeightCalculator.php
    ├── MonthlyBalanceService.php
    ├── ExpenseShareService.php
    ├── OverallBalanceService.php
    ├── PersonalMonthService.php
    ├── MonthClosureService.php
    └── ClosedMonthGuard.php
```

## Modèle de données

### User
- `id` (int)
- `email` (unique)
- `password` (hash)
- `displayName`
- `createdAt`

### Couple
- `id` (int)
- `mode` (enum: "income" | "percentage" | "equal")
- `createdAt`

### CoupleMember
- `couple_id` (FK)
- `user_id` (FK, unique - un user ne peut être que dans un couple)
- `incomeCents` (nullable, pour mode income)
- `percentage` (nullable, 0-100 pour mode percentage)

### CoupleInvite
- `couple_id` (FK)
- `invitedEmail`
- `token` (unique)
- `usedAt` (nullable)

### Expense
- `couple_id` (FK)
- `paidBy` (FK User)
- `title`
- `category`
- `amountCents` (int > 0)
- `currency` (default "EUR")
- `spentAt` (date)
- `splitMode` (enum: "prorata" | "equal" | "full", défaut "prorata")
- `chargedTo` (FK User, nullable - obligatoire si `splitMode = "full"`)

### PersonalExpense
Dépense d'une seule personne, hors comptes du couple. Elle est **privée** (jamais
visible par le partenaire) et n'entre jamais dans la balance du couple.

Une dépense mensuelle est stockée une seule fois comme modèle plutôt que
dupliquée chaque mois: elle s'applique de `startsOn` à `endsOn`.

- `owner_id` (FK User)
- `title`, `category`
- `amountCents` (int > 0)
- `currency` (default "EUR")
- `recurrence` (enum: "none" | "monthly")
- `startsOn` (date) - date de la dépense ponctuelle, ou premier mois si mensuelle
- `endsOn` (date, nullable) - dernier mois d'une mensuelle; null = toujours active

### Transfer
Virement réellement effectué entre les deux membres pour se régulariser.

- `couple_id` (FK)
- `fromUser` (FK User)
- `toUser` (FK User)
- `amountCents` (int > 0)
- `currency` (default "EUR")
- `transferredAt` (date)
- `note` (nullable)

### MonthClosure
- `couple_id` (FK)
- `year`
- `month` (1-12)
- `closedAt`
- `snapshotJson` (snapshot du calcul au moment de la clôture)

## Conventions API

- **Format:** JSON partout
- **Montants:** En centimes (`amountCents: int`)
- **Dates:** ISO 8601 (`YYYY-MM-DD` pour `spentAt`)
- **Auth:** Bearer token JWT
- **Prefix:** `/api`
- **Erreurs validation:** HTTP 422 avec détails

### Format d'erreur validation
```json
{
  "message": "Validation failed",
  "errors": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

## Endpoints API

### Auth

#### POST /api/auth/register
Créer un compte utilisateur.

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "clara@example.com",
    "password": "password123",
    "displayName": "Clara"
  }'
```

**Réponse 201:**
```json
{
  "id": 1,
  "email": "clara@example.com",
  "displayName": "Clara",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOi..."
}
```

#### POST /api/auth/login
Se connecter.

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "clara@example.com",
    "password": "password123"
  }'
```

**Réponse 200:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOi..."
}
```

#### GET /api/me
Récupérer l'utilisateur connecté.

```bash
curl http://localhost:8000/api/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse 200:**
```json
{
  "id": 1,
  "email": "clara@example.com",
  "displayName": "Clara"
}
```

### Couple

#### GET /api/couple/me
Récupérer le couple de l'utilisateur.

```bash
curl http://localhost:8000/api/couple/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse 200:**
```json
{
  "couple": {
    "id": 1,
    "mode": "income",
    "members": [
      {
        "userId": 1,
        "displayName": "Clara",
        "incomeCents": 240000,
        "percentage": null
      },
      {
        "userId": 2,
        "displayName": "Julien",
        "incomeCents": 160000,
        "percentage": null
      }
    ]
  }
}
```

**Réponse si pas de couple:**
```json
{
  "couple": null
}
```

#### POST /api/couple/create
Créer un couple.

```bash
curl -X POST http://localhost:8000/api/couple/create \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse 201:**
```json
{
  "id": 1,
  "mode": "equal",
  "members": [
    {
      "userId": 1,
      "displayName": "Clara",
      "incomeCents": null,
      "percentage": null
    }
  ]
}
```

#### POST /api/couple/invite
Inviter un partenaire.

```bash
curl -X POST http://localhost:8000/api/couple/invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "julien@example.com"
  }'
```

**Réponse 201:**
```json
{
  "token": "abc123...",
  "invitedEmail": "julien@example.com",
  "createdAt": "2026-02-24T10:00:00+00:00"
}
```

#### POST /api/couple/join
Rejoindre un couple via invitation.

```bash
curl -X POST http://localhost:8000/api/couple/join \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123..."
  }'
```

**Réponse 200:** Objet couple complet

#### PUT /api/couple/settings
Modifier les paramètres du couple.

**Mode equal:**
```bash
curl -X PUT http://localhost:8000/api/couple/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "equal"
  }'
```

**Mode income:**
```bash
curl -X PUT http://localhost:8000/api/couple/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "income",
    "members": [
      {"userId": 1, "incomeCents": 240000},
      {"userId": 2, "incomeCents": 160000}
    ]
  }'
```

**Mode percentage:**
```bash
curl -X PUT http://localhost:8000/api/couple/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "percentage",
    "members": [
      {"userId": 1, "percentage": 60},
      {"userId": 2, "percentage": 40}
    ]
  }'
```

### Expenses

#### GET /api/expenses?year=2026&month=2
Lister les dépenses d'un mois.

```bash
curl "http://localhost:8000/api/expenses?year=2026&month=2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse 200:**
```json
{
  "items": [
    {
      "id": 1,
      "title": "Restaurant",
      "category": "loisirs",
      "amountCents": 4500,
      "currency": "EUR",
      "spentAt": "2026-02-12",
      "paidBy": {
        "userId": 1,
        "displayName": "Clara"
      },
      "splitMode": "prorata",
      "chargedTo": null
    }
  ],
  "isClosed": false
}
```

**Modes de répartition (`splitMode`):**

| Valeur | Effet |
|--------|-------|
| `prorata` | Répartie selon le mode du couple (income / percentage / equal) |
| `equal` | Coupée en deux, quel que soit le prorata |
| `full` | Entièrement à la charge de `chargedToUserId` |

#### POST /api/expenses
Créer une dépense.

```bash
curl -X POST http://localhost:8000/api/expenses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Restaurant",
    "category": "loisirs",
    "amountCents": 4500,
    "currency": "EUR",
    "spentAt": "2026-02-12",
    "paidByUserId": 1,
    "splitMode": "prorata"
  }'
```

Dépense entièrement à la charge de Julien, avancée par Clara:

```bash
curl -X POST http://localhost:8000/api/expenses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Dentiste Julien",
    "category": "health",
    "amountCents": 8000,
    "currency": "EUR",
    "spentAt": "2026-02-12",
    "paidByUserId": 1,
    "splitMode": "full",
    "chargedToUserId": 2
  }'
```

**Réponse 201:** Objet expense créé

**Erreur 409 si mois clôturé:**
```json
{
  "message": "Month 2/2026 is already closed",
  "errors": []
}
```

#### PUT /api/expenses/{id}
Modifier une dépense.

```bash
curl -X PUT http://localhost:8000/api/expenses/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Restaurant italien",
    "amountCents": 5000
  }'
```

#### DELETE /api/expenses/{id}
Supprimer une dépense.

```bash
curl -X DELETE http://localhost:8000/api/expenses/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse 204:** No content

### Personal

Dépenses privées d'un membre. Toutes les requêtes sont scopées à l'utilisateur
connecté: le partenaire ne voit jamais ces lignes, et elles ne touchent pas la
balance du couple.

#### GET /api/personal/month?year=2026&month=2
Le mois vu du côté d'une personne: ses dépenses perso, plus sa part des dépenses
communes, chacune avec son total.

```bash
curl "http://localhost:8000/api/personal/month?year=2026&month=2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse 200:**
```json
{
  "year": 2026,
  "month": 2,
  "currency": "EUR",
  "personal": [
    {
      "id": 1,
      "title": "Salle de sport",
      "category": "health",
      "amountCents": 3500,
      "currency": "EUR",
      "recurrence": "monthly",
      "startsOn": "2026-01-05",
      "endsOn": null,
      "occurredOn": "2026-02-05"
    }
  ],
  "shared": [
    {
      "id": 12,
      "title": "Courses",
      "category": "groceries",
      "amountCents": 10000,
      "shareCents": 6000,
      "currency": "EUR",
      "spentAt": "2026-02-12",
      "splitMode": "prorata",
      "paidBy": { "userId": 2, "displayName": "Julien" }
    }
  ],
  "personalTotalCents": 3500,
  "sharedTotalCents": 6000,
  "totalCents": 9500,
  "recurringTotalCents": 3500
}
```

- `occurredOn` est la date à laquelle la dépense tombe dans le mois demandé. Une
  mensuelle garde son jour du mois, ramené au dernier jour si le mois est trop
  court (un 31 devient le 28 en février).
- `shareCents` est la part de ce membre sur cette ligne. La somme des
  `shareCents` vaut exactement le `targetCents` du bilan mensuel: les deux vues
  ne peuvent pas diverger d'un centime.

#### POST /api/personal/expenses
Créer une dépense perso, ponctuelle ou mensuelle.

```bash
curl -X POST http://localhost:8000/api/personal/expenses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Salle de sport",
    "category": "health",
    "amountCents": 3500,
    "currency": "EUR",
    "recurrence": "monthly",
    "startsOn": "2026-01-05"
  }'
```

**Réponse 201:** Objet personal expense créé.

#### PUT /api/personal/expenses/{id} / DELETE /api/personal/expenses/{id}
Modifier ou supprimer une dépense perso. Sur un PUT, `clearEndsOn: true` retire
la date de fin d'une mensuelle pour la relancer indéfiniment.

Modifier une mensuelle vaut pour tous les mois, passés comme à venir. Pour
arrêter une dépense sans réécrire l'historique, renseigner `endsOn`.

### Transfers

Les virements sont l'argent réellement versé d'un membre à l'autre. Ils viennent
en déduction de ce qui est dû, sans jamais toucher aux totaux de dépenses.

#### GET /api/transfers
Lister les virements. Sans paramètre, tous les virements sont retournés;
avec `year` et `month`, seulement ceux du mois.

```bash
curl "http://localhost:8000/api/transfers?year=2026&month=2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse 200:**
```json
{
  "items": [
    {
      "id": 1,
      "fromUser": { "userId": 2, "displayName": "Julien" },
      "toUser": { "userId": 1, "displayName": "Clara" },
      "amountCents": 20000,
      "currency": "EUR",
      "transferredAt": "2026-02-28",
      "note": "régularisation février"
    }
  ]
}
```

#### POST /api/transfers
Enregistrer un virement.

```bash
curl -X POST http://localhost:8000/api/transfers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromUserId": 2,
    "toUserId": 1,
    "amountCents": 20000,
    "currency": "EUR",
    "transferredAt": "2026-02-28",
    "note": "régularisation février"
  }'
```

**Réponse 201:** Objet transfer créé. HTTP 409 si le mois est clôturé.

#### PUT /api/transfers/{id} / DELETE /api/transfers/{id}
Modifier ou supprimer un virement, tant que son mois n'est pas clôturé.

### Months / Balance

#### GET /api/months/balance?year=2026&month=2
Calculer le bilan d'un mois.

```bash
curl "http://localhost:8000/api/months/balance?year=2026&month=2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse 200:**
```json
{
  "year": 2026,
  "month": 2,
  "totalCents": 214000,
  "currency": "EUR",
  "mode": "income",
  "members": [
    {
      "userId": 1,
      "displayName": "Clara",
      "weight": 0.6,
      "targetCents": 128400,
      "paidCents": 100000,
      "deltaCents": -28400,
      "prorataTargetCents": 128400,
      "equalTargetCents": 0,
      "directTargetCents": 0,
      "transferredOutCents": 0,
      "transferredInCents": 0,
      "netDeltaCents": -28400
    },
    {
      "userId": 2,
      "displayName": "Julien",
      "weight": 0.4,
      "targetCents": 85600,
      "paidCents": 114000,
      "deltaCents": 28400,
      "prorataTargetCents": 85600,
      "equalTargetCents": 0,
      "directTargetCents": 0,
      "transferredOutCents": 0,
      "transferredInCents": 0,
      "netDeltaCents": 28400
    }
  ],
  "settlement": {
    "fromUserId": 1,
    "toUserId": 2,
    "amountCents": 28400
  },
  "isClosed": false,
  "prorataTotalCents": 214000,
  "equalTotalCents": 0,
  "directTotalCents": 0,
  "transfersTotalCents": 0
}
```

`deltaCents` est le déséquilibre brut du mois; `netDeltaCents` est ce qu'il en
reste une fois les virements du mois déduits. C'est `netDeltaCents` qui alimente
`settlement`.

#### GET /api/months/overall
Position cumulée sur tous les mois enregistrés, virements déduits. C'est la vue
"où on en est": trois mois à 100 € de trop deviennent une créance de 300 €,
moins ce qui a déjà été viré.

```bash
curl http://localhost:8000/api/months/overall \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse 200:**
```json
{
  "currency": "EUR",
  "members": [
    {
      "userId": 1,
      "displayName": "Clara",
      "paidCents": 600000,
      "targetCents": 300000,
      "deltaCents": 300000,
      "prorataTargetCents": 300000,
      "equalTargetCents": 0,
      "directTargetCents": 0,
      "transferredOutCents": 0,
      "transferredInCents": 50000,
      "netDeltaCents": 250000
    },
    {
      "userId": 2,
      "displayName": "Julien",
      "paidCents": 0,
      "targetCents": 300000,
      "deltaCents": -300000,
      "prorataTargetCents": 300000,
      "equalTargetCents": 0,
      "directTargetCents": 0,
      "transferredOutCents": 50000,
      "transferredInCents": 0,
      "netDeltaCents": -250000
    }
  ],
  "settlement": {
    "fromUserId": 2,
    "toUserId": 1,
    "amountCents": 250000
  },
  "totalCents": 600000,
  "prorataTotalCents": 600000,
  "equalTotalCents": 0,
  "directTotalCents": 0,
  "transfersTotalCents": 50000,
  "months": []
}
```

`months` contient le détail mois par mois (même format que
`/api/months/balance`), du plus récent au plus ancien.

#### POST /api/months/close
Clôturer un mois.

```bash
curl -X POST http://localhost:8000/api/months/close \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2026,
    "month": 2
  }'
```

**Réponse 201:** Snapshot du bilan avec `isClosed: true`

#### GET /api/months/history
Historique des mois clôturés.

```bash
curl http://localhost:8000/api/months/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse 200:**
```json
{
  "items": [
    {
      "year": 2026,
      "month": 1,
      "closedAt": "2026-02-01T00:00:00+00:00",
      "totalCents": 185000,
      "settlement": {
        "fromUserId": 2,
        "toUserId": 1,
        "amountCents": 15000
      }
    }
  ]
}
```

#### GET /api/months/{year}/{month}
Détail d'un mois (clôturé ou non).

```bash
curl http://localhost:8000/api/months/2026/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Logique métier

### Calcul du prorata

Le service `MonthlyBalanceService` calcule le bilan mensuel:

1. Récupère toutes les dépenses et tous les virements du mois
2. Calcule le total
3. Détermine les poids selon le mode:
   - **equal:** 50/50
   - **income:** proportionnel aux revenus
   - **percentage:** selon les pourcentages définis
4. Regroupe les dépenses par `splitMode` et calcule la cible de chaque membre:
   - `prorata`: `round(total_prorata * weight)`
   - `equal`: `round(total_equal / 2)`
   - `full`: la totalité pour le membre désigné
   Chaque groupe est arrondi une seule fois, et le second membre reçoit le reste
   du groupe: aucun centime ne se perd.
5. Calcule ce que chaque membre a payé
6. Calcule le delta: `delta = paid - target`
7. Déduit les virements du mois: `netDelta = delta + versé - reçu`
8. Détermine le règlement à partir du `netDelta`:
   - Si netDelta A > 0: B doit ce montant à A
   - Si netDelta A < 0: A doit |netDelta| à B
   - Si netDelta = 0: pas de règlement

Une dépense `full` dont le membre désigné a disparu (compte supprimé) retombe
sur le calcul prorata plutôt que de sortir du bilan.

### Position cumulée

`OverallBalanceService` additionne les bilans de tous les mois ayant une dépense,
un virement ou une clôture. Les mois clôturés sont relus depuis leur snapshot,
les autres sont recalculés. La somme des `netDelta` donne la position courante.

Les snapshots écrits avant l'ajout des modes de répartition et des virements
restent lisibles: ils sont interprétés comme des mois 100% prorata sans virement.

### Ventilation par ligne (vue Perso)

`ExpenseShareService` découpe chaque dépense commune pour dire ce qu'un membre
porte, ligne par ligne. Le bilan mensuel n'arrondissant qu'une fois par groupe,
un arrondi naïf par ligne ne retomberait pas dessus. Chaque groupe est donc
alloué de façon cumulative: une ligne reçoit `round(cumul * poids)` moins ce qui
a déjà été distribué. Les lignes somment ainsi exactement au `targetCents` du
bilan — c'est vérifié par `ExpenseShareServiceTest`.

`ProrataWeightCalculator` est la seule source des poids: le bilan mensuel et la
ventilation par ligne y lisent tous les deux, ils ne peuvent pas diverger.

### Dépenses perso

`PersonalMonthService` assemble la vue Perso d'un mois. Les dépenses perso sont
totalement étanches à la balance du couple: elles ne modifient ni les totaux, ni
les parts, ni les règlements. Le seul lien est de lecture — la vue Perso affiche
en plus la part que ce membre porte sur les dépenses communes.

### Clôture de mois

- Une fois clôturé, le mois est figé (snapshot JSON)
- Interdiction d'ajouter/modifier/supprimer des dépenses **ou des virements** sur
  un mois clôturé (HTTP 409)
- La clôture est idempotente (re-clôturer retourne le snapshot existant)

## Tests

```bash
# Lancer tous les tests
php bin/phpunit

# Tests spécifiques
php bin/phpunit tests/Service/MonthlyBalanceServiceTest.php
```

## Docker

Le projet inclut une configuration Docker:

```bash
docker compose up -d
```

Services:
- **backend:** PHP-FPM + Nginx (port 8080)
- **database:** MySQL 8.4 (port 3306)
- **phpmyadmin:** Interface admin (port 8081)