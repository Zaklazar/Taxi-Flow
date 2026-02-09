/**
 * AuthService.ts
 * 
 * Service d'authentification Firebase pour TaxiFlow.
 * Gère l'inscription, la connexion, la déconnexion et la gestion de profil.
 * 
 * Fonctionnalités :
 * - Inscription avec email/password
 * - Connexion avec email/password
 * - Connexion anonyme (mode démo)
 * - Déconnexion
 * - Récupération de mot de passe
 * - Mise à jour du profil chauffeur
 * - Gestion des erreurs traduites (FR/EN)
 * 
 * @example
 * // S'inscrire
 * const user = await signUpWithEmail('chauffeur@taxi.com', 'password123', {
 *   firstName: 'Jean',
 *   lastName: 'Dupont',
 *   phone: '514-555-1234'
 * });
 * 
 * // Se connecter
 * const user = await signInWithEmail('chauffeur@taxi.com', 'password123');
 * 
 * // Observer l'état d'authentification
 * onAuthStateChanged((user) => {
 *   if (user) {
 *     console.log('Connecté:', user.uid);
 *   } else {
 *     console.log('Déconnecté');
 *   }
 * });
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updateEmail,
  updatePassword,
  User,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db, COLLECTIONS } from './firebaseConfig';
import { SubscriptionService } from './SubscriptionService';

/**
 * Interface du profil chauffeur dans Firestore
 */
export interface DriverProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  photoURL?: string;
  vehicleInfo?: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    vin?: string;
  };
  licenseInfo?: {
    licenseNumber: string;
    expiryDate: Date;
    category: string;
  };
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    expiryDate: Date;
  };
  preferences?: {
    language: 'fr' | 'en';
    currency: 'CAD';
    notifications: boolean;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

/**
 * Données d'inscription minimales
 */
export interface SignUpData {
  firstName: string;
  lastName: string;
  phone: string;
  language?: 'fr' | 'en';
}

/**
 * Inscrit un nouveau chauffeur avec email/password
 * 
 * @param email - Email du chauffeur
 * @param password - Mot de passe (min 6 caractères)
 * @param profileData - Données du profil
 * @returns User Firebase
 * @throws Error si inscription échoue
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  profileData: SignUpData
): Promise<User> => {
  try {
    // Créer le compte Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Mettre à jour le displayName
    await updateProfile(user, {
      displayName: `${profileData.firstName} ${profileData.lastName}`
    });

    // Créer le profil dans Firestore
    const now = Timestamp.now();
    const driverProfile: DriverProfile = {
      uid: user.uid,
      email: user.email!,
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      phone: profileData.phone,
      preferences: {
        language: profileData.language || 'fr',
        currency: 'CAD',
        notifications: true
      },
      createdAt: now,
      updatedAt: now,
      isActive: true
    };

    await setDoc(doc(db, COLLECTIONS.DRIVERS, user.uid), driverProfile);

    // Initialiser l'abonnement (trial de 7 jours)
    await SubscriptionService.initializeSubscription(user.uid);
    if (__DEV__) console.log('✅ Abonnement trial initialisé');

    // Envoyer l'email de vérification
    await sendEmailVerification(user);
    if (__DEV__) console.log('✅ Email de vérification envoyé');

    return user;
  } catch (error: any) {
    console.error('Error signing up:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Connecte un chauffeur avec email/password
 * 
 * @param email - Email du chauffeur
 * @param password - Mot de passe
 * @returns User Firebase
 * @throws Error si connexion échoue
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Error signing in:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Connexion anonyme (mode démo)
 * Utile pour tester l'app sans créer de compte
 * 
 * @returns User Firebase anonyme
 * @throws Error si connexion échoue
 */
export const signInAnonymouslyDemo = async (): Promise<User> => {
  try {
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;

    // Créer un profil démo dans Firestore
    const now = Timestamp.now();
    const demoProfile: DriverProfile = {
      uid: user.uid,
      email: 'demo@taxiflow.app',
      firstName: 'Démo',
      lastName: 'Chauffeur',
      phone: '514-555-DEMO',
      preferences: {
        language: 'fr',
        currency: 'CAD',
        notifications: false
      },
      createdAt: now,
      updatedAt: now,
      isActive: true
    };

    await setDoc(doc(db, COLLECTIONS.DRIVERS, user.uid), demoProfile);

    return user;
  } catch (error: any) {
    console.error('Error signing in anonymously:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Déconnecte l'utilisateur actuel et nettoie toutes les données locales
 * 
 * @throws Error si déconnexion échoue
 */
export const signOut = async (): Promise<void> => {
  try {
    console.log('🔐 Déconnexion en cours...');
    
    // 1. Déconnexion Firebase
    await firebaseSignOut(auth);
    console.log('✅ Firebase signOut OK');
    
    // 2. Nettoyage AsyncStorage - imports dynamiques pour éviter dépendances
    // ⚠️ IMPORTANT: Ne PAS supprimer les documents (taxi_professional_documents_*)
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const keys = await AsyncStorage.getAllKeys();
      
      // Filtrer pour garder les documents
      const keysToRemove = keys.filter((key: string) => 
        !key.includes('taxi_professional_documents')
      );
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`✅ AsyncStorage nettoyé (${keysToRemove.length} clés supprimées, documents préservés)`);
      }
      
      // Logs pour debug
      const documentsKeys = keys.filter((key: string) => key.includes('taxi_professional_documents'));
      if (documentsKeys.length > 0) {
        console.log(`📦 Documents préservés (${documentsKeys.length} clés):`, documentsKeys);
      }
    } catch (storageError) {
      console.warn('⚠️ Nettoyage AsyncStorage échoué (peut-être pas installé):', storageError);
    }
    
    console.log('✅ Déconnexion complète réussie');
  } catch (error: any) {
    console.error('❌ Erreur lors de la déconnexion:', error);
    throw new Error('Erreur lors de la déconnexion');
  }
};

/**
 * Envoie un email de réinitialisation de mot de passe
 * 
 * @param email - Email du compte
 * @throws Error si envoi échoue
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Récupère le profil chauffeur depuis Firestore
 * 
 * @param uid - ID de l'utilisateur
 * @returns Profil chauffeur ou null si non trouvé
 */
export const getDriverProfile = async (uid: string): Promise<DriverProfile | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.DRIVERS, uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as DriverProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting driver profile:', error);
    throw new Error('Erreur lors de la récupération du profil');
  }
};

/**
 * Met à jour le profil chauffeur dans Firestore
 * 
 * @param uid - ID de l'utilisateur
 * @param updates - Champs à mettre à jour
 * @throws Error si mise à jour échoue
 */
export const updateDriverProfile = async (
  uid: string,
  updates: Partial<DriverProfile>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.DRIVERS, uid);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating driver profile:', error);
    throw new Error('Erreur lors de la mise à jour du profil');
  }
};

/**
 * Met à jour l'email de l'utilisateur
 * 
 * @param newEmail - Nouvel email
 * @throws Error si mise à jour échoue
 */
export const changeEmail = async (newEmail: string): Promise<void> => {
  try {
    if (!auth.currentUser) {
      throw new Error('Aucun utilisateur connecté');
    }

    await updateEmail(auth.currentUser, newEmail);

    // Mettre à jour dans Firestore aussi
    await updateDriverProfile(auth.currentUser.uid, { email: newEmail });
  } catch (error: any) {
    console.error('Error changing email:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Met à jour le mot de passe de l'utilisateur
 * 
 * @param newPassword - Nouveau mot de passe (min 6 caractères)
 * @throws Error si mise à jour échoue
 */
export const changePassword = async (newPassword: string): Promise<void> => {
  try {
    if (!auth.currentUser) {
      throw new Error('Aucun utilisateur connecté');
    }

    await updatePassword(auth.currentUser, newPassword);
  } catch (error: any) {
    console.error('Error changing password:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Observe les changements d'état d'authentification
 * 
 * @param callback - Fonction appelée à chaque changement d'état
 * @returns Fonction de nettoyage (unsubscribe)
 */
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(auth, callback);
};

/**
 * Récupère l'utilisateur actuellement connecté
 * 
 * @returns User Firebase ou null
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Vérifie si un utilisateur est connecté
 * 
 * @returns true si connecté
 */
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};

/**
 * Traduit les codes d'erreur Firebase en messages lisibles
 * 
 * @param errorCode - Code d'erreur Firebase
 * @returns Message d'erreur traduit
 */
const getAuthErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'Cet email est déjà utilisé',
    'auth/invalid-email': 'Email invalide',
    'auth/operation-not-allowed': 'Opération non autorisée',
    'auth/weak-password': 'Mot de passe trop faible (min 6 caractères)',
    'auth/user-disabled': 'Ce compte a été désactivé',
    'auth/user-not-found': 'Aucun compte trouvé avec cet email',
    'auth/wrong-password': 'Mot de passe incorrect',
    'auth/invalid-credential': 'Email ou mot de passe incorrect',
    'auth/too-many-requests': 'Veuillez d\'abord vérifier votre email. Consultez votre boîte de réception.',
    'auth/network-request-failed': 'Erreur réseau, vérifiez votre connexion',
    'auth/requires-recent-login': 'Cette opération nécessite une reconnexion récente'
  };

  return errorMessages[errorCode] || 'Erreur d\'authentification inconnue';
};

/**
 * Traduit les codes d'erreur Firebase en anglais
 * 
 * @param errorCode - Code d'erreur Firebase
 * @returns Message d'erreur traduit en anglais
 */
export const getAuthErrorMessageEN = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'This email is already in use',
    'auth/invalid-email': 'Invalid email',
    'auth/operation-not-allowed': 'Operation not allowed',
    'auth/weak-password': 'Password too weak (min 6 characters)',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/too-many-requests': 'Please verify your email first. Check your inbox.',
    'auth/network-request-failed': 'Network error, check your connection',
    'auth/requires-recent-login': 'This operation requires a recent login'
  };

  return errorMessages[errorCode] || 'Unknown authentication error';
};

// Export de sendEmailVerification pour utilisation directe
export { sendEmailVerification } from 'firebase/auth';

