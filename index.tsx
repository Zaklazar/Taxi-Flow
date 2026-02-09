import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useAuth } from '../src/hooks/useAuth';
import { ProfileManager } from '../services/ProfileManager';
import { ExpirationService } from '../services/ExpirationService';
import { RecurringExpenseService } from '../src/services/RecurringExpenseService';

export default function IndexScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) {
      console.log('⏳ Auth en cours de chargement...');
      return;
    }

    const checkAuthAndRedirect = async () => {
      console.log('🔍 Vérification état authentification...');
      
      // Cas 1: Utilisateur non connecté → Login
      if (!user) {
        console.log('❌ Pas d\'utilisateur connecté → /login');
        router.replace('/login');
        return;
      }

      console.log('✅ Utilisateur connecté:', user.uid);
      console.log('📧 Email:', user.email);
      console.log('✅ Email vérifié:', user.emailVerified);

      // Cas 2: Email non vérifié → Écran de vérification
      if (!user.emailVerified) {
        console.log('⚠️ Email non vérifié → /emailVerification');
        router.replace('/emailVerification');
        return;
      }

      // Cas 3: Email vérifié mais pas de profil chauffeur → Compléter profil
      try {
        console.log('🔍 Vérification profil chauffeur...');
        const driverProfile = await ProfileManager.getProfile();
        
        if (!driverProfile || !driverProfile.name || !driverProfile.licenseNumber) {
          console.log('⚠️ Profil chauffeur incomplet → /driverProfile');
          router.replace('/driverProfile');
          return;
        }

        // Cas 4: Tout est OK → Rediriger vers le nouvel écran d'accueil
        console.log('✅ Utilisateur complet, redirection vers /(tabs)/accueil');
        
        // Vérifier les alertes de documents en arrière-plan
        try {
          const alertMsg = await ExpirationService.getAlertMessage(user.uid);
          if (alertMsg) {
            // Les alertes seront affichées dans l'écran d'accueil
            console.log('📋 Alertes documents trouvées:', alertMsg);
          }
        } catch (error) {
          console.error('❌ Erreur vérification alertes documents:', error);
        }
        
        // Vérifier et créer les dépenses récurrentes en arrière-plan
        try {
          const createdCount = await RecurringExpenseService.checkAndCreateRecurringExpenses(user.uid);
          if (createdCount > 0) {
            console.log(`🔁 ${createdCount} dépense(s) récurrente(s) créée(s) automatiquement`);
          }
        } catch (error) {
          console.error('❌ Erreur vérification dépenses récurrentes:', error);
        }
        
        // Rediriger vers le nouvel écran d'accueil blanc
        router.replace('/(tabs)/accueil');
        
      } catch (error) {
        console.error('❌ Erreur vérification profil:', error);
        router.replace('/driverProfile');
      }
    };

    checkAuthAndRedirect();
  }, [user, authLoading]);

  // Écran de chargement minimal
  return null;
}
