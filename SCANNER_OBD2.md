# 📡 Scanner OBD2 - Guide d'Utilisation

## 🎯 Objectif

Le scanner OBD2 intégré permet de lire les codes d'erreur (DTC) du véhicule via un scanner Bluetooth ELM327 et de les interpréter automatiquement avec l'IA selon les normes SAAQ du Québec.

## 🔌 Prérequis

### Matériel requis
- **Scanner OBD2 Bluetooth ELM327** (ou compatible)
- Véhicule compatible OBD2 (tous les véhicules fabriqués après 1996)
- Smartphone avec Bluetooth activé

### Permissions Android
Les permissions suivantes sont déjà configurées dans `AndroidManifest.xml`:
- `BLUETOOTH_SCAN` (Android 12+)
- `BLUETOOTH_CONNECT` (Android 12+)
- `ACCESS_FINE_LOCATION` (requis pour scan Bluetooth)

## 🚀 Utilisation

### 1. Préparer le véhicule
1. Brancher le scanner OBD2 dans le port OBD2 du véhicule (généralement sous le tableau de bord)
2. Mettre le contact du véhicule (moteur peut rester éteint)
3. Vérifier que le scanner s'allume (LED bleue clignotante)

### 2. Scanner dans l'application
1. Ouvrir **Documents** → **Inspection Mécanique**
2. Scanner le certificat d'inspection (facultatif)
3. Remplir le formulaire
4. Dans la section **Scanner OBD2**, appuyer sur **"Lancer le scan OBD2"**

### 3. Processus de scan
Le scanner va automatiquement:
1. 🔍 **Rechercher** le scanner Bluetooth (10 secondes max)
2. 🔗 **Se connecter** au scanner OBD2
3. 🔧 **Initialiser** le protocole avec les commandes AT:
   - `ATZ` → Réinitialisation
   - `ATE0` → Désactivation écho
   - `ATL0` → Suppression sauts de ligne
   - `ATSP0` → Détection automatique du protocole
4. ✅ **Vérifier** la connexion ECU avec `0100`
5. 📋 **Lire** les codes DTC avec commande `03`
6. 📋 **Afficher** les codes bruts (ex: P0420, P0300)

### 4. Interprétation des codes

**⚠️ IMPORTANT:** L'interprétation IA des codes n'est pas encore implémentée.

Pour le moment, le scanner affiche uniquement les **codes bruts** (ex: P0420, P0300).

**À venir:** Intégration avec l'agent Blink pour interprétation en français québécois selon le Règlement T-11.2, r. 4.

**En attendant:** Consultez un mécanicien pour interpréter les codes détectés.

## 🛠️ Architecture Technique

### Services créés

#### 1. `OBD2Manager.ts`
Service de communication bas niveau avec le scanner OBD2.

**Méthodes principales:**
```typescript
// Rechercher scanners OBD2 Bluetooth
await OBD2Manager.scanForOBD2Device(): Promise<string[]>

// Se connecter à un scanner
await OBD2Manager.connect(deviceId: string): Promise<boolean>

// Initialiser le protocole AT
await OBD2Manager.initializeOBD2Protocol(): Promise<boolean>

// Lire les codes DTC
await OBD2Manager.readDTCCodes(): Promise<OBD2Result>

// Se déconnecter
await OBD2Manager.disconnect(): Promise<void>
```

**Séquence AT obligatoire:**
```
ATZ     → Reset du scanner
ATE0    → Désactivation de l'écho
ATL0    → Suppression des sauts de ligne
ATSP0   → Détection automatique du protocole
0100    → Vérification connexion ECU
03      → Lecture codes DTC
```

**Timeout:** 5 secondes par commande (configurable)

#### 2. `OBD2InterpretationService.ts`
Service d'interprétation des codes DTC (placeholder pour Agent Blink).

**Méthodes principales:**
```typescript
// Afficher codes bruts (temporaire)
await OBD2InterpretationService.interpretDTCCodes(codes: string[]): Promise<OBD2InterpretationResult>

// PLACEHOLDER - À implémenter avec Agent Blink
await OBD2InterpretationService.interpretDTCWithAI(codes: string[]): Promise<OBD2InterpretationResult>

// Formater pour affichage
OBD2InterpretationService.formatInterpretationForDisplay(result: OBD2InterpretationResult): string
```

**Configuration Agent Blink:**
```env
# À ajouter dans .env une fois l'URL fournie
EXPO_PUBLIC_BLINK_AGENT_URL=https://votre-agent-blink.com/api
```

**TODO:** 
- Connecter à l'agent Blink
- Implémenter `interpretDTCWithAI()`
- Traiter réponse JSON de l'agent

### Structure des données

```typescript
interface OBD2Result {
  success: boolean;
  dtcCodes?: string[];      // Ex: ["P0420", "P0301"]
  rawResponse?: string;
  error?: string;
}

interface DTCInterpretation {
  code: string;             // Ex: "P0420"
  severity: 'critique' | 'majeur' | 'mineur';
  description: string;      // Ex: "Efficacité du catalyseur"
  explication: string;
  impactConformite: string;
  recommandation: string;
}

interface OBD2InterpretationResult {
  success: boolean;
  interpretations?: DTCInterpretation[];
  statutVehicule: 'conforme' | 'non-conforme' | 'attention';
  messageGlobal: string;
  error?: string;
}
```

## 🔧 Dépannage

### Scanner non trouvé
- Vérifier que le Bluetooth est activé
- Vérifier que le scanner est allumé et clignotant
- Rapprocher le téléphone du scanner
- Redémarrer le scanner (débrancher/rebrancher)

### Erreur ECU
- Vérifier que le contact est mis
- Vérifier que le scanner est bien branché au port OBD2
- Certains vieux véhicules (avant 1996) ne sont pas compatibles
- Essayer de démarrer le moteur

### Timeout
- Le scanner peut prendre jusqu'à 5 secondes par commande
- Si timeout répété, débrancher/rebrancher le scanner
- Vérifier la batterie du véhicule (tension faible = problèmes OBD2)

### Codes non interprétés
- Vérifier que la clé API OpenAI est configurée dans `.env`
- Les codes sont sauvegardés même si l'interprétation échoue
- Consulter un mécanicien pour codes critiques

## 📚 Références

### Protocole OBD2
- [ISO 15031](https://en.wikipedia.org/wiki/OBD-II_PIDs)
- [SAE J1979](https://www.sae.org/standards/content/j1979_201702/)
- [ELM327 Commands](https://www.elmelectronics.com/wp-content/uploads/2017/01/ELM327DS.pdf)

### Réglementation Québec
- [Règlement T-11.2, r. 4](http://www.legisquebec.gouv.qc.ca/)
- [Normes SAAQ - Inspection Mécanique](https://saaq.gouv.qc.ca/)

### Bibliothèques utilisées
- [react-native-ble-manager](https://github.com/innoveit/react-native-ble-manager) - Communication Bluetooth
- OpenAI GPT-4o - Interprétation IA des codes

## 🔐 Sécurité & Confidentialité

- ✅ Aucune donnée OBD2 n'est envoyée à des serveurs externes (sauf OpenAI pour interprétation)
- ✅ Les codes sont stockés localement dans le document d'inspection
- ✅ L'interprétation IA est facultative (les codes bruts sont toujours sauvegardés)
- ✅ Le scanner ne peut PAS modifier ou effacer les codes du véhicule (lecture seule)

## 📝 Notes de développement

### Pourquoi ELM327?
- Standard de facto pour scanners OBD2 Bluetooth
- Prix abordable ($10-50 CAD)
- Largement disponible (Amazon, AliExpress, etc.)
- Compatible avec 99% des véhicules post-1996

### Pourquoi pas WiFi?
- Bluetooth BLE plus économe en énergie
- Portée suffisante (10m)
- Pas besoin de configuration réseau

### Alternatives considérées
- `react-native-bluetooth-serial-next` → Moins maintenu
- `react-native-obd2` → Bibliothèque abandonnée
- Scan WiFi → Complexité réseau inutile

## 🎓 Apprentissage

Pour comprendre les codes DTC:
- **Pxxxx** → Codes moteur (Powertrain)
- **Cxxxx** → Codes châssis (Chassis)
- **Bxxxx** → Codes carrosserie (Body)
- **Uxxxx** → Codes réseau (Network)

Premier chiffre après la lettre:
- **0** → Code générique SAE
- **1** → Code spécifique constructeur

Exemples courants:
- **P0420** → Catalyseur inefficace
- **P0300** → Ratés d'allumage multiples
- **P0171** → Mélange air/essence trop pauvre
- **C0035** → Capteur vitesse roue gauche défaillant
