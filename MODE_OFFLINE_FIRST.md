# 📵 MODE HORS-LIGNE (OFFLINE-FIRST) - Documentation Complète

## 🎯 Objectif

Permettre aux chauffeurs de continuer à utiliser l'application **sans interruption** même en l'absence de connexion internet (tunnel, sous-sol, zone rurale, problème réseau).

**Priorité absolue** : La **Ronde de Sécurité** ne doit JAMAIS être bloquée par une absence de réseau.

## ✨ Fonctionnalités

### 1. 📡 Détection Réseau Temps Réel
- Surveillance continue de l'état de connexion (online/offline)
- Notification instantanée des changements
- Indicateur visuel dans l'interface

### 2. 💾 Sauvegarde Locale Automatique
- Toutes les données sont enregistrées localement d'abord
- Utilise AsyncStorage pour la persistance
- Aucune perte de données même sans réseau

### 3. 🔄 Synchronisation Automatique
- Dès que le réseau revient, synchronisation en arrière-plan
- File d'attente avec gestion des priorités
- Retry automatique avec backoff exponentiel
- Notifications de progression

### 4. 🎨 Feedback Visuel
- Badge "En ligne" / "Hors ligne" en haut de l'écran
- Compte des éléments en attente de synchronisation
- Animations fluides lors des changements d'état

### 5. 🔥 Persistance Firebase
- Cache local Firebase activé (IndexedDB web, AsyncStorage mobile)
- Lecture des données même hors ligne
- Synchronisation bidirectionnelle automatique

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │         NetworkIndicator (Composant UI)         │   │
│  │        Badge vert/rouge/orange en haut          │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │          OfflineManager (Orchestrateur)         │   │
│  │       Initialise et coordonne les services      │   │
│  └───┬────────────────────┬─────────────────────┬──┘   │
│      │                    │                     │       │
│  ┌───▼───────┐   ┌────────▼────────┐   ┌───────▼───┐  │
│  │ Network   │   │  OfflineQueue   │   │ Firebase  │  │
│  │ Monitor   │   │  (FIFO Queue)   │   │Persistence│  │
│  └───┬───────┘   └────────┬────────┘   └───────────┘  │
│      │                    │                             │
│  ┌───▼────────────────────▼─────────────────────────┐  │
│  │      SafetyRoundOfflineService                   │  │
│  │    (Logique métier avec support offline)         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │              AsyncStorage (Local)                │  │
│  │  - Rondes de sécurité non synchronisées          │  │
│  │  - File d'attente de synchronisation             │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## 📦 Composants Principaux

### 1. **NetworkMonitor**
`services/NetworkMonitor.ts`

**Rôle** : Détecter l'état de connexion internet

**API** :
```typescript
// Initialiser
NetworkMonitor.initialize();

// Obtenir l'état
const status = NetworkMonitor.getStatus(); // 'online' | 'offline' | 'unknown'

// Écouter les changements
NetworkMonitor.addListener('my-component', (status) => {
  console.log('Nouvel état:', status);
});

// Nettoyer
NetworkMonitor.removeListener('my-component');
```

**Événements** :
- `online` → `offline` : Connexion perdue
- `offline` → `online` : Connexion rétablie

---

### 2. **OfflineQueue**
`services/OfflineQueue.ts`

**Rôle** : Gérer la file d'attente de synchronisation

**API** :
```typescript
// Initialiser
await OfflineQueue.initialize();

// Ajouter un item à la queue
const itemId = await OfflineQueue.enqueue('safety_round', data);

// Enregistrer un handler de synchronisation
OfflineQueue.registerSyncHandler('safety_round', async (item) => {
  // Logique de synchronisation
  await saveToFirebase(item.data);
});

// Obtenir les statistiques
const stats = OfflineQueue.getStats();
// {
//   totalItems: 5,
//   pendingItems: 3,
//   failedItems: 1,
//   syncedItems: 1
// }

// Forcer la synchronisation
await OfflineQueue.forceSyncNow();
```

**Fonctionnement** :
1. Les items sont sauvegardés dans AsyncStorage
2. Quand le réseau revient, synchronisation automatique
3. En cas d'échec, retry avec backoff exponentiel
4. Après N tentatives, l'item est marqué comme échoué

---

### 3. **SafetyRoundOfflineService**
`services/SafetyRoundOfflineService.ts`

**Rôle** : Gestion des rondes de sécurité avec support offline

**API** :
```typescript
// Initialiser
await SafetyRoundOfflineService.initialize();

// Créer une ronde (offline-first)
const roundId = await SafetyRoundOfflineService.createSafetyRound({
  chauffeurId: 'driver-123',
  vehiculeId: 'vehicle-456',
  checks: { ... },
  ...
});
// Retourne un ID local si hors ligne, Firebase ID si en ligne

// Charger l'historique
const rounds = await SafetyRoundOfflineService.getSafetyRounds('driver-123');
// Combine les rondes locales + Firebase

// Déclarer une réparation
await SafetyRoundOfflineService.declareRepair(
  roundId,
  'defectKey',
  {
    repairDate: '2026-01-28',
    repairShop: 'Garage ABC',
    cost: 250
  }
);

// Statut de synchronisation
const status = await SafetyRoundOfflineService.getSyncStatus();
// {
//   totalLocal: 10,
//   synced: 7,
//   pending: 3
// }
```

**Workflow** :
```
Chauffeur remplit ronde
        ↓
Sauvegarde locale (AsyncStorage)
        ↓
    En ligne ?
     /      \
  OUI       NON
   ↓         ↓
Firebase   Queue
   ↓         ↓
  OK      Attente réseau
           ↓
      Réseau revient
           ↓
   Sync auto (OfflineQueue)
           ↓
       Firebase
```

---

### 4. **NetworkIndicator**
`components/NetworkIndicator.tsx`

**Rôle** : Indicateur visuel de l'état réseau

**Props** :
```typescript
interface NetworkIndicatorProps {
  position?: 'top' | 'bottom';  // Position dans l'écran
  showDetails?: boolean;        // Afficher le compte d'items
  onPress?: () => void;         // Callback au clic
}
```

**États visuels** :
| État | Couleur | Icône | Message |
|------|---------|-------|---------|
| **En ligne** | 🟢 Vert | `wifi` | "En ligne" |
| **En ligne (sync)** | 🟠 Orange | `cloud-sync` | "Synchronisation... (3)" |
| **Hors ligne** | 🔴 Rouge | `cloud-off-outline` | "Hors ligne" |
| **Hors ligne (attente)** | 🔴 Rouge | `cloud-off-outline` | "Hors ligne · 5 en attente" |

**Utilisation** :
```tsx
import { NetworkIndicator } from '../components/NetworkIndicator';

<NetworkIndicator 
  position="top" 
  showDetails 
  onPress={() => console.log('Badge cliqué')}
/>
```

---

### 5. **OfflineManager**
`services/OfflineManager.ts`

**Rôle** : Orchestrateur principal - initialise tous les services

**API** :
```typescript
// Initialiser (au démarrage de l'app)
await OfflineManager.initialize();

// Obtenir le statut global
const status = OfflineManager.getStatus();
// {
//   initialized: true,
//   network: 'online',
//   queue: { totalItems: 3, ... }
// }

// Forcer la synchronisation
await OfflineManager.forceSyncNow();

// Cleanup
OfflineManager.destroy();
```

**Initialisation dans l'app** :
```tsx
// app/_layout.tsx
useEffect(() => {
  OfflineManager.initialize().catch(error => {
    console.error('Erreur initialisation:', error);
  });
}, []);
```

---

## 🔧 Configuration Firebase

La persistance Firebase est automatiquement activée dans `src/services/firebaseConfig.ts` :

```typescript
// Web : IndexedDB
enableIndexedDbPersistence(firestore, {
  forceOwnership: false // Permet plusieurs onglets
});

// React Native : Automatique via AsyncStorage
```

**Avantages** :
- ✅ Lecture des données même hors ligne
- ✅ Écriture en cache local
- ✅ Synchronisation automatique au retour du réseau
- ✅ Pas de code supplémentaire requis

---

## 📱 Intégration dans l'Application

### Étape 1 : Initialisation Globale

**Fichier** : `app/_layout.tsx`

```tsx
import { OfflineManager } from '../services/OfflineManager';
import { NetworkIndicator } from '../components/NetworkIndicator';

export default function RootLayout() {
  const { user } = useAuth();

  // Initialiser au montage
  useEffect(() => {
    OfflineManager.initialize();
  }, []);

  return (
    <GestureHandlerRootView>
      <ThemeProvider>
        {/* Badge réseau (visible uniquement si connecté) */}
        {user && <NetworkIndicator position="top" showDetails />}
        
        <Stack>
          {/* ... routes ... */}
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```

### Étape 2 : Utilisation dans les Écrans

**Exemple** : Ronde de Sécurité

```tsx
import { SafetyRoundOfflineService } from '../services/SafetyRoundOfflineService';

// Créer une ronde
const submitRound = async () => {
  setLoading(true);
  
  try {
    const roundId = await SafetyRoundOfflineService.createSafetyRound({
      chauffeurId,
      vehiculeId,
      checks: formData,
      odometer: odometre,
      observations
    });

    Alert.alert(
      'Succès',
      'Ronde de sécurité enregistrée' + 
      (NetworkMonitor.isOffline() ? ' (sera synchronisée dès le retour du réseau)' : '')
    );

    router.back();
  } catch (error) {
    Alert.alert('Erreur', 'Impossible d\'enregistrer la ronde');
  } finally {
    setLoading(false);
  }
};
```

**Points clés** :
- ✅ Pas de vérification de réseau nécessaire
- ✅ Le service gère automatiquement online/offline
- ✅ Message différent selon l'état réseau (optionnel)

---

## 🧪 Scénarios de Test

### Scénario 1 : Création Ronde Hors Ligne

1. ✅ Désactiver le Wi-Fi/données mobiles
2. ✅ Ouvrir la ronde de sécurité
3. ✅ Vérifier le badge rouge "Hors ligne"
4. ✅ Remplir et soumettre la ronde
5. ✅ Vérifier le message de succès
6. ✅ Réactiver le réseau
7. ✅ Vérifier le badge orange "Synchronisation..."
8. ✅ Attendre 2-3 secondes
9. ✅ Vérifier le badge vert "En ligne"
10. ✅ Vérifier la ronde dans Firebase

### Scénario 2 : Perte de Connexion Pendant Soumission

1. ✅ Remplir la ronde (en ligne)
2. ✅ Désactiver le réseau juste avant de soumettre
3. ✅ Soumettre
4. ✅ Vérifier que la ronde est sauvegardée localement
5. ✅ Réactiver le réseau
6. ✅ Vérifier la synchronisation automatique

### Scénario 3 : Multiples Rondes Hors Ligne

1. ✅ Désactiver le réseau
2. ✅ Créer 3 rondes de sécurité
3. ✅ Vérifier le badge "Hors ligne · 3 en attente"
4. ✅ Réactiver le réseau
5. ✅ Vérifier la synchronisation des 3 rondes
6. ✅ Badge passe de orange à vert

### Scénario 4 : App Fermée Pendant Offline

1. ✅ Créer une ronde hors ligne
2. ✅ Fermer complètement l'app
3. ✅ Réactiver le réseau
4. ✅ Rouvrir l'app
5. ✅ Vérifier que la synchronisation reprend automatiquement

---

## 🔍 Debugging

### Logs Console

Le système génère des logs détaillés :

```
🔌 Initialisation NetworkMonitor
✅ [1/3] NetworkMonitor initialisé
📦 Initialisation OfflineQueue
📦 Queue chargée: 3 items
✅ [2/3] OfflineQueue initialisé
🔧 Initialisation SafetyRoundOfflineService
✅ [3/3] SafetyRoundOfflineService initialisé
✅ OfflineManager prêt

📊 État Offline Manager:
  Réseau: online
  Queue: 3 items (3 en attente)

🔌 Changement réseau: online → offline
📵 Hors ligne, synchronisation reportée

🔌 Changement réseau: offline → online
🌐 Réseau détecté, démarrage synchronisation...
🔄 Début synchronisation (3 items)
✅ Synchronisé: safety_round_1738092000000_abc123
✅ Synchronisé: safety_round_1738092001000_def456
✅ Synchronisé: safety_round_1738092002000_ghi789
✅ Synchronisation terminée: 3 succès, 0 échecs
```

### Vérifier l'État

Dans la console de développement :

```javascript
// État réseau
NetworkMonitor.getStatus(); // 'online' | 'offline' | 'unknown'

// Statistiques queue
OfflineQueue.getStats();
// { totalItems: 3, pendingItems: 2, failedItems: 0, syncedItems: 1 }

// Statut global
OfflineManager.getStatus();
// { initialized: true, network: 'online', queue: {...} }

// Rondes locales
await SafetyRoundOfflineService.getSyncStatus();
// { totalLocal: 10, synced: 7, pending: 3 }
```

### Forcer la Synchronisation

```javascript
await OfflineManager.forceSyncNow();
```

---

## 📊 Structure des Données Locales

### AsyncStorage Keys

| Clé | Contenu |
|-----|---------|
| `@offline_queue` | File d'attente de synchronisation (tous types) |
| `@safety_rounds_local` | Rondes de sécurité locales |

### Format des Rondes Locales

```json
[
  {
    "id": "local_1738092000000_abc123",
    "chauffeurId": "driver-123",
    "vehiculeId": "vehicle-456",
    "checks": { ... },
    "createdAt": 1738092000000,
    "synced": false,
    "firestoreId": null
  },
  {
    "id": "local_1738092001000_def456",
    "chauffeurId": "driver-123",
    "vehiculeId": "vehicle-456",
    "checks": { ... },
    "createdAt": 1738092001000,
    "synced": true,
    "firestoreId": "firebase_doc_id_789"
  }
]
```

### Format de la Queue

```json
[
  {
    "id": "safety_round_1738092000000_abc123",
    "type": "safety_round",
    "data": { ... },
    "timestamp": 1738092000000,
    "retryCount": 0,
    "maxRetries": 5
  }
]
```

---

## ⚙️ Configuration Avancée

### Paramètres de Retry

`services/OfflineQueue.ts` :

```typescript
private static readonly MAX_RETRY_DELAY_MS = 30000; // 30 secondes max

// Backoff exponentiel
const delay = Math.min(
  1000 * Math.pow(2, retryCount), // 1s, 2s, 4s, 8s, 16s, 32s
  MAX_RETRY_DELAY_MS
);
```

### Nettoyage des Données Locales

Par défaut, les rondes synchronisées sont conservées localement. Pour économiser l'espace :

```typescript
// Supprimer les rondes synchronisées de plus de 30 jours
await SafetyRoundOfflineService.cleanupSyncedRounds(30);
```

### Timeout de Synchronisation

Pour éviter les blocages, chaque handler de synchronisation devrait avoir un timeout :

```typescript
OfflineQueue.registerSyncHandler('safety_round', async (item) => {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 30000)
  );
  
  const syncPromise = saveToFirebase(item.data);
  
  await Promise.race([syncPromise, timeoutPromise]);
});
```

---

## 🚀 Étendre le Système

### Ajouter un Nouveau Type de Données

**Exemple** : Constats d'accident

1. **Créer un service offline** :

```typescript
// services/AccidentOfflineService.ts
class AccidentOfflineService {
  static async createAccident(data: AccidentData): Promise<string> {
    const localId = await this.saveLocally(data);
    
    if (NetworkMonitor.isOnline()) {
      try {
        const firebaseId = await this.saveToFirebase(data);
        return firebaseId;
      } catch {
        await OfflineQueue.enqueue('accident', { ...data, localId });
      }
    } else {
      await OfflineQueue.enqueue('accident', { ...data, localId });
    }
    
    return localId;
  }
}
```

2. **Enregistrer le handler** :

```typescript
// Dans initialize()
OfflineQueue.registerSyncHandler('accident', async (item) => {
  await AccidentOfflineService.syncToFirebase(item.data);
});
```

3. **Utiliser dans l'écran** :

```tsx
const submitAccident = async () => {
  const accidentId = await AccidentOfflineService.createAccident(formData);
  // Fonctionne online et offline !
};
```

---

## 📝 Checklist d'Intégration

- [x] NetworkMonitor créé et testé
- [x] OfflineQueue créé et testé
- [x] SafetyRoundOfflineService créé et testé
- [x] NetworkIndicator créé et intégré
- [x] OfflineManager créé et initialisé dans _layout.tsx
- [x] Persistance Firebase activée
- [ ] Tests manuels des scénarios offline
- [ ] Adaptation des autres écrans (accidents, documents, etc.)
- [ ] Tests sur appareil physique
- [ ] Documentation utilisateur finale

---

## 🎓 Bonnes Pratiques

1. **Toujours sauvegarder localement d'abord**
   ```typescript
   // ✅ Bon
   await saveLocally(data);
   if (online) await saveToFirebase(data);
   
   // ❌ Mauvais
   if (online) await saveToFirebase(data);
   else await saveLocally(data);
   ```

2. **Ne pas bloquer l'utilisateur**
   ```typescript
   // ✅ Bon
   const roundId = await createRound(data);
   Alert.alert('Succès', 'Ronde enregistrée');
   
   // ❌ Mauvais
   if (!online) {
     Alert.alert('Erreur', 'Connexion requise');
     return;
   }
   ```

3. **Informer l'utilisateur**
   ```typescript
   // ✅ Bon
   Alert.alert(
     'Succès',
     online ? 'Ronde enregistrée' : 'Ronde enregistrée (sera synchronisée)'
   );
   ```

4. **Gérer les erreurs de synchronisation**
   ```typescript
   // Handler avec try/catch
   OfflineQueue.registerSyncHandler('type', async (item) => {
     try {
       await syncLogic(item.data);
     } catch (error) {
       console.error('Erreur sync:', error);
       throw error; // Réessayer plus tard
     }
   });
   ```

---

## 🆘 Dépannage

### Problème : Le badge ne s'affiche pas

**Causes possibles** :
- OfflineManager pas initialisé
- NetworkIndicator pas ajouté dans le layout
- User pas connecté (`{user && <NetworkIndicator />}`)

**Solution** :
```tsx
// Vérifier dans app/_layout.tsx
useEffect(() => {
  OfflineManager.initialize();
}, []);

{user && <NetworkIndicator position="top" showDetails />}
```

### Problème : Les données ne se synchronisent pas

**Causes possibles** :
- Handler de synchronisation non enregistré
- Erreur dans le handler (vérifier logs)
- Network Monitor bloqué

**Solution** :
```typescript
// Vérifier l'enregistrement
OfflineQueue.registerSyncHandler('safety_round', handler);

// Forcer la synchronisation
await OfflineManager.forceSyncNow();

// Logs détaillés
console.log(OfflineQueue.getStats());
```

### Problème : Crash au lancement

**Cause** : Erreur dans l'initialisation

**Solution** :
```typescript
// Wrap avec try/catch
useEffect(() => {
  OfflineManager.initialize().catch(error => {
    console.error('Erreur init:', error);
    // Fallback : désactiver offline mode
  });
}, []);
```

---

## 📚 Ressources

- [NetInfo Documentation](https://github.com/react-native-netinfo/react-native-netinfo)
- [AsyncStorage Documentation](https://react-native-async-storage.github.io/async-storage/)
- [Firebase Persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline)

---

**✅ Système Offline-First opérationnel !**

Les chauffeurs peuvent maintenant utiliser l'application sans interruption, même dans les zones sans réseau. 🚕
