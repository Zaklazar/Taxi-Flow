import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Dimensions, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';

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

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { signIn, user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

  // Charger les credentials sauvegardés au montage
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('@login_email');
      const savedRemember = await AsyncStorage.getItem('@login_remember');
      
      if (savedEmail && savedRemember === 'true') {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Erreur chargement credentials:', error);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert(t('errors.auth.emptyFields'), t('errors.auth.emptyFieldsDesc'));
      return;
    }

    if (!password) {
      Alert.alert(t('errors.auth.emptyFields'), t('errors.auth.emptyFieldsDesc'));
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Début connexion...');
      await signIn(email.trim().toLowerCase(), password);
      console.log('✅ SignIn Firebase terminé');
      
      // Sauvegarder les credentials si "Se souvenir de moi" est coché
      if (rememberMe) {
        await AsyncStorage.setItem('@login_email', email.trim().toLowerCase());
        await AsyncStorage.setItem('@login_remember', 'true');
      } else {
        await AsyncStorage.removeItem('@login_email');
        await AsyncStorage.removeItem('@login_remember');
      }
      
      // Redirection immédiate vers index qui gérera emailVerification ou driverProfile
      console.log('➡️ Redirection vers /');
      router.replace('/');
      
    } catch (error: any) {
      console.error('❌ Erreur connexion:', error);
      console.error('Code erreur:', error?.code || 'Pas de code');
      console.error('Message:', error?.message || error);
      
      let errorTitle = t('common.error');
      let errorMessage = t('errors.auth.unknownErrorDesc');
      
      const errorCode = error?.code || '';
      
      switch (errorCode) {
        case 'auth/invalid-email':
          errorTitle = t('errors.auth.invalidEmail');
          errorMessage = t('errors.auth.invalidEmailDesc');
          break;
        case 'auth/user-not-found':
          errorTitle = t('errors.auth.userNotFound');
          errorMessage = t('errors.auth.userNotFoundDesc');
          break;
        case 'auth/wrong-password':
          errorTitle = t('errors.auth.wrongPassword');
          errorMessage = t('errors.auth.wrongPasswordDesc');
          break;
        case 'auth/too-many-requests':
          errorTitle = t('errors.auth.tooManyRequests');
          errorMessage = t('errors.auth.tooManyRequestsDesc');
          break;
        case 'auth/user-disabled':
          errorTitle = t('errors.auth.accountDisabled');
          errorMessage = t('errors.auth.accountDisabledDesc');
          break;
        case 'auth/invalid-credential':
          errorTitle = t('errors.auth.invalidCredential');
          errorMessage = t('errors.auth.invalidCredentialDesc');
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{flex: 1}}>
          <Stack.Screen options={{ headerShown: false }} />
          <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
          
          {/* Bouton langue */}
          <TouchableOpacity style={styles.languageButton} onPress={toggleLanguage}>
            <MaterialCommunityIcons name="translate" size={20} color={Colors.gold} />
            <Text style={styles.languageText}>
              {i18n.language === 'fr' ? 'EN' : 'FR'}
            </Text>
          </TouchableOpacity>
          
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            removeClippedSubviews={false}
          >
        {/* En-tête */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="taxi" size={80} color={Colors.gold} />
          <Text style={styles.title}>{t('login.title')}</Text>
          <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          {/* Courriel */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('login.email')}</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email" size={20} color={Colors.textSub} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor={Colors.textSub}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('login.password')}</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock" size={20} color={Colors.textSub} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('login.passwordPlaceholder')}
                placeholderTextColor={Colors.textSub}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                blurOnSubmit={true}
                ref={passwordInputRef}
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

          {/* Se souvenir de moi */}
          <TouchableOpacity 
            style={styles.rememberMeContainer}
            onPress={() => setRememberMe(!rememberMe)}
            disabled={loading}
          >
            <MaterialCommunityIcons 
              name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'} 
              size={24} 
              color={rememberMe ? Colors.gold : Colors.textSub} 
            />
            <Text style={styles.rememberMeText}>{t('login.rememberMe')}</Text>
          </TouchableOpacity>

          {/* Bouton connexion */}
          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.buttonText}>{t('login.loginInProgress')}</Text>
            ) : (
              <Text style={styles.buttonText}>{t('login.loginButton')}</Text>
            )}
          </TouchableOpacity>

          {/* Mot de passe oublié */}
          <TouchableOpacity 
            onPress={() => Alert.alert('Réinitialisation', 'Fonction à venir')}
            disabled={loading}
            style={styles.forgotPassword}
          >
            <Text style={styles.forgotPasswordText}>{t('login.forgotPassword')}</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('login.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Bouton inscription */}
          <TouchableOpacity 
            style={styles.signUpButton}
            onPress={() => router.push('/signup')}
            disabled={loading}
          >
            <MaterialCommunityIcons name="account-plus" size={20} color={Colors.gold} />
            <Text style={styles.signUpButtonText}>{t('login.createAccount')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
        </View>
      </TouchableWithoutFeedback>
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
    paddingHorizontal: isUltraWide ? width * 0.15 : isFlipDevice ? width * 0.08 : isTablet ? width * 0.15 : 24,
    paddingTop: isUltraWide ? height * 0.05 : isFlipDevice ? height * 0.06 : isTablet ? height * 0.1 : 80,
    paddingBottom: isUltraWide ? height * 0.03 : isFlipDevice ? height * 0.04 : 40,
    maxWidth: isUltraWide ? 600 : isLargeScreen ? 800 : '100%',
    alignSelf: 'center',
    width: '100%'
  },
  header: {
    alignItems: 'center',
    marginBottom: isFlipDevice ? height * 0.05 : 50
  },
  title: {
    fontSize: isUltraWide ? width * 0.04 : isFlipDevice ? width * 0.05 : isTablet ? 40 : 36,
    fontWeight: 'bold',
    color: Colors.gold,
    marginTop: 16,
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
  loginButton: {
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
  forgotPassword: {
    alignSelf: 'center',
    marginTop: 16
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.textSub,
    textDecorationLine: 'underline'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.inputBorder
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: Colors.textSub
  },
  signUpButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.gold,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 2
  },
  signUpButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gold
  },
  languageButton: {
    position: 'absolute',
    top: 50,
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
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16
  },
  rememberMeText: {
    fontSize: 14,
    color: Colors.textMain
  }
});
