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
    ├── MonthlyBalanceService.php
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
      }
    }
  ],
  "isClosed": false
}
```

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
    "paidByUserId": 1
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
      "deltaCents": -28400
    },
    {
      "userId": 2,
      "displayName": "Julien",
      "weight": 0.4,
      "targetCents": 85600,
      "paidCents": 114000,
      "deltaCents": 28400
    }
  ],
  "settlement": {
    "fromUserId": 1,
    "toUserId": 2,
    "amountCents": 28400
  },
  "isClosed": false
}
```

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

1. Récupère toutes les dépenses du mois
2. Calcule le total
3. Détermine les poids selon le mode:
   - **equal:** 50/50
   - **income:** proportionnel aux revenus
   - **percentage:** selon les pourcentages définis
4. Calcule la cible de chaque membre: `target = round(total * weight)`
5. Calcule ce que chaque membre a payé
6. Calcule le delta: `delta = paid - target`
7. Détermine le règlement:
   - Si delta A > 0: B doit delta à A
   - Si delta A < 0: A doit |delta| à B
   - Si delta = 0: pas de règlement

### Clôture de mois

- Une fois clôturé, le mois est figé (snapshot JSON)
- Interdiction d'ajouter/modifier/supprimer des dépenses sur un mois clôturé (HTTP 409)
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