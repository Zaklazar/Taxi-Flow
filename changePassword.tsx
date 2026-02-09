import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { auth } from '../src/services/firebaseConfig';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useTheme } from '../contexts/ThemeContext';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePasswords = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('changePassword.allFieldsRequired'));
      return false;
    }
    
    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('changePassword.passwordTooShort'));
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('changePassword.passwordsNotMatch'));
      return false;
    }
    
    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePasswords()) return;
    
    setLoading(true);
    
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Utilisateur non connecté');
      }
      
      // Réauthentifier l'utilisateur
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Changer le mot de passe
      await updatePassword(user, newPassword);
      
      Alert.alert(
        t('common.success'),
        t('changePassword.passwordChangedSuccess'),
        [
          { text: t('common.ok'), onPress: () => router.back() }
        ]
      );
      
    } catch (error: any) {
      console.error('Erreur changement mot de passe:', error);
      
      let errorMessage = t('changePassword.generalError');
      if (error.code === 'auth/wrong-password') {
        errorMessage = t('changePassword.currentPasswordIncorrect');
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = t('changePassword.tooManyRequests');
      }
      
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fonction de styles dynamiques basée sur le thème
  const getStyles = (colors: any) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 15,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginLeft: 15,
    },
    backBtn: {
      padding: 5,
    },
    content: {
      padding: 20,
    },
    form: {
      gap: 20,
    },
    inputGroup: {
      gap: 8,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingVertical: 16,
    },
    eyeButton: {
      padding: 8,
      marginLeft: 8,
    },
    requirements: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginTop: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    requirementsTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    requirementItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    requirementText: {
      fontSize: 14,
      color: colors.textLight,
      marginLeft: 8,
    },
    submitButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 18,
      alignItems: 'center',
      marginTop: 30,
      shadowColor: colors.accent,
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 3,
    },
    submitButtonText: {
      color: colors.card,
      fontSize: 16,
      fontWeight: 'bold',
    },
    submitButtonDisabled: {
      backgroundColor: colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },
  });

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('changePassword.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.form}>
          {/* Mot de passe actuel */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('changePassword.currentPassword')}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={t('changePassword.currentPasswordPlaceholder')}
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={loading}
              >
                <MaterialCommunityIcons 
                  name={showCurrentPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color={colors.textLight} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Nouveau mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('changePassword.newPassword')}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t('changePassword.newPasswordPlaceholder')}
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
                disabled={loading}
              >
                <MaterialCommunityIcons 
                  name={showNewPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color={colors.textLight} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirmer le mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('changePassword.confirmPassword')}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('changePassword.confirmPasswordPlaceholder')}
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                <MaterialCommunityIcons 
                  name={showConfirmPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color={colors.textLight} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Exigences du mot de passe */}
          <View style={styles.requirements}>
            <Text style={styles.requirementsTitle}>{t('changePassword.requirements')}</Text>
            
            <View style={styles.requirementItem}>
              <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
              <Text style={styles.requirementText}>{t('changePassword.requirementMinLength')}</Text>
            </View>
            
            <View style={styles.requirementItem}>
              <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
              <Text style={styles.requirementText}>{t('changePassword.requirementLettersNumbers')}</Text>
            </View>
            
            <View style={styles.requirementItem}>
              <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
              <Text style={styles.requirementText}>{t('changePassword.requirementSpecialChars')}</Text>
            </View>
          </View>

          {/* Bouton de soumission */}
          <TouchableOpacity 
            style={[
              styles.submitButton,
              (!currentPassword || !newPassword || !confirmPassword || loading) && styles.submitButtonDisabled
            ]}
            onPress={handleChangePassword}
            disabled={!currentPassword || !newPassword || !confirmPassword || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={styles.submitButtonText}>{t('changePassword.changePasswordButton')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
