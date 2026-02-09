# 🔍 Guide de Dépannage - Indicateur Bluetooth

## ❓ Problème: "Je ne vois pas l'indicateur Bluetooth"

### 📍 Étape 1: Vérifier la navigation

L'indicateur Bluetooth n'apparaît QUE dans le **formulaire d'inspection mécanique**.

**Chemin correct:**
```
Menu principal
  → Documents
    → Inspection Mécanique
      → Prendre photo (ou passer)
        → FORMULAIRE ← Vous devez être ICI
          → Scrollez vers le bas
            → Section "Scanner OBD2"
              → Indicateur Bluetooth
```

**Signes que vous êtes au bon endroit:**
- ✅ Vous voyez "Numéro de Certificat", "Lieu d'Inspection", etc.
- ✅ Vous voyez une section jaune "⚠️ Loi SAAQ - Inspection Obligatoire"
- ✅ Juste en dessous: Section "🚗 Scanner OBD2 (Optionnel)"

### 🔄 Étape 2: Recharger l'app

Si vous êtes au bon endroit mais ne voyez pas l'indicateur:

**Méthode 1: Rechargement rapide**
```
Dans Metro Console:
Appuyez sur 'r' (minuscule)
```

**Méthode 2: Sur le téléphone/émulateur**
```
1. Secouez le téléphone/émulateur
2. Menu de développement s'ouvre
3. Cliquez "Reload"
```

**Méthode 3: Rechargement complet**
```powershell
# Dans le terminal où tourne Metro:
Ctrl+C (arrêter)

# Puis relancer:
npx expo start
# Appuyez sur 'a' pour Android
```

### 🐛 Étape 3: Vérifier avec le DEBUG

Un texte **rouge** devrait apparaître juste avant l'indicateur:

```
DEBUG: bluetoothEnabled = true
```

**Si vous voyez le DEBUG rouge:**
- ✅ Le code est bien chargé
- ✅ L'indicateur Bluetooth devrait être juste en dessous
- ✅ Scrollez un peu plus bas si nécessaire

**Si vous NE voyez PAS le DEBUG rouge:**
- ❌ Le code n'est pas chargé
- ❌ L'app n'a pas été rechargée
- ❌ Vous n'êtes pas dans le bon formulaire

### 📊 Étape 4: Vérifier les logs Metro

Dans le terminal où tourne Metro, cherchez:

```
État Bluetooth: PoweredOn    ← Si Bluetooth activé
État Bluetooth: PoweredOff   ← Si Bluetooth désactivé
```

**Si vous voyez ces logs:**
- ✅ La vérification Bluetooth fonctionne
- ✅ L'indicateur devrait être visible

**Si vous ne voyez PAS ces logs:**
- ❌ Le composant ne s'est pas monté
- ❌ Vous n'avez pas ouvert le formulaire d'inspection

### 🔧 Étape 5: Vérifier le fichier

Confirmez que le fichier contient bien le code:

```powershell
cd "C:\Projets\Apptaxi\Backup_AVANT_DECONNEXION_AUTO_2026-01-23_18-38-51"
Get-Content app/documents/scanInspectionMecanique.tsx | Select-String "bluetoothEnabled"
```

**Résultat attendu:**
Vous devriez voir plusieurs lignes contenant `bluetoothEnabled`

### 🚨 Solutions aux problèmes courants

#### Problème A: "Je suis dans Documents mais pas de formulaire"

**Cause:** Vous n'avez pas cliqué sur "Inspection Mécanique"

**Solution:**
1. Dans Documents, cherchez la carte "Inspection Mécanique"
2. Cliquez dessus
3. L'app vous demandera de prendre une photo
4. Prenez une photo OU cliquez "Continuer" si déjà pris
5. Le formulaire devrait apparaître

#### Problème B: "Je vois le formulaire mais pas de section OBD2"

**Cause:** Vous ne scrollez pas assez bas

**Solution:**
1. Scrollez complètement vers le bas du formulaire
2. Passez les champs: Numéro, Lieu, Inspecteur, Dates, Notes
3. Passez la section jaune "⚠️ Loi SAAQ"
4. La section OBD2 est juste après

#### Problème C: "Je vois la section OBD2 mais pas d'indicateur"

**Cause:** Le code n'a pas été rechargé

**Solution:**
```powershell
# Arrêter Metro (Ctrl+C)
# Nettoyer le cache
cd "C:\Projets\Apptaxi\Backup_AVANT_DECONNEXION_AUTO_2026-01-23_18-38-51"
Remove-Item -Recurse -Force node_modules\.cache

# Relancer
npx expo start --clear
# Appuyez sur 'a'
```

#### Problème D: "L'app crash ou erreur rouge"

**Cause possible:** Erreur de syntaxe ou module manquant

**Solution:**
Regardez l'erreur dans Metro Console. Cherchez:
- `Cannot find module`
- `Syntax Error`
- `Unexpected token`

**Si erreur `State` not found:**
```powershell
npm install react-native-ble-plx
npx expo prebuild --clean
npx expo run:android
```

### ✅ Checklist de vérification

Cochez chaque point:
- [ ] Je suis dans l'app TaxiFlow
- [ ] J'ai navigué vers Documents
- [ ] J'ai cliqué sur "Inspection Mécanique"
- [ ] J'ai pris une photo (ou passé cette étape)
- [ ] Je vois le formulaire avec champs (Numéro, Lieu, etc.)
- [ ] J'ai scrollé jusqu'au bas du formulaire
- [ ] Je vois la section jaune "⚠️ Loi SAAQ"
- [ ] Je vois la section "🚗 Scanner OBD2 (Optionnel)"
- [ ] Je vois le texte DEBUG rouge (si ajouté)
- [ ] Je vois l'indicateur Bluetooth (vert ou rouge)

Si TOUS les points sont cochés et vous ne voyez toujours pas l'indicateur:
→ Prenez une capture d'écran et montrez-moi ce que vous voyez

### 📸 Ce que vous devriez voir

**Avec Bluetooth activé:**
```
┌───────────────────────────────────────┐
│ 🚗 Scanner OBD2 (Optionnel)           │
│                                       │
│ Connectez un scanner OBD2 Bluetooth   │
│ pour vérifier les codes d'erreur...   │
│                                       │
│ DEBUG: bluetoothEnabled = true        │ ← Rouge (debug)
│                                       │
│ ┌─────────────────────────────────┐   │
│ │ 📶 ✓ Bluetooth activé        🔄 │   │ ← Vert
│ └─────────────────────────────────┘   │
│                                       │
│ [  Lancer le scan OBD2  ]             │ ← Bouton actif (or)
└───────────────────────────────────────┘
```

**Avec Bluetooth désactivé:**
```
┌───────────────────────────────────────┐
│ 🚗 Scanner OBD2 (Optionnel)           │
│                                       │
│ Connectez un scanner OBD2 Bluetooth   │
│ pour vérifier les codes d'erreur...   │
│                                       │
│ DEBUG: bluetoothEnabled = false       │ ← Rouge (debug)
│                                       │
│ ┌─────────────────────────────────┐   │
│ │ 📴 ✗ Bluetooth désactivé -    🔄 │   │ ← Rouge
│ │   Activez-le dans les paramètres │   │
│ └─────────────────────────────────┘   │
│                                       │
│ [  Lancer le scan OBD2  ]             │ ← Bouton grisé (désactivé)
└───────────────────────────────────────┘
```

### 🆘 Toujours bloqué?

Si aucune solution ne fonctionne:

1. **Prenez une capture d'écran** de ce que vous voyez
2. **Copiez les logs Metro** (dernières 20 lignes)
3. **Vérifiez la navigation:** Documents → Inspection Mécanique → Formulaire

**Commande pour vérifier que le code est bien présent:**
```powershell
cd "C:\Projets\Apptaxi\Backup_AVANT_DECONNEXION_AUTO_2026-01-23_18-38-51"
Get-Content app/documents/scanInspectionMecanique.tsx | Select-String "STATUT BLUETOOTH" -Context 2
```

Résultat attendu: Vous devriez voir le commentaire `{/* STATUT BLUETOOTH */}`
