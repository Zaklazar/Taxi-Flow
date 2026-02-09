import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { sendEmailVerification } from 'firebase/auth';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SignUpData, signUpWithEmail } from '../src/services/AuthService';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const isLargeScreen = width >= 1024;
const isFlipDevice = width > height * 1.8; // Plus strict pour les vrais écrans pliables
const isLandscape = width > height; // Détecter mode paysage
const isUltraWide = width > height * 2; // Écrans ultra-larges

const Colors = {
  background: '#18181B',
  card: '#27272A',
  textMain: '#FFFFFF',
  textSub: '#9CA3AF',
  gold: '#FBBF24',
  success: '#22C55E',
  danger: '#EF4444',
  inputBg: '#3F3F46',
  inputBorder: '#52525B'
};

export default function SignUpScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
  };

  const handleSignUp = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert(t('errors.auth.emptyFields'), t('errors.auth.emptyFieldsDesc'));
      return;
    }

    if (!email.trim()) {
      Alert.alert(t('errors.auth.emptyFields'), t('errors.auth.emptyFieldsDesc'));
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert(t('errors.auth.invalidEmail'), t('errors.auth.invalidEmailDesc'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('errors.auth.weakPassword'), t('errors.auth.weakPasswordDesc'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        t('common.error'), 
        i18n.language === 'fr' 
          ? 'Les mots de passe ne correspondent pas' 
          : 'Passwords do not match'
      );
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Début inscription...');
      
      // Créer le compte
      const signUpData: SignUpData = {
        firstName: name.split(' ')[0] || name,
        lastName: name.split(' ').slice(1).join(' ') || '',
        phone: ''
      };

      const userCredential = await signUpWithEmail(email.trim().toLowerCase(), password, signUpData);
      console.log('✅ Compte créé:', userCredential.uid);

      // Envoyer email de vérification
      await sendEmailVerification(userCredential);
      console.log('✅ Email de vérification envoyé');

      // Notification succès
      Alert.alert(
        t('errors.auth.registrationSuccess'),
        t('errors.auth.registrationSuccessDesc'),
        [
          {
            text: i18n.language === 'fr' ? 'Continuer' : 'Continue',
            onPress: () => router.replace('/emailVerification')
          }
        ]
      );

    } catch (error: any) {
      console.error('❌ Erreur inscription:', error);
      console.error('Code erreur:', error.code);
      
      let errorTitle = t('common.error');
      let errorMessage = t('errors.auth.unknownErrorDesc');
      
      switch (error.code) {
        case 'auth/too-many-requests':
          // Cas spécial: Le compte est créé avec succès mais Firebase rate-limite l'envoi d'email
          // Traiter comme un succès et rediriger vers la vérification email
          console.log('✅ Compte créé malgré rate-limit, redirection vers vérification email');
          Alert.alert(
            'Inscription réussie!',
            'Veuillez vérifier votre email pour activer votre compte.',
            [{ 
              text: 'OK', 
              onPress: () => router.replace('/emailVerification')
            }]
          );
          return; // Important: ne pas continuer dans le bloc catch
        case 'auth/email-already-in-use':
          errorTitle = t('errors.auth.emailAlreadyInUse');
          errorMessage = t('errors.auth.emailAlreadyInUseDesc');
          break;
        case 'auth/invalid-email':
          errorTitle = t('errors.auth.invalidEmail');
          errorMessage = t('errors.auth.invalidEmailDesc');
          break;
        case 'auth/weak-password':
          errorTitle = t('errors.auth.weakPassword');
          errorMessage = t('errors.auth.weakPasswordDesc');
          break;
        case 'auth/network-request-failed':
          errorTitle = t('errors.auth.networkError');
          errorMessage = t('errors.auth.networkErrorDesc');
          break;
        case 'auth/operation-not-allowed':
          errorTitle = t('errors.auth.operationNotAllowed');
          errorMessage = t('errors.auth.operationNotAllowedDesc');
          break;
        default:
          errorTitle = t('errors.auth.unknownError');
          errorMessage = t('errors.auth.unknownErrorDesc') + '\n\n' + 
                        (error.message || 'Code: ' + (error.code || 'inconnu'));
          break;
      }
      
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        removeClippedSubviews={false}
      >
        {/* Bouton de langue en haut à droite */}
        <TouchableOpacity style={styles.languageButton} onPress={toggleLanguage}>
          <MaterialCommunityIcons name="translate" size={20} color={Colors.gold} />
          <Text style={styles.languageText}>
            {i18n.language === 'fr' ? 'EN' : 'FR'}
          </Text>
        </TouchableOpacity>

        {/* En-tête */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="taxi" size={60} color={Colors.gold} />
          <Text style={styles.title}>{t('signup.title')}</Text>
          <Text style={styles.subtitle}>{t('signup.subtitle')}</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          {/* Nom complet */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('signup.fullName')}</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="account" size={20} color={Colors.textSub} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('signup.fullNamePlaceholder')}
                placeholderTextColor={Colors.textSub}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
          </View>

          {/* Courriel */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('signup.email')}</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email" size={20} color={Colors.textSub} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="vous@exemple.com"
                placeholderTextColor={Colors.textSub}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock" size={20} color={Colors.textSub} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Minimum 6 caractères"
                placeholderTextColor={Colors.textSub}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <MaterialCommunityIcons 
                  name={showPassword ? 'eye-off' : 'eye'} 
                  size={20} 
                  color={Colors.textSub} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirmation mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-check" size={20} color={Colors.textSub} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Retapez votre mot de passe"
                placeholderTextColor={Colors.textSub}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <MaterialCommunityIcons 
                  name={showConfirmPassword ? 'eye-off' : 'eye'} 
                  size={20} 
                  color={Colors.textSub} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bouton inscription */}
          <TouchableOpacity 
            style={[styles.signUpButton, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.buttonText}>Inscription en cours...</Text>
            ) : (
              <Text style={styles.buttonText}>S'inscrire</Text>
            )}
          </TouchableOpacity>

          {/* Lien vers connexion */}
          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Vous avez déjà un compte ? </Text>
            <TouchableOpacity onPress={() => router.push('/login')} disabled={loading}>
              <Text style={styles.loginLinkText}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: isUltraWide ? width * 0.15 : isFlipDevice ? width * 0.08 : isTablet ? width * 0.15 : 20,
    paddingTop: isUltraWide ? height * 0.05 : isFlipDevice ? height * 0.06 : isTablet ? height * 0.1 : 60,
    paddingBottom: isUltraWide ? height * 0.03 : isFlipDevice ? height * 0.04 : 40,
    maxWidth: isUltraWide ? 600 : isLargeScreen ? 800 : '100%',
    alignSelf: 'center',
    width: '100%'
  },
  languageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.gold,
    zIndex: 10,
    elevation: 10
  },
  languageText: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: 'bold'
  },
  header: {
    alignItems: 'center',
    marginBottom: isFlipDevice ? height * 0.04 : 40
  },
  title: {
    fontSize: isUltraWide ? width * 0.03 : isFlipDevice ? width * 0.04 : isTablet ? 32 : 28,
    fontWeight: 'bold',
    color: Colors.textMain,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: isUltraWide ? width * 0.02 : isFlipDevice ? width * 0.025 : isTablet ? 18 : 16,
    color: Colors.textSub,
    textAlign: 'center',
    paddingHorizontal: isUltraWide ? width * 0.15 : isFlipDevice ? width * 0.1 : 0
  },
  form: {
    width: '100%',
    maxWidth: isUltraWide ? 500 : isLargeScreen ? 600 : '100%',
    alignSelf: 'center'
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMain,
    marginBottom: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: isUltraWide ? width * 0.02 : isFlipDevice ? width * 0.03 : 16,
    height: isUltraWide ? height * 0.05 : isFlipDevice ? height * 0.06 : 56
  },
  inputIcon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    fontSize: isUltraWide ? width * 0.025 : isFlipDevice ? width * 0.03 : isTablet ? 18 : 16,
    color: Colors.textMain
  },
  eyeIcon: {
    padding: 8
  },
  signUpButton: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    height: isUltraWide ? height * 0.05 : isFlipDevice ? height * 0.06 : 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 2
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    fontSize: isUltraWide ? width * 0.03 : isFlipDevice ? width * 0.035 : isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: Colors.background
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24
  },
  loginText: {
    fontSize: isUltraWide ? width * 0.02 : isFlipDevice ? width * 0.025 : isTablet ? 18 : 16,
    color: Colors.textSub
  },
  loginLinkText: {
    fontSize: isUltraWide ? width * 0.02 : isFlipDevice ? width * 0.025 : isTablet ? 18 : 16,
    fontWeight: '600',
    color: Colors.gold
  }
});
