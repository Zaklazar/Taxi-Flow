import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { SubscriptionService } from '../services/SubscriptionService';

interface UseSubscriptionGuardResult {
  canProceed: boolean;
  isLoading: boolean;
  remaining: number;
  checkAndProceed: () => Promise<boolean>;
}

/**
 * Hook pour protéger les fonctionnalités nécessitant un abonnement actif
 * Vérifie automatiquement les quotas et redirige vers le paywall si nécessaire
 * 
 * @param autoCheck - Si true, vérifie automatiquement au montage du composant
 * @returns État de l'abonnement et fonction de vérification
 * 
 * @example
 * const { canProceed, checkAndProceed } = useSubscriptionGuard();
 * 
 * const handleScan = async () => {
 *   const allowed = await checkAndProceed();
 *   if (!allowed) return;
 *   // Continuer avec le scan
 * }
 */
export const useSubscriptionGuard = (autoCheck: boolean = false): UseSubscriptionGuardResult => {
  const router = useRouter();
  const [canProceed, setCanProceed] = useState(true);
  const [isLoading, setIsLoading] = useState(autoCheck);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (autoCheck) {
      performCheck();
    }
  }, [autoCheck]);

  const performCheck = async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const result = await SubscriptionService.canScan();
      setRemaining(result.remaining || 0);
      
      if (!result.allowed) {
        setCanProceed(false);
        
        // Messages selon la raison du blocage
        let title = 'Abonnement requis';
        let message = 'Passez à Premium pour continuer';
        
        if (result.reason === 'trial_expired') {
          title = 'Période d\'essai terminée';
          message = 'Votre période d\'essai de 7 jours est terminée. Passez à Premium pour continuer à utiliser le scanner et la comptabilité.';
        } else if (result.reason === 'trial_quota_exceeded') {
          title = 'Quota d\'essai atteint';
          message = 'Vous avez utilisé vos 30 scans d\'essai. Passez à Premium pour continuer avec 200 scans/mois + mode dépannage.';
        } else if (result.reason === 'daily_quota_exceeded') {
          title = 'Quota journalier atteint';
          message = 'Vous avez atteint votre limite de 5 scans quotidiens en mode dépannage. Revenez demain ou attendez le prochain mois pour plus de scans.';
        }
        
        Alert.alert(
          title,
          message,
          [
            {
              text: 'Voir Premium',
              onPress: () => router.push('/paywall')
            },
            {
              text: 'Plus tard',
              style: 'cancel'
            }
          ]
        );
        
        return false;
      }
      
      setCanProceed(true);
      return true;
    } catch (error) {
      if (__DEV__) console.error('Erreur vérification abonnement:', error);
      // En cas d'erreur, permettre l'accès (fail-safe)
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    canProceed,
    isLoading,
    remaining,
    checkAndProceed: performCheck
  };
};

/**
 * Fonction utilitaire pour incrémenter le compteur de scans après un scan réussi
 * À appeler APRÈS avoir effectué un scan avec succès
 * 
 * @example
 * const success = await scanInvoice();
 * if (success) {
 *   await incrementScanCounter();
 * }
 */
export const incrementScanCounter = async (): Promise<void> => {
  try {
    await SubscriptionService.incrementScanCount();
    if (__DEV__) console.log('✅ Compteur de scans incrémenté');
  } catch (error) {
    if (__DEV__) console.error('❌ Erreur incrémentation scan:', error);
  }
};
