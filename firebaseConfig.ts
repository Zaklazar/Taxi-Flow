/**
 * CONFIGURATION FIREBASE
 * 
 * Configuration centralisée pour Firebase (Web SDK)
 * Compatible avec React Native via Expo
 * 
 * IMPORTANT : 
 * - Les credentials doivent être stockés dans .env (pas de hardcode)
 * - Ce fichier utilise le SDK Web de Firebase (pas @react-native-firebase)
 * - Pour production, utilisez Firebase App Check
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
    Auth,
    browserLocalPersistence,
    getAuth,
    initializeAuth
} from 'firebase/auth';
import { Firestore, enableIndexedDbPersistence, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Import conditionnel pour getReactNativePersistence (non disponible sur web)
let getReactNativePersistence: any;
try {
  if (Platform.OS !== 'web') {
    // Import dynamique pour éviter les erreurs sur web
    const firebaseAuthReactNative = eval('require')('firebase/auth/react-native');
    getReactNativePersistence = firebaseAuthReactNative.getReactNativePersistence;
  }
} catch (error) {
  console.warn('⚠️ getReactNativePersistence non disponible, utilisation de la persistance par défaut');
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Configuration Firebase à partir des variables d'environnement
 * 
 * IMPORTANT : Créez un fichier .env à la racine de TaxiFlow/ avec :
 * - EXPO_PUBLIC_FIREBASE_API_KEY=votre_api_key
 * - EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=votre_projet.firebaseapp.com
 * - EXPO_PUBLIC_FIREBASE_PROJECT_ID=votre_projet_id
 * - EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=votre_projet.appspot.com
 * - EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
 * - EXPO_PUBLIC_FIREBASE_APP_ID=votre_app_id
 * - EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=votre_measurement_id (optionnel)
 * 
 * Redémarrez Expo après avoir modifié .env : npx expo start --clear
 */

// Validation des variables d'environnement requises
const requiredEnvVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && __DEV__) {
  console.error('❌ Variables d\'environnement Firebase manquantes:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n📝 Créez un fichier .env à la racine de TaxiFlow/ avec vos credentials Firebase.');
  console.error('📖 Consultez CONFIGURATION_FIREBASE.md pour plus de détails.\n');
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || ''
};

// ============================================
// INITIALISATION
// ============================================

/**
 * Instance Firebase (singleton)
 */
let app: FirebaseApp;

/**
 * Initialiser Firebase (appelé automatiquement au premier import)
 */
const initializeFirebase = (): FirebaseApp => {
  // Éviter la double initialisation
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialisé');
  } else {
    app = getApps()[0];
    console.log('ℹ️ Firebase déjà initialisé');
  }
  
  return app;
};

// Initialiser automatiquement
app = initializeFirebase();

// ============================================
// EXPORTS - SERVICES FIREBASE
// ============================================

/**
 * Firestore Database
 * Utilisé pour stocker les transactions, profils, etc.
 * Avec persistance locale activée
 */
export const db: Firestore = (() => {
  const firestore = getFirestore(app);
  
  // Activer la persistance selon la plateforme
  if (Platform.OS === 'web') {
    // Web : IndexedDB
    enableIndexedDbPersistence(firestore, {
      forceOwnership: false // Permet plusieurs onglets
    }).then(() => {
      console.log('✅ Persistance Firebase (IndexedDB) activée');
    }).catch((error) => {
      if (error.code === 'failed-precondition') {
        console.warn('⚠️ Persistance déjà activée dans un autre onglet');
      } else if (error.code === 'unimplemented') {
        console.warn('⚠️ Persistance non supportée par ce navigateur');
      } else {
        console.error('❌ Erreur activation persistance:', error);
      }
    });
  } else {
    // React Native : La persistance est automatique via AsyncStorage
    console.log('✅ Persistance Firebase (Native) activée automatiquement');
  }
  
  return firestore;
})();

/**
 * Storage
 * Utilisé pour stocker les photos de reçus, permis, etc.
 */
export const storage: FirebaseStorage = getStorage(app);

/**
 * Instance d'authentification Firebase
 * Utilisé pour l'authentification des chauffeurs
 * Avec persistance AsyncStorage pour React Native et localStorage pour le web
 */
export const auth: Auth = (() => {
  try {
    if (Platform.OS === 'web') {
      // Web : utiliser localStorage
      return initializeAuth(app, {
        persistence: browserLocalPersistence
      });
    } else {
      // Mobile : utiliser AsyncStorage
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    }
  } catch (error) {
    // Si déjà initialisé, récupérer l'instance existante
    return getAuth(app);
  }
})();

/**
 * App instance
 */
export const firebaseApp: FirebaseApp = app;

/**
 * Configuration (pour debug)
 */
export const getFirebaseConfig = () => ({
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  // Ne pas exposer l'API key en production
});

// ============================================
// COLLECTIONS FIRESTORE
// ============================================

/**
 * Noms des collections Firestore (centralisés)
 */
export const COLLECTIONS = {
  EXPENSES: 'expenses',              // Dépenses
  INCOME: 'income',                  // Revenus
  DRIVERS: 'drivers',                // Chauffeurs
  VEHICLES: 'vehicles',              // Véhicules
  SAFETY_ROUNDS: 'safety_rounds',    // Rondes de sécurité
  ACCIDENTS: 'accidents',            // Constats d'accident
  DOCUMENTS: 'documents',            // Documents (permis, assurances, etc.)
  PROFILES: 'profiles'               // Profils chauffeurs (persistance)
} as const;

// ============================================
// HELPERS
// ============================================

/**
 * Vérifier si Firebase est correctement configuré
 */
export const isFirebaseConfigured = (): boolean => {
  return !!(
    firebaseConfig.apiKey && 
    firebaseConfig.projectId && 
    firebaseConfig.apiKey.length > 10 &&
    firebaseConfig.projectId.length > 3
  );
};

/**
 * Obtenir le statut de connexion Firebase
 */
export const getFirebaseStatus = () => {
  return {
    initialized: getApps().length > 0,
    configured: isFirebaseConfigured(),
    projectId: firebaseConfig.projectId
  };
};

// Log du statut au démarrage
if (__DEV__) {
  const status = getFirebaseStatus();
  console.log('Firebase Status:', status);
  
  if (!status.configured) {
    console.warn('⚠️ Firebase n\'est pas configuré. Utilisez un fichier .env avec vos credentials.');
  }
}

export default app;
