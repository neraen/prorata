# Prorata Mobile

Application React Native pour la gestion des dépenses de couple au prorata.

## Prérequis

- Node.js 18+
- Expo Go app sur votre téléphone (iOS/Android)
- Backend Prorata en cours d'exécution

## Installation

```bash
cd mobile
npm install
```

## Configuration

Modifiez `src/config.ts` pour configurer l'URL de l'API :

```typescript
// Pour simulateur iOS : localhost fonctionne
// Pour émulateur Android : utilisez 10.0.2.2
// Pour appareil physique : utilisez l'IP de votre ordinateur

export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.XX:8080/api'  // Remplacez par votre IP locale
  : 'https://clement-silvestre.com/api'
```

Pour trouver votre IP locale :
```bash
# Mac/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

## Lancement

```bash
# Démarrer le serveur Expo
npm start

# Ou directement sur iOS
npm run ios

# Ou sur Android
npm run android
```

Scannez le QR code avec :
- **iOS** : Caméra de l'iPhone
- **Android** : App Expo Go

## Structure du projet

```
mobile/
├── App.tsx                 # Point d'entrée, navigation
├── src/
│   ├── components/         # Composants UI réutilisables
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Toast.tsx
│   ├── screens/            # Écrans de l'application
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── SetupScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── ExpensesScreen.tsx
│   │   ├── ExpenseFormScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   ├── HistoryDetailScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── lib/
│   │   ├── api.ts          # Client API
│   │   ├── stores.ts       # State Zustand
│   │   └── types.ts        # Types TypeScript
│   ├── navigation/
│   │   └── types.ts        # Types de navigation
│   ├── config.ts           # Configuration
│   └── theme.ts            # Couleurs et styles
```

## Fonctionnalités

- **Authentification** : Inscription, connexion, déconnexion
- **Gestion de couple** : Création, invitation par code, rejoindre
- **Dashboard** : Vue du solde mensuel, répartition
- **Dépenses** : Liste, ajout, modification, suppression
- **Historique** : Mois clôturés avec détails
- **Paramètres** : Mode de répartition, clôture de mois

## Dépannage

### Problème de cache Expo

Si vous avez des erreurs de permission :
```bash
sudo rm -rf ~/.expo/native-modules-cache
```

### L'API ne répond pas

1. Vérifiez que le backend tourne sur le port 8080
2. Vérifiez l'IP dans `src/config.ts`
3. Sur appareil physique, assurez-vous d'être sur le même réseau WiFi

### Metro bundler bloqué

```bash
npx expo start --clear
```