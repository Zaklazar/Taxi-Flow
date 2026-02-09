import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ProfileManager } from '../services/ProfileManager';
import { useAuth } from '../src/hooks/useAuth';

const Colors = {
  background: '#18181B',
  card: '#27272A',
  textMain: '#FFFFFF',
  textSub: '#9CA3AF',
  gold: '#FBBF24',
  success: '#22C55E'
};

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { signOut } = useAuth();

  const handleDeleteAccount = () => {
    // Redirection vers la page de contact pour demander la suppression
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `${t('settings.deleteConfirmTitle')}\n\n${t('settings.deleteAccountRedirectMessage')}`
      );
      if (confirmed) {
        Linking.openURL('https://taxi-flow.com/contact');
      }
    } else {
      Alert.alert(
        t('settings.deleteConfirmTitle'),
        t('settings.deleteAccountRedirectMessage'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('settings.contactUs'),
            style: 'default',
            onPress: () => Linking.openURL('https://taxi-flow.com/contact'),
          },
        ]
      );
    }
  };

  const handleForceSignOut = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Déconnexion\n\nVoulez-vous vous déconnecter de votre compte ?'
      );
      if (!confirmed) return;
    } else {
      Alert.alert(
        'Déconnexion',
        'Voulez-vous vous déconnecter de votre compte ?',
        [
          { text: t('common.cancel'), style: 'cancel' },
          { 
            text: 'Déconnecter', 
            style: 'destructive', 
            onPress: executeForceSignOut 
          },
        ]
      );
      return;
    }
    
    if (Platform.OS === 'web') {
      executeForceSignOut();
    }
  };

  const executeForceSignOut = async () => {
    try {
      console.log('🔐 Début déconnexion...');
      
      // 1. Déconnexion Firebase
      await signOut();
      console.log('✅ Firebase signOut OK');
      
      // 2. Nettoyage AsyncStorage (via ProfileManager)
      try {
        await ProfileManager.deleteProfile();
        console.log('✅ AsyncStorage nettoyé');
      } catch (e) {
        console.warn('⚠️ Nettoyage AsyncStorage partiel:', e);
      }
      
      // 3. Notification succès
      if (Platform.OS === 'web') {
        window.alert('✅ Déconnexion réussie. Redirection vers l\'écran de connexion...');
      } else {
        Alert.alert('✅ Déconnexion réussie', 'Vous allez être redirigé vers l\'écran de connexion.');
      }
      
      // 4. Redirection forcée vers login
      setTimeout(() => {
        router.replace('/login');
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Erreur déconnexion forcée:', error);
      
      if (Platform.OS === 'web') {
        window.alert(`Erreur: ${error.message || 'Échec de la déconnexion'}`);
      } else {
        Alert.alert('Erreur', error.message || 'Échec de la déconnexion');
      }
    }
  };



  const handleChangePassword = () => {
    Alert.alert(
      t('settings.changePassword'),
      t('settings.changePasswordDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.continue'), 
          onPress: () => router.push('/changePassword')
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: 'account-edit',
      title: t('settings.profile'),
      onPress: () => router.push('/driverProfile'),
      color: Colors.gold
    },
    {
      icon: 'file-document',
      title: t('settings.documents'),
      onPress: () => router.push('/documents'),
      color: Colors.success
    },
    {
      icon: 'lock-reset',
      title: t('settings.changePassword'),
      onPress: handleChangePassword,
      color: '#F97316'
    },
    {
      icon: 'gavel',
      title: t('settings.legalNotices'),
      onPress: () => router.push('/legal'),
      color: Colors.textSub
    },
    {
      icon: 'help-circle',
      title: t('settings.faq'),
      onPress: () => router.push('/faq'),
      color: Colors.gold
    }
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
            </View>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSub} />
          </TouchableOpacity>
        ))}

        {/* Section Informations & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.infoSupportSection')}</Text>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL('https://taxi-flow.com/privacy-policy')}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="shield-check" size={24} color={Colors.success} />
            </View>
            <Text style={styles.menuTitle}>{t('settings.privacyPolicy')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSub} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL('mailto:support@taxi-flow.com')}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="email-outline" size={24} color={Colors.gold} />
            </View>
            <Text style={styles.menuTitle}>{t('settings.contactSupport')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSub} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleDeleteAccount}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="trash-can" size={24} color="#EF4444" />
            </View>
            <Text style={styles.menuTitle}>{t('settings.deleteAccount')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSub} />
          </TouchableOpacity>
        </View>

        {/* Bouton Déconnexion */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleForceSignOut}
        >
          <MaterialCommunityIcons name="logout-variant" size={24} color={Colors.gold} />
          <Text style={styles.signOutButtonText}>Déconnexion</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.gold} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    paddingTop: 50, 
    paddingBottom: 15, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  backBtn: { padding: 5 },
  content: { padding: 20 },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.card, 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 10 
  },
  iconContainer: { padding: 10, borderRadius: 10 },
  menuTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: Colors.textMain, 
    flex: 1, 
    marginLeft: 15 
  },
  
  // Styles pour les sections
  section: {
    marginTop: 30,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textMain,
    marginBottom: 15,
    paddingHorizontal: 5
  },
  
  // Bouton de déconnexion
  signOutButton: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gold,
    marginTop: 40,
    width: '80%',
    alignSelf: 'center'
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.gold,
    flex: 1,
    marginLeft: 15
  }
});