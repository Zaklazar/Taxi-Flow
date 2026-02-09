# Configuration de l'URL de l'API

## Problème : Erreur "Connexion au serveur impossible"

Cela signifie que l'application ne peut pas se connecter au serveur backend.

## Solution : Configurer l'URL correcte

### Étape 1 : Trouver l'IP de votre PC

**Sur Windows :**
```powershell
ipconfig
```
Cherchez la ligne "IPv4 Address" sous "Ethernet adapter" ou "Wireless LAN adapter". Exemple : `192.168.1.100`

**Sur Mac/Linux :**
```bash
ifconfig
```
ou
```bash
ip addr show
```

### Étape 2 : Modifier le fichier de configuration

Ouvrez le fichier : `config/api.ts`

Modifiez cette ligne :
```typescript
export const API_URL = 'http://192.168.1.100:8000'; // Remplacez par VOTRE IP
```

### Étape 3 : Configuration selon votre environnement

**Si vous utilisez un émulateur Android :**
```typescript
export const API_URL = 'http://10.0.2.2:8000';
```

**Si vous utilisez un appareil physique ou émulateur iOS :**
```typescript
export const API_URL = 'http://192.168.1.XXX:8000'; // Votre IP locale
```

**Si vous utilisez le simulateur iOS sur Mac :**
```typescript
export const API_URL = 'http://localhost:8000';
```

### Étape 4 : Vérifier que le serveur est démarré

1. Ouvrez un terminal dans le dossier `Taxi_Serveur`
2. Démarrez le serveur : `python main.py` ou double-cliquez sur `start.bat`
3. Vérifiez que vous voyez : `Application startup complete` et `Uvicorn running on http://0.0.0.0:8000`

### Étape 5 : Vérifier la connexion

Testez dans un navigateur : `http://VOTRE_IP:8000/docs`

Si vous voyez la documentation de l'API, le serveur fonctionne !

### Dépannage

- **Assurez-vous que votre PC et votre téléphone sont sur le même réseau WiFi**
- **Désactivez temporairement le pare-feu Windows** ou autorisez le port 8000
- **Vérifiez que le port 8000 n'est pas utilisé par un autre programme**
