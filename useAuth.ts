/**
 * useAuth.ts
 * 
 * Hook React personnalisé pour gérer l'authentification Firebase dans TaxiFlow.
 * Simplifie l'utilisation de AuthService dans les composants React Native.
 * 
 * Fonctionnalités :
 * - État d'authentification en temps réel
 * - Chargement du profil chauffeur
 * - Fonctions de connexion/déconnexion/inscription
 * - Gestion des erreurs traduites
 * 
 * @example
 * const { user, profile, loading, signIn, signUp, signOut } = useAuth();
 * 
 * if (loading) return <Spinner />;
 * if (!user) return <LoginScreen />;
 * return <Dashboard profile={profile} />;
 */

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithEmail,
  signUpWithEmail,
  signOut as authSignOut,
  resetPassword,
  signInAnonymouslyDemo,
  getDriverProfile,
  updateDriverProfile,
  getCurrentUser,
  DriverProfile,
  SignUpData
} from '../services/AuthService';

interface UseAuthReturn {
  user: User | null;
  profile: DriverProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  signInDemo: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<DriverProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Observer l'état d'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (authUser) => {
      setUser(authUser);

      if (authUser) {
        // Charger le profil depuis Firestore
        try {
          const driverProfile = await getDriverProfile(authUser.uid);
          setProfile(driverProfile);
        } catch (err) {
          console.error('Error loading profile:', err);
          setError('Erreur lors du chargement du profil');
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    // Cleanup
    return () => unsubscribe();
  }, []);

  // Connexion avec email/password
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔐 useAuth: Début signIn...');
      await signInWithEmail(email, password);
      console.log('✅ useAuth: signInWithEmail terminé');
      
      // CORRECTION: Forcer le rafraîchissement de l'état utilisateur
      const currentUser = getCurrentUser();
      if (currentUser) {
        console.log('🔄 useAuth: Rafraîchissement user...');
        await currentUser.reload();
        console.log('✅ useAuth: emailVerified =', currentUser.emailVerified);
      }
      
    } catch (err: any) {
      console.error('❌ useAuth: Erreur signIn:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Inscription
  const signUp = async (email: string, password: string, data: SignUpData): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await signUpWithEmail(email, password, data);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Déconnexion
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await authSignOut();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Connexion en mode démo
  const signInDemo = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await signInAnonymouslyDemo();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Réinitialiser le mot de passe
  const resetPasswordFunc = async (email: string): Promise<void> => {
    try {
      setError(null);
      await resetPassword(email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Mettre à jour le profil
  const updateProfile = async (updates: Partial<DriverProfile>): Promise<void> => {
    if (!user) {
      throw new Error('Aucun utilisateur connecté');
    }

    try {
      setError(null);
      await updateDriverProfile(user.uid, updates);
      
      // Rafraîchir le profil local
      const updatedProfile = await getDriverProfile(user.uid);
      setProfile(updatedProfile);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Rafraîchir le profil depuis Firestore
  const refreshProfile = async (): Promise<void> => {
    if (!user) return;

    try {
      const updatedProfile = await getDriverProfile(user.uid);
      setProfile(updatedProfile);
    } catch (err: any) {
      console.error('Error refreshing profile:', err);
      setError('Erreur lors du rafraîchissement du profil');
    }
  };

  return {
    user,
    profile,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInDemo,
    resetPassword: resetPasswordFunc,
    updateProfile,
    refreshProfile
  };
};
