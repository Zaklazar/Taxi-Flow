/**
 * InactivityWarningModal.tsx
 * 
 * Modal d'avertissement affiché après 5 minutes d'inactivité.
 * Affiche un compte à rebours de 15 secondes.
 * L'utilisateur doit confirmer qu'il est toujours actif, sinon déconnexion automatique.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const Colors = {
  background: '#18181B',
  card: '#27272A',
  textMain: '#FFFFFF',
  textSub: '#9CA3AF',
  danger: '#EF4444',
  warning: '#F59E0B',
  primaryBrand: '#FBBF24'
};

interface InactivityWarningModalProps {
  visible: boolean;
  remainingSeconds: number;
  onConfirm: () => void;
}

export const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
  visible,
  remainingSeconds,
  onConfirm
}) => {
  const { t } = useTranslation();
  
  // Animation du chronomètre
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  
  React.useEffect(() => {
    if (visible && remainingSeconds <= 5) {
      // Pulse animation pour les 5 dernières secondes
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [remainingSeconds, visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Icône d'avertissement */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons 
              name="clock-alert" 
              size={60} 
              color={Colors.warning} 
            />
          </View>

          {/* Titre */}
          <Text style={styles.title}>
            {t('inactivity.title') || 'Êtes-vous toujours là ?'}
          </Text>

          {/* Message */}
          <Text style={styles.message}>
            {t('inactivity.message') || 'Vous serez déconnecté pour des raisons de sécurité après 5 minutes d\'inactivité.'}
          </Text>

          {/* Chronomètre */}
          <Animated.View 
            style={[
              styles.timerContainer,
              { transform: [{ scale: scaleAnim }] }
            ]}
          >
            <Text style={styles.timerLabel}>
              {t('inactivity.timeRemaining') || 'Temps restant'}
            </Text>
            <Text 
              style={[
                styles.timerValue,
                remainingSeconds <= 5 && styles.timerValueUrgent
              ]}
            >
              {remainingSeconds}
            </Text>
            <Text style={styles.timerUnit}>
              {t('inactivity.seconds') || 'secondes'}
            </Text>
          </Animated.View>

          {/* Bouton de confirmation */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={onConfirm}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FBBF24', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmButtonGradient}
            >
              <MaterialCommunityIcons 
                name="check-circle" 
                size={24} 
                color="#FFF" 
              />
              <Text style={styles.confirmButtonText}>
                {t('inactivity.confirm') || 'Oui, je suis là !'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Info supplémentaire */}
          <Text style={styles.info}>
            {t('inactivity.info') || 'Appuyez pour continuer votre session'}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 10,
    borderWidth: 2,
    borderColor: Colors.warning
  },
  iconContainer: {
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textMain,
    marginBottom: 12,
    textAlign: 'center'
  },
  message: {
    fontSize: 15,
    color: Colors.textSub,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30
  },
  timerContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 25,
    width: '100%',
    borderWidth: 2,
    borderColor: Colors.warning
  },
  timerLabel: {
    fontSize: 14,
    color: Colors.textSub,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  timerValue: {
    fontSize: 72,
    fontWeight: 'bold',
    color: Colors.warning,
    lineHeight: 80
  },
  timerValueUrgent: {
    color: Colors.danger
  },
  timerUnit: {
    fontSize: 16,
    color: Colors.textSub,
    marginTop: 4
  },
  confirmButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    marginBottom: 15
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF'
  },
  info: {
    fontSize: 12,
    color: Colors.textSub,
    textAlign: 'center'
  }
});
