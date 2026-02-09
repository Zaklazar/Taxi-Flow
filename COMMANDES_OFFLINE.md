# 📋 COMMANDES ESSENTIELLES - MODE OFFLINE

## 🚀 Démarrage

```bash
# Lancer l'application
npm start

# Lancer avec cache clear (si problème)
npm start -- --clear
```

---

## 🔍 Vérification de l'État

### Dans la Console JavaScript (dev tools)

```javascript
// État réseau actuel
NetworkMonitor.getStatus()
// Retourne: 'online' | 'offline' | 'unknown'

// Vérifier si en ligne
NetworkMonitor.isOnline()
// Retourne: true | false

// Vérifier si hors ligne
NetworkMonitor.isOffline()
// Retourne: true | false

// Statistiques de la queue
OfflineQueue.getStats()
// Retourne: { totalItems: 3, pendingItems: 2, failedItems: 0, syncedItems: 1 }

// État global
OfflineManager.getStatus()
// Retourne: { initialized: true, network: 'online', queue: {...} }

// Statut synchronisation rondes
await SafetyRoundOfflineService.getSyncStatus()
// Retourne: { totalLocal: 10, synced: 7, pending: 3 }
```

---

## 🔄 Actions Manuelles

```javascript
// Forcer la synchronisation (si en ligne)
await OfflineManager.forceSyncNow()

// Rafraîchir l'état réseau
await NetworkMonitor.refresh()

// Vider la queue (pour tests uniquement)
await OfflineQueue.clear()

// Nettoyer les rondes synchronisées de +30 jours
await SafetyRoundOfflineService.cleanupSyncedRounds(30)
```

---

## 📊 Inspection AsyncStorage

### Via React Native Debugger

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Voir la queue
const queue = await AsyncStorage.getItem('@offline_queue');
console.log(JSON.parse(queue));

// Voir les rondes locales
const rounds = await AsyncStorage.getItem('@safety_rounds_local');
console.log(JSON.parse(rounds));

// Voir toutes les clés
const keys = await AsyncStorage.getAllKeys();
console.log(keys);
```

---

## 🧪 Scénarios de Test

### Test 1 : Mode Hors Ligne Simple

```bash
# 1. Désactiver Wi-Fi + données mobiles
# 2. Créer une ronde
# 3. Réactiver le réseau
# 4. Vérifier la synchronisation
```

### Test 2 : Multiples Items

```bash
# 1. Hors ligne : créer 3 rondes
# 2. Vérifier badge "Hors ligne · 3 en attente"
# 3. Réactiver réseau
# 4. Badge passe à "Synchronisation... (3)"
# 5. Badge passe à "En ligne"
```

### Test 3 : App Fermée

```bash
# 1. Créer une ronde hors ligne
# 2. Fermer l'app (swipe)
# 3. Réactiver le réseau
# 4. Rouvrir l'app
# 5. Synchronisation reprend automatiquement
```

---

## 🐛 Debug

### Activer les Logs Détaillés

Les logs sont déjà activés par défaut. Cherchez dans la console :

```
🔌 Initialisation NetworkMonitor
📦 Queue chargée: 3 items
🔄 Début synchronisation (3 items)
✅ Synchronisé: safety_round_xxx
```

### Simuler une Perte de Connexion

```javascript
// Dans le code (pour tests uniquement)
NetworkMonitor.currentStatus = 'offline';
NetworkMonitor.notifyListeners('offline');
```

### Vérifier Firebase Persistence

```javascript
// La persistance est activée au démarrage
// Logs à chercher:
✅ Persistance Firebase (Native) activée automatiquement
// ou
✅ Persistance Firebase (IndexedDB) activée
```

---

## 📦 Fichiers Importants

### Services
- `services/NetworkMonitor.ts` - Surveillance réseau
- `services/OfflineQueue.ts` - File d'attente
- `services/SafetyRoundOfflineService.ts` - Rondes offline
- `services/OfflineManager.ts` - Orchestrateur

### UI
- `components/NetworkIndicator.tsx` - Badge visuel
- `app/_layout.tsx` - Initialisation globale

### Configuration
- `src/services/firebaseConfig.ts` - Persistance Firebase

### Documentation
- `docs/MODE_OFFLINE_FIRST.md` - Guide complet
- `docs/OFFLINE_IMPLEMENTATION_SUMMARY.md` - Résumé
- `docs/QUICKSTART_OFFLINE.md` - Démarrage rapide

---

## 🔧 Dépannage Express

### Badge ne s'affiche pas
```bash
# Vérifier dans app/_layout.tsx
{user && <NetworkIndicator position="top" showDetails />}
```

### Synchronisation ne se fait pas
```javascript
// Forcer manuellement
await OfflineManager.forceSyncNow();

// Vérifier les handlers
OfflineQueue.syncHandlers.has('safety_round'); // doit être true
```

### Erreur "Module not found"
```bash
# Nettoyer et recompiler
rm -rf node_modules
npm install
npm start -- --clear
```

### AsyncStorage trop plein
```javascript
// Nettoyer les anciennes données
await SafetyRoundOfflineService.cleanupSyncedRounds(7); // 7 jours
```

---

## 📊 Métriques de Performance

```javascript
// Temps moyen de synchronisation
console.time('sync');
await OfflineManager.forceSyncNow();
console.timeEnd('sync');
// Attendu: 1-3 secondes pour 5 items

// Taille AsyncStorage
const queue = await AsyncStorage.getItem('@offline_queue');
const rounds = await AsyncStorage.getItem('@safety_rounds_local');
console.log('Queue:', queue?.length, 'bytes');
console.log('Rounds:', rounds?.length, 'bytes');
```

---

## 🎯 Commandes PowerShell (Windows)

```powershell
# Lancer l'app
npm start

# Lancer avec rebuild natif (si nécessaire)
npm run android  # ou npm run ios

# Vérifier les dépendances
npm list @react-native-community/netinfo

# Nettoyer cache
npm start -- --clear

# Build de production
npm run build
```

---

## ✅ Checklist Rapide

**Avant de commit** :
- [ ] Logs d'initialisation présents
- [ ] Badge réseau visible
- [ ] Test hors ligne réussi
- [ ] Test synchronisation réussi
- [ ] Pas d'erreurs TypeScript
- [ ] Documentation à jour

**Avant de déployer** :
- [ ] Tests sur appareil physique
- [ ] Tests avec vraie perte de réseau (tunnel)
- [ ] Tests de performance (10+ items)
- [ ] Vérification Firebase Console

---

## 🆘 Support

**En cas de problème** :
1. Vérifier les logs console
2. Consulter `docs/MODE_OFFLINE_FIRST.md`
3. Vérifier `docs/QUICKSTART_OFFLINE.md`
4. Tester les commandes de debug ci-dessus

---

**Dernière mise à jour** : 28 janvier 2026
