/**
 * useSafeRouter.ts
 * 
 * Hook personnalisé pour une navigation sécurisée.
 * Évite les erreurs "GO_BACK" quand il n'y a pas d'historique de navigation.
 * 
 * @example
 * const router = useSafeRouter();
 * router.safeBack(); // Retourne à l'accueil si pas d'historique
 */

import { useRouter } from 'expo-router';

export const useSafeRouter = () => {
  const router = useRouter();

  const safeBack = () => {
    try {
      // Vérifier si on peut retourner en arrière
      if (router.canGoBack && router.canGoBack()) {
        router.back();
      } else {
        // Si pas d'historique, rediriger vers l'accueil
        console.log('⚠️ Pas d\'historique de navigation, redirection vers /');
        router.replace('/');
      }
    } catch (error) {
      console.error('❌ Erreur navigation back:', error);
      // Fallback vers l'accueil en cas d'erreur
      router.replace('/');
    }
  };

  return {
    ...router,
    safeBack
  };
};
