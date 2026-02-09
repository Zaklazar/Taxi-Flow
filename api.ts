// Configuration de l'API Backend
// Utilisation des variables d'environnement pour la sécurité
import Constants from 'expo-constants';

// Récupération de l'URL depuis les variables d'environnement
// Priorité: .env > Constants.expoConfig.extra > valeur par défaut
export const API_URL = Constants.expoConfig?.extra?.apiUrl || 
  process.env.EXPO_PUBLIC_API_URL || 
  'http://192.168.2.13:8000'; // Valeur par défaut pour développement

// Pour développement local sur émulateur Android:
// export const API_URL = 'http://10.0.2.2:8000';

// Pour appareil physique ou émulateur iOS:
// Trouvez votre IP locale avec: ipconfig (Windows) ou ifconfig (Mac/Linux)
// Remplacez X.X.X.X par votre IP locale (ex: 192.168.1.100)

// IMPORTANT: Assurez-vous que le serveur backend est démarré:
// cd Taxi_Serveur
// python main.py
// ou utilisez start.bat / start.ps1

// Test de connexion API (pour debug)
export const testApiConnection = async () => {
  try {
    const response = await fetch(`${API_URL}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return {
      success: response.ok,
      status: response.status,
      data: await response.json(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Pour production (à configurer plus tard):
// export const API_URL = 'https://votre-serveur.com/api';

// Détection automatique de l'environnement (optionnel)
// import { Platform } from 'react-native';
// export const API_URL = Platform.OS === 'android' 
//   ? 'http://10.0.2.2:8000'  // Android Emulator
//   : 'http://localhost:8000'; // iOS Simulator / Web
