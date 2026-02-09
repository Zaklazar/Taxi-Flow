import { Stack, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { InteractionManager, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { InactivityWarningModal } from '../components/InactivityWarningModal';
import { NetworkIndicator } from '../components/NetworkIndicator';
import { ThemeProvider } from '../contexts/ThemeContext';
import '../i18n';
import { OfflineManager } from '../services/OfflineManager';
import { SupabaseAuthProvider } from '../src/contexts/SupabaseAuthContext';
import { useAuth } from '../src/hooks/useAuth';
import { useInactivityTimer } from '../src/hooks/useInactivityTimer';
import '../src/utils/logger';

export default function RootLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Initialiser le système offline uniquement sur mobile
  useEffect(() => {
    if (Platform.OS !== 'web') {
      const task = InteractionManager.runAfterInteractions(() => {
        OfflineManager.initialize().catch(error => {
          console.error('❌ Erreur initialisation OfflineManager:', error);
        });
      });
      return () => task.cancel();
    }
  }, []);

  // Détecter l'inactivité uniquement sur mobile et si l'utilisateur est connecté
  const { showWarning, remainingSeconds, confirmActivity, resetTimer } = useInactivityTimer({
    onLogout: async () => {
      console.log('🔐 Déconnexion automatique après inactivité');
      await signOut();
      router.replace('/login');
    },
    inactivityTimeout: 5 * 60 * 1000, // 5 minutes
    warningTimeout: 15 * 1000, // 15 secondes
    enabled: Platform.OS !== 'web' && !!user // Activer uniquement sur mobile et si connecté
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SupabaseAuthProvider>
        <ThemeProvider>
          {/* Indicateur de connexion réseau uniquement sur mobile */}
          {user && Platform.OS !== 'web' && <NetworkIndicator position="top" showDetails />}
          
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="emailVerification" options={{ headerShown: false }} />
            <Stack.Screen name="driverProfile" options={{ title: 'Profil Chauffeur' }} />
            <Stack.Screen name="settings" options={{ title: t('navigation.settings') }} />
            <Stack.Screen name="rondeSecurite" options={{ title: t('navigation.safetyRound') }} />
            <Stack.Screen name="accidentMenu" options={{ title: t('navigation.accidentReport') }} />
            <Stack.Screen name="diagnostic" options={{ title: t('navigation.diagnostic') }} />
            <Stack.Screen name="faq" options={{ title: t('navigation.faq') }} />
            <Stack.Screen name="legal" options={{ title: t('navigation.legal') }} />
            <Stack.Screen name="securite" options={{ title: t('navigation.security') }} />
            <Stack.Screen name="scanFacture" options={{ title: t('navigation.scanInvoice') }} />
            <Stack.Screen name="add-expense" options={{ title: t('navigation.addExpense') }} />
            <Stack.Screen name="scanConducteur" options={{ title: t('navigation.scanLicense') }} />
            <Stack.Screen name="photosDommages" options={{ title: t('navigation.damagePhotos') }} />
            <Stack.Screen name="croquisAccident" options={{ title: t('navigation.accidentSketch') }} />
            <Stack.Screen name="rondeSecuriteCalendrier" options={{ title: t('navigation.roundsCalendar') }} />
            <Stack.Screen name="paywall" options={{ headerShown: false }} />
            <Stack.Screen name="rapports" options={{ title: t('navigation.reports') }} />
          </Stack>

          {/* Modal d'avertissement d'inactivité uniquement sur mobile */}
          {Platform.OS !== 'web' && (
            <InactivityWarningModal
              visible={showWarning}
              remainingSeconds={remainingSeconds}
              onConfirm={confirmActivity}
            />
          )}
        </ThemeProvider>
      </SupabaseAuthProvider>
    </GestureHandlerRootView>
  );
}
