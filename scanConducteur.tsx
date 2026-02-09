import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// --- CONFIGURATION ---
const API_URL = 'https://taxi-serveur.onrender.com/analyze-driver';

// --- THÈME DARK LUXE ---
const Colors = {
  background: '#18181B',
  card: '#27272A',
  textMain: '#FFFFFF',
  textSub: '#9CA3AF',
  gold: '#FBBF24',
  success: '#22C55E',
  error: '#EF4444',
  inputBg: '#333'
};

export default function ScanConducteur() {
  const { t } = useTranslation();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [driverData, setDriverData] = useState<any>(null);
  const cameraRef = useRef<any>(null);

  if (!permission) return <View style={styles.container} />;
  
  if (!permission.granted) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center', padding: 20}]}>
        <Stack.Screen options={{ headerShown: false }} />
        <MaterialCommunityIcons name="card-account-details-star" size={60} color={Colors.textSub} />
        <Text style={styles.permTitle}>{t('scanDriver.title')}</Text>
        <Text style={styles.permText}>{t('scanDriver.cameraPermission')}</Text>
        <TouchableOpacity style={styles.btnGold} onPress={requestPermission}>
          <Text style={styles.btnTextBlack}>{t('common.authorize')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnBack} onPress={() => router.back()}>
          <Text style={styles.btnTextWhite}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 1. Prendre la photo
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photoData = await cameraRef.current.takePictureAsync({
            quality: 0.5,
            base64: true,
        });
        setPhoto(photoData);
      } catch (e) {
        Alert.alert(t('common.error'), t('errors.photoFailed'));
      }
    }
  };

  // 2. Envoyer au Serveur (MODE MANUEL FORCÉ)
  const analyzeLicense = async () => {
    if (!photo || !photo.uri) return;
    
    // 🔧 MODE MANUEL FORCÉ - Saisie directe sans serveur
    const FORCE_MANUAL_MODE = true;
    
    if (FORCE_MANUAL_MODE) {
      console.log('🔧 MODE MANUEL ACTIVÉ - Scanner permis sans serveur backend');
      setLoading(false);
      // Affiche le formulaire vide pour saisie manuelle
      setDriverData({
        full_name: "",
        license_number: "",
        expiration_date: "",
        address: ""
      });
      return;
    }
    
    setLoading(true);
    let formData = new FormData();
    formData.append('file', {
      uri: photo.uri,
      name: 'permis.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      const response = await fetch(API_URL, { 
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.ok) throw new Error('Erreur serveur');

      const result = await response.json();
      setDriverData(result);
      setLoading(false);

    } catch (error) {
      console.error(error);
      setLoading(false);
      // Mode démo si le serveur ne répond pas (pour que tu puisses tester l'UI)
      Alert.alert(
          t('scanDriver.serverInfo'), 
          t('scanDriver.serverAsleep'),
          [{ 
              text: t('common.ok'), 
              onPress: () => {
                  setDriverData({
                      full_name: "",
                      license_number: "",
                      expiration_date: "",
                      address: ""
                  });
              }
          }]
      );
    }
  };

  // 3. Écran de résultat (Formulaire pré-rempli)
  if (driverData) {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
          <Stack.Screen options={{ headerShown: false }} />
          
          <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 10 }}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.gold} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t('scanDriver.extractedData')}</Text>
          </View>

          <ScrollView 
            contentContainerStyle={styles.resultContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
          <View style={styles.infoBox}>
             <MaterialCommunityIcons name="check-decagram" size={24} color={Colors.success} />
             <Text style={{color: Colors.success}}>{t('scanDriver.licenseIdentified')}</Text>
          </View>

          <Text style={styles.label}>{t('scanDriver.fullName')}</Text>
          <TextInput style={styles.input} value={driverData.full_name} placeholderTextColor="#666" />

          <Text style={styles.label}>{t('scanDriver.licenseNumber')}</Text>
          <TextInput style={styles.input} value={driverData.license_number} placeholderTextColor="#666" />

          <Text style={styles.label}>{t('scanDriver.expiration')}</Text>
          <TextInput style={styles.input} value={driverData.expiration_date} placeholderTextColor="#666" />

          <Text style={styles.label}>{t('scanDriver.address')}</Text>
          <TextInput style={[styles.input, {height: 80}]} value={driverData.address} multiline placeholderTextColor="#666" />

          <TouchableOpacity 
            style={styles.btnGold} 
            onPress={() => {
                // Ici on pourrait renvoyer les données à la page précédente
                Alert.alert(t('common.saved'), t('scanDriver.dataSaved'), [
                    { text: t('common.ok'), onPress: () => router.back() }
                ]);
            }}
          >
            <Text style={styles.btnTextBlack}>{t('scanDriver.validateInfo')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.btnBack} onPress={() => setDriverData(null)}>
            <Text style={styles.btnTextWhite}>{t('scanDriver.scanAgain')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    );
  }

  // 4. Écran de prévisualisation
  if (photo && photo.uri) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor="black" />
        
        <Image source={{ uri: photo.uri }} style={styles.preview} />
        
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.btnOutline} onPress={() => setPhoto(null)}>
            <Text style={styles.btnTextWhite}>{t('scanDriver.retake')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.btnGold} onPress={analyzeLicense} disabled={loading}>
            {loading ? (
                <ActivityIndicator color="#000" />
            ) : (
                <Text style={styles.btnTextBlack}>{t('scanDriver.analyzeLicense')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 5. Écran Caméra
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="black" />
      
      <View style={styles.overlayHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.overlayTitle}>{t('scanDriver.framePermit')}</Text>
          <View style={{width: 40}} />
      </View>

      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.captureZone}>
            {/* Guide visuel pour cadrer */}
            <View style={styles.cardGuide} />
            
            <TouchableOpacity style={styles.shutterBtnOuter} onPress={takePicture}>
                <View style={styles.shutterBtnInner} />
            </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  
  // PERMISSIONS
  permTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  permText: { color: Colors.textSub, textAlign: 'center', marginBottom: 30, paddingHorizontal: 40 },
  
  // HEADER
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#333', flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textMain, flex: 1 },
  
  overlayHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 50, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overlayTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  iconBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },

  // RESULTATS
  resultContent: { padding: 20 },
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: 15, borderRadius: 12, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: Colors.success },
  label: { color: Colors.gold, fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: Colors.inputBg, color: '#FFF', padding: 15, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#444' },

  // CAMERA
  camera: { flex: 1 },
  captureZone: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardGuide: { width: '85%', height: 220, borderWidth: 2, borderColor: Colors.gold, borderRadius: 15, marginBottom: 100, borderStyle: 'dashed' },
  
  shutterBtnOuter: { position: 'absolute', bottom: 50, width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  shutterBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF' },

  // PREVIEW
  preview: { flex: 1, resizeMode: 'contain' },
  actionBar: { flexDirection: 'row', padding: 30, backgroundColor: '#18181B', gap: 20, justifyContent: 'space-between' },

  // BOUTONS
  btnGold: { backgroundColor: Colors.gold, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, flex: 1 },
  btnOutline: { borderWidth: 1, borderColor: '#555', padding: 16, borderRadius: 12, alignItems: 'center', flex: 1 },
  btnBack: { marginTop: 15, alignItems: 'center' },
  btnTextBlack: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  btnTextWhite: { color: '#FFF', fontWeight: 'bold', fontSize: 14 }
});
