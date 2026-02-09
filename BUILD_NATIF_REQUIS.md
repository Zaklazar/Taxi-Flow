# 📱 Build Natif Requis pour OBD2

## ⚠️ Problème

L'erreur suivante apparaît lors de l'exécution dans **Expo Go** :

```
ERROR  ❌ Erreur initialisation BLE: [Invariant Violation: `new NativeEventEmitter()` requires a non-null argument.]
```

## 🔍 Cause

Le module `react-native-ble-plx` nécessite des **modules natifs** qui ne sont **pas disponibles dans Expo Go**. Expo Go est un environnement sandbox qui ne peut pas charger de modules natifs personnalisés.

## ✅ Solution

Pour utiliser la fonctionnalité OBD2 Bluetooth, vous devez compiler l'application avec un **build natif** (Development Build).

### Option 1 : Build de développement local (Android)

```bash
# Générer les fichiers natifs et compiler
npx expo run:android
```

**Prérequis :**
- Android Studio installé
- SDK Android configuré
- Émulateur Android ou appareil physique connecté en USB

### Option 2 : Build de développement local (iOS)

```bash
# Générer les fichiers natifs et compiler
npx expo run:ios
```

**Prérequis :**
- macOS uniquement
- Xcode installé
- Simulateur iOS ou iPhone connecté

### Option 3 : Build EAS (cloud)

```bash
# Installer EAS CLI
npm install -g eas-cli

# Configurer EAS
eas build:configure

# Créer un Development Build Android
eas build --profile development --platform android

# Créer un Development Build iOS
eas build --profile development --platform ios
```

**Avantages :**
- Pas besoin d'Android Studio/Xcode installés localement
- Build dans le cloud
- APK/IPA téléchargeable

## 🛡️ Protection ajoutée

Le code a été modifié pour **détecter automatiquement** si le module BLE natif est disponible :

### Dans `services/OBD2Manager.ts` :

```typescript
static checkBleAvailability(): boolean {
  // Vérifier si le module natif BLE est disponible
  const BleModule = NativeModules.BleClientManager || NativeModules.BlePlxModule;
  this.bleAvailable = BleModule !== undefined && BleModule !== null;
  
  if (!this.bleAvailable) {
    console.warn('⚠️ Module BLE natif non disponible. Utilisez un build natif (pas Expo Go).');
  }
  
  return this.bleAvailable;
}
```

### Dans `app/diagnostic.tsx` :

**L'interface affiche maintenant :**
- 🟢 **Vert** : Bluetooth activé et prêt
- 🔴 **Rouge** : Bluetooth désactivé
- ⚪ **Gris** : Module BLE non disponible (Expo Go)

**Message explicatif :**
> "⚠️ Module BLE non disponible (utilisez un build natif)"

**Bouton désactivé** si module non disponible.

## 📋 Vérification de disponibilité

Pour tester si le module est disponible dans votre environnement :

```typescript
import { OBD2Manager } from './services/OBD2Manager';

if (OBD2Manager.checkBleAvailability()) {
  console.log('✅ Module BLE disponible');
} else {
  console.log('❌ Module BLE non disponible - Build natif requis');
}
```

## 🔄 Workflow recommandé

### Développement avec Expo Go (limitations)
- ✅ Interface utilisateur
- ✅ Navigation
- ✅ Logique métier (hors BLE)
- ❌ Scanner OBD2 Bluetooth

### Développement avec Build Natif
- ✅ Toutes les fonctionnalités
- ✅ Scanner OBD2 Bluetooth
- ✅ Modules natifs complets

## 📦 Configuration `app.json`

Vérifiez que le plugin `react-native-ble-plx` est bien présent :

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "react-native-ble-plx",
      "expo-mail-composer"
    ]
  }
}
```

## 🚀 Étapes recommandées

1. **Phase de développement UI** : Utilisez Expo Go
2. **Phase de test BLE** : Passez à un Development Build
3. **Phase de production** : Créez un build de production avec EAS

## 📱 Test sur appareil physique

Pour tester le Bluetooth OBD2, vous aurez besoin :
- Un **appareil Android/iOS physique** (pas émulateur/simulateur)
- Un **scanner OBD2 Bluetooth ELM327**
- Un **véhicule compatible OBD2** (1996+)
- Le **contact du véhicule mis** (moteur allumé ou non)

## 🔗 Ressources

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [react-native-ble-plx Documentation](https://github.com/dotintent/react-native-ble-plx)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## ✅ Statut actuel

- ✅ Détection automatique de disponibilité BLE
- ✅ Message utilisateur clair si module non disponible
- ✅ Interface gracieusement dégradée dans Expo Go
- ✅ Fonctionnel dans un build natif
- ⏳ Test sur appareil physique requis
