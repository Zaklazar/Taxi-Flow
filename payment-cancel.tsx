/**
 * payment-cancel.tsx
 * 
 * Page affichée quand l'utilisateur annule le paiement
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';

export default function PaymentCancelScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icône d'annulation */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons 
            name="close-circle" 
            size={100} 
            color={Colors.warning} 
          />
        </View>

        {/* Titre */}
        <Text style={styles.title}>
          {t('payment.cancelTitle') || 'Paiement annulé'}
        </Text>

        {/* Message */}
        <Text style={styles.message}>
          {t('payment.cancelMessage') || 'Vous avez annulé le paiement. Vous pouvez réessayer à tout moment.'}
        </Text>

        {/* Boutons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.buttonPrimary}
            onPress={() => router.push('/paywall')}
          >
            <Text style={styles.buttonPrimaryText}>
              {t('payment.retry') || 'Réessayer'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.buttonSecondary}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.buttonSecondaryText}>
              {t('payment.returnHome') || 'Retour à l\'accueil'}
            </Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  buttonPrimary: {
    backgroundColor: Colors.primaryBrand,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: Colors.primaryBrand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryBrand,
  },
  buttonSecondaryText: {
    color: Colors.primaryBrand,
    fontSize: 16,
    fontWeight: '600',
  },
});
