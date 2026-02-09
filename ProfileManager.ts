import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db } from '../src/services/firebaseConfig';

const PROFILE_KEY = 'taxi_driver_profile';
const PROFILES_COLLECTION = 'profiles';

export type DriverProfile = {
  name: string;
  licenseNumber: string;
  vehiclePlate: string;
  insurance: string;
  email: string;
  pocketNumber?: string;
  vehicleMake?: string;      // Marque du véhicule (ex: Toyota, Honda)
  vehicleModel?: string;     // Modèle du véhicule (ex: Camry, Civic)
  vehicleYear?: string;      // Année du véhicule (ex: 2020, 2021)
  id?: string;               // ID optionnel pour compatibilité
  chauffeurId?: string;       // ID chauffeur optionnel pour compatibilité
  createdAt?: string;        // Date de création optionnelle pour compatibilité
  userId?: string;            // ID utilisateur Firebase
  updatedAt?: string;        // Date de mise à jour
};

export const ProfileManager = {
  // Sauvegarder le profil (Local + Firebase)
  saveProfile: async (profile: DriverProfile) => {
    try {
      const jsonValue = JSON.stringify(profile);
      
      // 1️⃣ SAUVEGARDE LOCALE (pour accès rapide hors ligne)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem(PROFILE_KEY, jsonValue);
      } else {
        await AsyncStorage.setItem(PROFILE_KEY, jsonValue);
      }

      // 2️⃣ SAUVEGARDE FIREBASE (persistance permanente)
      const user = auth.currentUser;
      if (user) {
        const profileRef = doc(db, PROFILES_COLLECTION, user.uid);
        await setDoc(profileRef, {
          ...profile,
          userId: user.uid,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Profil sauvegardé (Local + Firebase)');
      } else {
        console.log('⚠️ Profil sauvegardé localement uniquement (pas connecté)');
      }

      return true;
    } catch (e) {
      console.error("❌ Erreur sauvegarde profil:", e);
      return false;
    }
  },

  // Lire le profil (Firebase en priorité, puis local)
  getProfile: async (): Promise<DriverProfile | null> => {
    try {
      const user = auth.currentUser;

      // 1️⃣ PRIORITÉ: Charger depuis Firebase si connecté
      if (user) {
        try {
          const profileRef = doc(db, PROFILES_COLLECTION, user.uid);
          const profileSnap = await getDoc(profileRef);
          
          if (profileSnap.exists()) {
            const firebaseProfile = profileSnap.data() as DriverProfile;
            
            // Mettre à jour le cache local
            const jsonValue = JSON.stringify(firebaseProfile);
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.localStorage.setItem(PROFILE_KEY, jsonValue);
            } else {
              await AsyncStorage.setItem(PROFILE_KEY, jsonValue);
            }
            
            console.log('✅ Profil chargé depuis Firebase');
            return firebaseProfile;
          }
        } catch (firebaseError) {
          console.warn('⚠️ Erreur Firebase, lecture locale:', firebaseError);
        }
      }

      // 2️⃣ FALLBACK: Charger depuis le stockage local
      let jsonValue = null;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        jsonValue = window.localStorage.getItem(PROFILE_KEY);
      } else {
        jsonValue = await AsyncStorage.getItem(PROFILE_KEY);
      }

      if (jsonValue) {
        console.log('ℹ️ Profil chargé depuis le cache local');
        return JSON.parse(jsonValue);
      }

      return null;
    } catch (e) {
      console.error("❌ Erreur lecture profil:", e);
      return null;
    }
  },

  // Effacer le profil local UNIQUEMENT (lors déconnexion, Firebase reste)
  clearProfile: async () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.removeItem(PROFILE_KEY);
      } else {
        await AsyncStorage.removeItem(PROFILE_KEY);
      }
      console.log('✅ Cache local profil effacé (Firebase conservé)');
      return true;
    } catch (e) {
      console.error("❌ Erreur effacement cache:", e);
      return false;
    }
  },

  // Supprimer le compte DÉFINITIVEMENT (Local + Firebase)
  deleteProfile: async () => {
    try {
      const user = auth.currentUser;
      
      // ÉTAPE 1: Supprimer de Firebase
      if (user) {
        try {
          const profileRef = doc(db, PROFILES_COLLECTION, user.uid);
          await deleteDoc(profileRef);
          console.log('✅ Profil supprimé de Firebase');
        } catch (firebaseError) {
          console.error('❌ Erreur suppression Firebase:', firebaseError);
        }
      }

      // ÉTAPE 2: Nettoyage local complet
      await ProfileManager.clearProfile();
      
      const keysToRemove = [
        '@taxi_user_preferences',
        '@taxi_historique_rapports',
        '@taxi_settings_theme',
        '@taxi_scan_history',
        '@taxi_depenses_data',
      ];

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        keysToRemove.forEach(key => {
          window.localStorage.removeItem(key);
        });
      } else {
        for (const key of keysToRemove) {
          await AsyncStorage.removeItem(key);
        }
      }

      console.log('✅ Compte supprimé complètement');
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression compte:', error);
      return false;
    }
  }
};