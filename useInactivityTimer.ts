/**
 * useInactivityTimer.ts
 * 
 * Hook pour détecter l'inactivité de l'utilisateur et déclencher une déconnexion automatique.
 * 
 * Fonctionnement:
 * - Détecte toute interaction utilisateur (touch, scroll, press)
 * - Après 5 minutes d'inactivité, affiche un popup d'avertissement
 * - L'utilisateur a 15 secondes pour confirmer qu'il est toujours là
 * - Si pas de réponse, déconnexion automatique
 * 
 * @example
 * const { showWarning, remainingSeconds, resetTimer, confirmActivity } = useInactivityTimer({
 *   onLogout: async () => await signOut()
 * });
 */

import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseInactivityTimerOptions {
  onLogout: () => Promise<void>;
  inactivityTimeout?: number; // En millisecondes (défaut: 5 min)
  warningTimeout?: number; // En millisecondes (défaut: 15 sec)
  enabled?: boolean; // Permet d'activer/désactiver le timer
}

interface UseInactivityTimerReturn {
  showWarning: boolean;
  remainingSeconds: number;
  resetTimer: () => void;
  confirmActivity: () => void;
}

export const useInactivityTimer = ({
  onLogout,
  inactivityTimeout = 5 * 60 * 1000, // 5 minutes
  warningTimeout = 15 * 1000, // 15 secondes
  enabled = true
}: UseInactivityTimerOptions): UseInactivityTimerReturn => {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(15);
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Nettoyer tous les timers
  const clearAllTimers = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // Démarrer le compte à rebours de 15 secondes
  const startWarningCountdown = () => {
    setRemainingSeconds(Math.floor(warningTimeout / 1000));
    setShowWarning(true);
    
    let secondsLeft = Math.floor(warningTimeout / 1000);
    
    // Intervalle pour décrémenter chaque seconde
    countdownIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      setRemainingSeconds(secondsLeft);
      
      if (secondsLeft <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      }
    }, 1000);
    
    // Timer pour déconnexion après 15 secondes
    warningTimerRef.current = setTimeout(async () => {
      console.log('⏱️ Temps écoulé - Déconnexion automatique');
      clearAllTimers();
      setShowWarning(false);
      await onLogout();
    }, warningTimeout);
  };

  // Réinitialiser le timer d'inactivité
  const resetTimer = () => {
    if (!enabled) return;
    
    // Nettoyer le timer existant
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Ne pas réinitialiser si le popup d'avertissement est déjà affiché
    if (showWarning) return;
    
    // Démarrer un nouveau timer de 5 minutes
    inactivityTimerRef.current = setTimeout(() => {
      console.log('⏱️ 5 minutes d\'inactivité détectées - Affichage avertissement');
      startWarningCountdown();
    }, inactivityTimeout);
  };

  // Confirmer que l'utilisateur est toujours actif
  const confirmActivity = () => {
    console.log('✅ Utilisateur a confirmé son activité');
    clearAllTimers();
    setShowWarning(false);
    resetTimer(); // Redémarrer le timer de 5 minutes
  };

  // Observer l'état de l'application (foreground/background)
  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // L'app revient au premier plan - réinitialiser le timer
        console.log('📱 App revenue au premier plan - Reset timer');
        clearAllTimers();
        setShowWarning(false);
        resetTimer();
      } else if (nextAppState.match(/inactive|background/)) {
        // L'app passe en arrière-plan - arrêter les timers
        console.log('📱 App en arrière-plan - Pause timers');
        clearAllTimers();
        setShowWarning(false);
      }
      
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [enabled]);

  // Démarrer le timer au montage du hook
  useEffect(() => {
    if (enabled) {
      console.log('🕐 Timer d\'inactivité démarré (5 min)');
      resetTimer();
    }

    return () => {
      console.log('🛑 Nettoyage timer d\'inactivité');
      clearAllTimers();
    };
  }, [enabled]);

  return {
    showWarning,
    remainingSeconds,
    resetTimer,
    confirmActivity
  };
};
