# Guide de Déploiement Prorata sur VPS

## Prérequis

- Un VPS avec Ubuntu 22.04+ (minimum 1GB RAM, 20GB disque)
- Un nom de domaine pointant vers l'IP du VPS
- Accès SSH root ou sudo

---

## Étape 1 : Préparer le VPS

### 1.1 Se connecter au VPS

```bash
ssh root@votre-ip-vps
```

### 1.2 Mettre à jour le système

```bash
apt update && apt upgrade -y
```

### 1.3 Installer Docker et Docker Compose

```bash
# Installer les dépendances
apt install -y apt-transport-https ca-certificates curl software-properties-common

# Ajouter la clé GPG Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Ajouter le repository Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Vérifier l'installation
docker --version
docker compose version
```

### 1.4 Installer Git

```bash
apt install -y git
```

### 1.5 Configurer le firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## Étape 2 : Configurer le DNS

Chez votre registrar de domaine, créez un enregistrement A :

| Type | Nom | Valeur |
|------|-----|--------|
| A | prorata (ou @) | IP_DE_VOTRE_VPS |

Attendez la propagation DNS (quelques minutes à quelques heures).

Vérifiez :
```bash
ping prorata.votre-domaine.com
```

---

## Étape 3 : Cloner le projet

```bash
# Créer le répertoire
mkdir -p /var/www
cd /var/www

# Cloner le projet (remplacez par votre repo)
git clone https://github.com/votre-user/prorata.git
cd prorata/deploy
```

---

## Étape 4 : Configurer l'environnement

### 4.1 Créer le fichier .env

```bash
cp .env.example .env
nano .env
```

### 4.2 Modifier les valeurs

```env
# Votre domaine
DOMAIN=prorata.votre-domaine.com

# Mots de passe sécurisés (CHANGEZ-LES!)
DB_PASSWORD=UnMotDePasseTresSecure123!
DB_ROOT_PASSWORD=UnAutreMotDePasseSecure456!

# Clé secrète Symfony (générez-en une)
APP_SECRET=votre_cle_secrete_de_32_caracteres

# Passphrase JWT
JWT_PASSPHRASE=une_passphrase_securisee

# CORS (votre domaine)
CORS_ALLOW_ORIGIN=^https://prorata\.votre-domaine\.com$

# Email pour Let's Encrypt
LETSENCRYPT_EMAIL=votre-email@example.com
```

Pour générer une clé secrète :
```bash
openssl rand -hex 32
```

---

## Étape 5 : Déployer l'application

### 5.1 Premier déploiement

```bash
# Rendre les scripts exécutables
chmod +x *.sh

# Lancer le déploiement
./deploy.sh
```

### 5.2 Générer les clés JWT

```bash
./init-jwt.sh
```

### 5.3 Configurer SSL avec Let's Encrypt

```bash
./init-ssl.sh
```

---

## Étape 6 : Vérification

### 6.1 Vérifier que les conteneurs tournent

```bash
docker compose -f docker-compose.prod.yml ps
```

Vous devriez voir :
```
NAME                    STATUS
prorata-nginx-1         Up
prorata-php-1           Up
prorata-database-1      Up (healthy)
prorata-certbot-1       Up
```

### 6.2 Vérifier les logs

```bash
# Tous les logs
docker compose -f docker-compose.prod.yml logs -f

# Logs d'un service spécifique
docker compose -f docker-compose.prod.yml logs -f php
docker compose -f docker-compose.prod.yml logs -f nginx
```

### 6.3 Tester l'application

Ouvrez dans votre navigateur :
```
https://prorata.votre-domaine.com
```

---

## Commandes utiles

### Redémarrer les services

```bash
docker compose -f docker-compose.prod.yml restart
```

### Arrêter les services

```bash
docker compose -f docker-compose.prod.yml down
```

### Mettre à jour l'application

```bash
cd /var/www/prorata/deploy
git pull
./deploy.sh
```

### Voir les logs en temps réel

```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Exécuter une commande Symfony

```bash
docker compose -f docker-compose.prod.yml exec php php bin/console <commande>
```

### Accéder à la base de données

```bash
docker compose -f docker-compose.prod.yml exec database mysql -u prorata -p prorata
```

### Vider le cache

```bash
docker compose -f docker-compose.prod.yml exec php php bin/console cache:clear --env=prod
```

---

## Maintenance

### Renouvellement SSL automatique

Le conteneur `certbot` renouvelle automatiquement les certificats. Les certificats Let's Encrypt sont valides 90 jours et sont renouvelés automatiquement.

### Sauvegardes

Sauvegardez régulièrement la base de données :

```bash
# Créer un backup
docker compose -f docker-compose.prod.yml exec database mysqldump -u prorata -p prorata > backup_$(date +%Y%m%d).sql

# Restaurer un backup
docker compose -f docker-compose.prod.yml exec -T database mysql -u prorata -p prorata < backup.sql
```

### Mises à jour de sécurité

```bash
# Mettre à jour les images Docker
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Mettre à jour le système
apt update && apt upgrade -y
```

---

## Dépannage

### L'application ne démarre pas

1. Vérifiez les logs :
   ```bash
   docker compose -f docker-compose.prod.yml logs php
   ```

2. Vérifiez que la base de données est healthy :
   ```bash
   docker compose -f docker-compose.prod.yml ps database
   ```

3. Relancez les migrations :
   ```bash
   docker compose -f docker-compose.prod.yml exec php php bin/console doctrine:migrations:migrate --no-interaction
   ```

### Erreur SSL

1. Vérifiez que le domaine pointe vers le VPS :
   ```bash
   dig +short prorata.votre-domaine.com
   ```

2. Relancez l'initialisation SSL :
   ```bash
   ./init-ssl.sh
   ```

### Erreur JWT

1. Régénérez les clés :
   ```bash
   ./init-jwt.sh
   ```

2. Redémarrez PHP :
   ```bash
   docker compose -f docker-compose.prod.yml restart php
   ```

### Erreur CORS

Vérifiez que `CORS_ALLOW_ORIGIN` dans `.env` correspond exactement à votre domaine.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                    ┌─────▼─────┐
                    │   Nginx   │ Port 80/443
                    │   (SSL)   │
                    └─────┬─────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │ Frontend  │   │    API    │   │  Certbot  │
    │  (static) │   │ (PHP-FPM) │   │   (SSL)   │
    └───────────┘   └─────┬─────┘   └───────────┘
                          │
                    ┌─────▼─────┐
                    │   MySQL   │
                    │    DB     │
                    └───────────┘
```