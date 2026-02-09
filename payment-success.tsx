/**
 * payment-success.tsx
 * 
 * Page affichée après un paiement Stripe réussi
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
    console.log('✅ Paiement réussi! Session ID:', session_id);
  }, [session_id]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icône de succès */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons 
            name="check-circle" 
            size={100} 
            color={Colors.success} 
          />
        </View>

        {/* Titre */}
        <Text style={styles.title}>
          {t('payment.successTitle') || 'Paiement réussi!'}
        </Text>

        {/* Message */}
        <Text style={styles.message}>
          {t('payment.successMessage') || 'Votre abonnement a été activé avec succès. Vous pouvez maintenant profiter de toutes les fonctionnalités premium.'}
        </Text>

        {/* Session ID (pour debug) */}
        {session_id && (
          <Text style={styles.sessionId}>
            Session: {session_id}
          </Text>
        )}

        {/* Bouton retour */}
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.buttonText}>
            {t('payment.returnHome') || 'Retour à l\'accueil'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textMain,
    textAlign: 'center',
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sessionId: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 30,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: Colors.primaryBrand,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    elevation: 3,
    shadowColor: Colors.primaryBrand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
