import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { sendEmailVerification } from 'firebase/auth';

const Colors = {
  background: '#18181B',
  card: '#27272A',
  textMain: '#FFFFFF',
  textSub: '#9CA3AF',
  gold: '#FBBF24',
  success: '#22C55E',
  danger: '#EF4444'
};

export default function EmailVerificationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);

  // Vérifier périodiquement si l'email est vérifié
  useEffect(() => {
    const interval = setInterval(async () => {
      if (user) {
        console.log('🔄 Vérification automatique emailVerified...');
        await user.reload();
        
        // CORRECTION: Utiliser auth.currentUser pour récupérer l'état le plus récent
        const { auth } = await import('../src/services/firebaseConfig');
        const currentUser = auth.currentUser;
        
        if (currentUser && currentUser.emailVerified) {
          console.log('✅ Email vérifié détecté via currentUser');
          clearInterval(interval);
          Alert.alert(
            '✅ Email vérifié',
            'Votre courriel a été confirmé avec succès ! Veuillez compléter votre profil chauffeur.',
            [
              {
                text: 'Continuer',
                onPress: () => router.replace('/driverProfile')
              }
            ]
          );
        }
      }
    }, 3000); // Vérifier toutes les 3 secondes

    return () => clearInterval(interval);
  }, [user]);

  // Countdown pour le bouton renvoyer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Rediriger vers login si pas d'utilisateur connecté
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user]);

  const handleCheckVerification = async () => {
    if (!user) return;

    setChecking(true);
    
    try {
      console.log('🔄 Vérification manuelle emailVerified...');
      await user.reload();
      
      // CORRECTION: Récupérer l'état le plus récent depuis auth.currentUser
      const { auth } = await import('../src/services/firebaseConfig');
      const currentUser = auth.currentUser;
      
      if (currentUser && currentUser.emailVerified) {
        console.log('✅ Email vérifié via currentUser');
        Alert.alert(
          '✅ Email vérifié',
          'Votre courriel a été confirmé avec succès !',
          [
            {
              text: 'Continuer',
              onPress: () => router.replace('/driverProfile')
            }
          ]
        );
      } else {
        console.log('⚠️ Email toujours non vérifié');
        Alert.alert(
          'Email non vérifié',
          'Veuillez vérifier votre boîte de réception et cliquer sur le lien de confirmation.\n\nPensez à vérifier vos courriers indésirables (spam).'
        );
      }
    } catch (error) {
      console.error('❌ Erreur vérification:', error);
      Alert.alert('Erreur', 'Impossible de vérifier le statut de votre email');
    } finally {
      setChecking(false);
    }
  };

  const handleResendEmail = async () => {
    if (!user || !canResend) return;

    try {
      await sendEmailVerification(user);
      console.log('✅ Email de vérification renvoyé');
      
      Alert.alert(
        '✅ Email envoyé',
        'Un nouveau courriel de vérification a été envoyé à votre adresse.'
      );

      // Bloquer le bouton pendant 60 secondes
      setCanResend(false);
      setCountdown(60);
      
    } catch (error: any) {
      console.error('❌ Erreur renvoi email:', error);
      
      let errorMessage = 'Impossible de renvoyer le courriel';
      
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives. Veuillez patienter quelques minutes.';
      }
      
      Alert.alert('Erreur', errorMessage);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vous déconnecter ? Vous devrez vous reconnecter pour compléter l\'inscription.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: () => router.replace('/login')
        }
      ]
    );
  };

  // Afficher un écran de chargement si pas d'utilisateur (avant la redirection)
  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <View style={styles.content}>
        {/* Icône */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="email-check-outline" size={100} color={Colors.gold} />
        </View>

        {/* Titre */}
        <Text style={styles.title}>Vérifiez votre courriel</Text>
        
        {/* Message */}
        <Text style={styles.message}>
          Un courriel de vérification a été envoyé à :
        </Text>
        <Text style={styles.email}>{user.email}</Text>
        
        <Text style={styles.instructions}>
          Veuillez cliquer sur le lien dans le courriel pour confirmer votre adresse.
          {'\n\n'}
          Une fois confirmé, vous pourrez compléter votre profil chauffeur.
        </Text>

        {/* Bouton vérifier */}
        <TouchableOpacity 
          style={styles.checkButton}
          onPress={handleCheckVerification}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <>
              <MaterialCommunityIcons name="refresh" size={20} color={Colors.background} />
              <Text style={styles.checkButtonText}>J'ai vérifié mon email</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Bouton renvoyer */}
        <TouchableOpacity 
          style={[styles.resendButton, !canResend && styles.resendButtonDisabled]}
          onPress={handleResendEmail}
          disabled={!canResend}
        >
          <MaterialCommunityIcons 
            name="email-sync-outline" 
            size={20} 
            color={canResend ? Colors.gold : Colors.textSub} 
          />
          <Text style={[styles.resendButtonText, !canResend && styles.resendButtonTextDisabled]}>
            {canResend ? 'Renvoyer le courriel' : `Renvoyer dans ${countdown}s`}
          </Text>
        </TouchableOpacity>

        {/* Note spam */}
        <View style={styles.note}>
          <MaterialCommunityIcons name="information-outline" size={16} color={Colors.textSub} />
          <Text style={styles.noteText}>
            Si vous ne voyez pas le courriel, vérifiez vos courriers indésirables (spam).
          </Text>
        </View>

        {/* Déconnexion */}
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center'
  },
  iconContainer: {
    marginBottom: 30
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textMain,
    marginBottom: 16,
    textAlign: 'center'
  },
  message: {
    fontSize: 16,
    color: Colors.textSub,
    textAlign: 'center',
    marginBottom: 8
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gold,
    marginBottom: 24,
    textAlign: 'center'
  },
  instructions: {
    fontSize: 15,
    color: Colors.textSub,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40
  },
  checkButton: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
    width: '100%'
  },
  checkButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.background
  },
  resendButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.gold,
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
    width: '100%'
  },
  resendButtonDisabled: {
    borderColor: Colors.textSub,
    opacity: 0.5
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gold
  },
  resendButtonTextDisabled: {
    color: Colors.textSub
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 40,
    gap: 8
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSub,
    lineHeight: 18
  },
  signOutButton: {
    padding: 12
  },
  signOutText: {
    fontSize: 16,
    color: Colors.textSub,
    textDecorationLine: 'underline'
  }
});
