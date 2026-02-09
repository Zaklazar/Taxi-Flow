import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { changeLanguage } from '../i18n';
import { ProfileManager } from '../services/ProfileManager';
import { validateProfileData } from '../utils/validationUtils';
import { useTheme } from '../contexts/ThemeContext';

export default function DriverProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [pocketNumber, setPocketNumber] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [insurance, setInsurance] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');

  useEffect(() => { 
    load();
    
    const onLanguageChanged = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    i18n.on('languageChanged', onLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', onLanguageChanged);
    };
  }, []);

  const load = async () => {
    try {
      const p = await ProfileManager.getProfile();
      if (p) { 
        setName(p.name || ''); 
        setLicenseNumber(p.licenseNumber || ''); 
        setPocketNumber(p.pocketNumber || ''); 
        setVehiclePlate(p.vehiclePlate || ''); 
        setInsurance(p.insurance || ''); 
        setEmail(p.email || '');
        setVehicleMake(p.vehicleMake || '');
        setVehicleModel(p.vehicleModel || '');
        setVehicleYear(p.vehicleYear || '');
      }
    } catch (error) {
      console.error("Erreur chargement profil - Code: EC001");
    }
  };

  const handleSave = async () => {
    // ÉTAPE 1: Auto-correction et assainissement des entrées
    const cleanedData = {
      name: name.trim(),
      licenseNumber: licenseNumber.replace(/[-\s]/g, '').toUpperCase(),
      pocketNumber: pocketNumber.replace(/\s/g, ''),
      vehiclePlate: vehiclePlate.replace(/[-\s]/g, '').toUpperCase(),
      insurance: insurance.trim(),
      email: email.trim().toLowerCase(),
      vehicleMake: vehicleMake.trim(),
      vehicleModel: vehicleModel.trim(),
      vehicleYear: vehicleYear.trim()
    };

    // ÉTAPE 2: Validation des données nettoyées
    const validation = validateProfileData(cleanedData);
    
    if (!validation.isValid) {
      const errorMessage = validation.errors.join('\n');
      // Correction: Compatible Web et Mobile
      if (Platform.OS === 'web') {
        window.alert('Erreur de validation:\n' + errorMessage);
      } else {
        Alert.alert('Erreur de validation', errorMessage);
      }
      return;
    }

    // ÉTAPE 3: Ajouter les champs requis pour le profil
    const existingProfile = await ProfileManager.getProfile();
    const completeProfile = {
      ...validation.sanitizedProfile,
      id: existingProfile?.id || Date.now().toString(),
      chauffeurId: existingProfile?.chauffeurId || `chauffeur-${Date.now()}`,
      createdAt: existingProfile?.createdAt || new Date().toISOString()
    };

    // ÉTAPE 4: Sauvegarde avec feedback approprié
    try {
      await ProfileManager.saveProfile(completeProfile);
      
      // Succès: Compatible Web et Mobile
      if (Platform.OS === 'web') { 
        window.alert('Profil enregistré avec succès !'); 
        router.replace('/'); 
      } else { 
        Alert.alert('Succès', 'Votre profil chauffeur a été mis à jour.', [
          { text: 'OK', onPress: () => router.replace('/') }
        ]); 
      }
    } catch (error) {
      // Erreur: Compatible Web et Mobile
      if (Platform.OS === 'web') {
        window.alert('Erreur: Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.');
      } else {
        Alert.alert('Erreur', 'Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.');
      }
    }
  };

  // Fonction de styles dynamiques basée sur le thème
  const getStyles = (colors: any) => StyleSheet.create({
    container: {flex:1, backgroundColor: colors.background}, 
    input: {
        backgroundColor: colors.card, 
        color: colors.text, 
        padding:15, 
        borderRadius:12, 
        borderWidth:1, 
        borderColor: colors.border,
        fontSize: 16
    }, 
    btn: {
        backgroundColor: colors.accent, 
        padding:18, 
        borderRadius:12, 
        alignItems:'center', 
        marginTop:20,
        shadowColor: colors.accent,
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3
    },
    label: {
        color: colors.accent, 
        fontWeight:'bold', 
        fontSize: 12, 
        marginBottom: 6, 
        marginLeft: 4,
        textTransform: 'uppercase'
    },
    langButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: 'transparent',
        minWidth: 50,
        alignItems: 'center'
    },
    langButtonActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent
    },
    langText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textLight
    },
    langTextActive: {
        color: colors.card
    },
    saveButtonText: {
        color: colors.card,
        fontWeight:'bold',
        fontSize: 16
    }
  });

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <ScrollView 
        key={refreshKey} 
        contentContainerStyle={{padding: 20}}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40}}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="close" size={28} color={colors.text}/>
          </TouchableOpacity>
          
          <View style={{flexDirection: 'row', gap: 10}}>
            <TouchableOpacity 
              onPress={async () => {
                await changeLanguage('fr');
                setRefreshKey(prev => prev + 1);
              }}
              style={[
                styles.langButton,
                i18n.language === 'fr' && styles.langButtonActive
              ]}
            >
              <Text style={[
                styles.langText,
                i18n.language === 'fr' && styles.langTextActive
              ]}>FR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={async () => {
                await changeLanguage('en');
                setRefreshKey(prev => prev + 1);
              }}
              style={[
                styles.langButton,
                i18n.language === 'en' && styles.langButtonActive
              ]}
            >
              <Text style={[
                styles.langText,
                i18n.language === 'en' && styles.langTextActive
              ]}>EN</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={{alignItems: 'center', marginBottom: 30, marginTop: 10}}>
             <View style={{backgroundColor: colors.accent + '15', padding: 15, borderRadius: 50, marginBottom: 10}}>
                <MaterialCommunityIcons name="account-edit" size={50} color={colors.accent} />
             </View>
             <Text style={{color: colors.text, fontSize: 24, fontWeight: 'bold'}} key={refreshKey}>
               {t('login_title')}
             </Text>
             <Text style={{color: colors.textLight, fontSize: 14, textAlign: 'center', marginTop: 5}}>
                {t('login.updateInfo')}
             </Text>
        </View>

        <View style={{gap: 15}}>
            <View>
                <Text style={styles.label}>{t('login.fullName')}</Text>
                <TextInput 
                    placeholder={t('login.namePlaceholder')}
                    placeholderTextColor={colors.textLight}
                    style={styles.input} 
                    value={name} 
                    onChangeText={setName} 
                />
            </View>

            <View style={{flexDirection: 'row', gap: 10}}>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>{t('login.license')}</Text>
                    <TextInput 
                        placeholder={t('login.licensePlaceholder')}
                        placeholderTextColor={colors.textLight}
                        style={styles.input} 
                        value={licenseNumber} 
                        onChangeText={setLicenseNumber} 
                    />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>{t('login.pocketNumber')}</Text>
                    <TextInput 
                        placeholder={t('login.pocketPlaceholder')}
                        placeholderTextColor={colors.textLight}
                        style={styles.input} 
                        value={pocketNumber} 
                        onChangeText={setPocketNumber} 
                    />
                </View>
            </View>

            <View>
                <Text style={styles.label}>{t('login.vehiclePlate')}</Text>
                <TextInput 
                    placeholder={t('login.platePlaceholder')}
                    placeholderTextColor={colors.textLight}
                    style={styles.input} 
                    value={vehiclePlate} 
                    onChangeText={setVehiclePlate} 
                />
            </View>

            <View>
                <Text style={styles.label}>{t('login.insurance')}</Text>
                <TextInput 
                    placeholder={t('login.insurancePlaceholder')}
                    placeholderTextColor={colors.textLight}
                    style={styles.input} 
                    value={insurance} 
                    onChangeText={setInsurance} 
                />
            </View>

            <View>
                <Text style={styles.label}>{t('login.email')}</Text>
                <TextInput 
                    placeholder={t('login.emailPlaceholder')}
                    placeholderTextColor={colors.textLight}
                    style={styles.input} 
                    value={email} 
                    onChangeText={setEmail} 
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
            </View>

            <View style={{flexDirection: 'row', gap: 10}}>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>{t('login.vehicleMake')}</Text>
                    <TextInput 
                        placeholder={t('login.makePlaceholder')}
                        placeholderTextColor={colors.textLight}
                        style={styles.input} 
                        value={vehicleMake} 
                        onChangeText={setVehicleMake} 
                    />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>{t('login.vehicleModel')}</Text>
                    <TextInput 
                        placeholder={t('login.modelPlaceholder')}
                        placeholderTextColor={colors.textLight}
                        style={styles.input} 
                        value={vehicleModel} 
                        onChangeText={setVehicleModel} 
                    />
                </View>
            </View>

            <View>
                <Text style={styles.label}>{t('login.vehicleYear')}</Text>
                <TextInput 
                    placeholder={t('login.yearPlaceholder')}
                    placeholderTextColor={colors.textLight}
                    style={styles.input} 
                    value={vehicleYear} 
                    onChangeText={setVehicleYear} 
                    keyboardType="numeric"
                    maxLength={4}
                />
            </View>
        </View>

        <TouchableOpacity 
          style={styles.btn}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>{t('common.save').toUpperCase()}</Text>
        </TouchableOpacity>
        
        <View style={{height: 50}} />
      </ScrollView>
    </View>
  );
}
