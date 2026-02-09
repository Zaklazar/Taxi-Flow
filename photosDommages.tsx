import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AccidentDataManager, AccidentPhoto } from '../services/AccidentDataManager';

// --- THÈME DARK LUXE ---
const Colors = {
  background: '#18181B',
  card: '#27272A',
  textMain: '#FFFFFF',
  textSub: '#9CA3AF',
  gold: '#FBBF24',
  success: '#22C55E',
  error: '#EF4444',
  overlay: 'rgba(24, 24, 27, 0.85)'
};

interface PhotoDommage {
  id: string;
  uri: string;
  type: string;
}

const PHOTOS_REQUISES = [
  { id: 'vue-large', labelKey: 'damagePhotos.overview', descriptionKey: 'damagePhotos.overviewDesc', icon: 'panorama' },
  { id: 'avant', labelKey: 'damagePhotos.front', descriptionKey: 'damagePhotos.frontDesc', icon: 'car' },
  { id: 'arriere', labelKey: 'damagePhotos.rear', descriptionKey: 'damagePhotos.rearDesc', icon: 'car-back' },
  { id: 'zoom', labelKey: 'damagePhotos.closeup', descriptionKey: 'damagePhotos.closeupDesc', icon: 'magnify-plus-outline' },
];

export default function PhotosDommagesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState<PhotoDommage[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [photo, setPhoto] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<any>(null);

  // Charger les photos existantes au montage
  useEffect(() => {
    loadExistingPhotos();
  }, []);

  const loadExistingPhotos = async () => {
    try {
      const existingPhotos = await AccidentDataManager.getPhotos();
      if (existingPhotos.length > 0) {
        setPhotos(existingPhotos);
        // Si toutes les photos sont prises, rester sur la dernière
        if (existingPhotos.length >= PHOTOS_REQUISES.length) {
          setCurrentPhotoIndex(PHOTOS_REQUISES.length - 1);
        } else {
          setCurrentPhotoIndex(existingPhotos.length);
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement photos:', error);
    }
  };

  if (!permission) return <View style={styles.container} />;
  
  if (!permission.granted) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center', padding: 20}]}>
        <Stack.Screen options={{ headerShown: false }} />
        <MaterialCommunityIcons name="camera-off" size={60} color={Colors.textSub} />
        <Text style={styles.headerTitle}>Photos du constat à l'amiable</Text>
        <Text style={styles.permText}>{t('damagePhotos.cameraPermissionText')}</Text>
        <TouchableOpacity style={styles.btnGold} onPress={requestPermission}>
          <Text style={styles.btnTextBlack}>{t('common.authorizeAccess')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnBack} onPress={() => router.back()}>
          <Text style={styles.btnTextWhite}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Prendre une photo
  const takePicture = async () => {
    if (cameraRef.current && currentPhotoIndex < PHOTOS_REQUISES.length) {
      try {
        const photoData = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        setPhoto(photoData);
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de prendre la photo');
      }
    }
  };

  // Valider la photo prise
  const validatePhoto = async () => {
    if (photo && photo.uri) {
      setSaving(true);
      try {
        const newPhoto: AccidentPhoto = {
          id: PHOTOS_REQUISES[currentPhotoIndex].id,
          uri: photo.uri,
          type: PHOTOS_REQUISES[currentPhotoIndex].id as any,
          timestamp: new Date().toISOString()
        };
        
        // Sauvegarder de façon permanente
        await AccidentDataManager.addPhoto(newPhoto);
        
        const updatedPhotos = [...photos, newPhoto];
        setPhotos(updatedPhotos);
        setPhoto(null);
        
        if (currentPhotoIndex < PHOTOS_REQUISES.length - 1) {
          setCurrentPhotoIndex(currentPhotoIndex + 1);
        } else {
          Alert.alert(
            t('damagePhotos.photoSetComplete'),
            `✅ ${updatedPhotos.length} photos enregistrées de façon permanente`,
            [{ text: t('common.finish'), onPress: () => router.back() }]
          );
        }
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de sauvegarder la photo');
      } finally {
        setSaving(false);
      }
    }
  };

  const retakePhoto = () => { setPhoto(null); };

  const resetAllPhotos = () => {
    Alert.alert(
      t('accident.resetPhotosTitle'),
      t('accident.resetPhotosMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await AccidentDataManager.clearPhotos();
              setPhotos([]);
              setCurrentPhotoIndex(0);
              Alert.alert(t('common.success'), t('accident.photosReset'));
            } catch (error) {
              console.error('❌ Erreur reset photos:', error);
              Alert.alert(t('common.error'), 'Impossible de supprimer les photos');
            }
          }
        }
      ]
    );
  };

  // --- VUE PRÉVISUALISATION ---
  if (photo && photo.uri) {
    // Vérification de sécurité
    if (currentPhotoIndex >= PHOTOS_REQUISES.length) {
      setPhoto(null);
      return null;
    }
    
    const currentGuide = PHOTOS_REQUISES[currentPhotoIndex];
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="black"/>
        <Stack.Screen options={{ headerShown: false }} />
        
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo.uri }} style={styles.previewImage} />
          <View style={styles.guideOverlay}>
            <MaterialCommunityIcons name={currentGuide.icon as any} size={40} color={Colors.gold} />
            <Text style={styles.guideText}>{t(currentGuide.labelKey)}</Text>
          </View>
        </View>
        
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.btnOutline} onPress={retakePhoto}>
            <MaterialCommunityIcons name="camera-retake" size={20} color="#FFF" />
            <Text style={styles.btnTextWhite}>{t('damagePhotos.retake')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGold} onPress={validatePhoto}>
            <MaterialCommunityIcons name="check" size={20} color="#000" />
            <Text style={styles.btnTextBlack}>{t('common.validate')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- VUE CAMÉRA ---
  // Vérification de sécurité pour éviter l'index hors limites
  if (currentPhotoIndex >= PHOTOS_REQUISES.length) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center', padding: 20}]}>
        <Stack.Screen options={{ headerShown: false }} />
        <MaterialCommunityIcons name="check-circle" size={80} color={Colors.success} />
        <Text style={styles.permTitle}>Photos complètes</Text>
        <Text style={styles.permText}>Toutes les photos ont été prises avec succès</Text>
        <TouchableOpacity style={styles.btnGold} onPress={() => router.back()}>
          <Text style={styles.btnTextBlack}>{t('common.finish')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentGuide = PHOTOS_REQUISES[currentPhotoIndex];
  const progress = ((currentPhotoIndex) / PHOTOS_REQUISES.length) * 100;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {/* HEADER OVERLAY */}
      <View style={styles.headerOverlay}>
        <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.stepBadge}>
                <Text style={styles.stepText}>{currentPhotoIndex + 1} / {PHOTOS_REQUISES.length}</Text>
            </View>
            <View style={{ width: 40 }} />
        </View>

        <View style={styles.guideBox}>
             <View style={{flexDirection:'row', alignItems:'center', gap: 10, marginBottom: 5}}>
                 <MaterialCommunityIcons name={currentGuide.icon as any} size={24} color={Colors.gold} />
                 <Text style={styles.guideTitle}>{t(currentGuide.labelKey)}</Text>
             </View>
             <Text style={styles.guideDesc}>{t(currentGuide.descriptionKey)}</Text>
             <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress + (100/PHOTOS_REQUISES.length)}%` }]} />
             </View>
        </View>
      </View>

      {/* CAMERA */}
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} ref={cameraRef} />
        
        {/* Bouton de capture superposé */}
        <View style={styles.captureZone}>
          <TouchableOpacity style={styles.shutterBtnOuter} onPress={takePicture}>
            <View style={styles.shutterBtnInner} />
          </TouchableOpacity>
        </View>
      </View>

      {/* GALLERIE MINIATURES */}
      <View style={styles.galleryBar}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{paddingHorizontal: 20, alignItems: 'center'}}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {PHOTOS_REQUISES.map((guide, index) => {
              const takenPhoto = photos.find(p => p.id === guide.id);
              const isActive = index === currentPhotoIndex;
              return (
                <View key={guide.id} style={[styles.thumbContainer, isActive && styles.thumbActive]}>
                  {takenPhoto ? (
                    <Image source={{ uri: takenPhoto.uri }} style={styles.thumbImage} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <MaterialCommunityIcons name={guide.icon as any} size={20} color={isActive ? Colors.gold : '#555'} />
                    </View>
                  )}
                  {takenPhoto && (
                    <View style={styles.checkBadge}>
                      <MaterialCommunityIcons name="check" size={10} color="#000" />
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
          
          {/* Bouton Reset */}
          {photos.length > 0 && (
            <TouchableOpacity style={styles.resetPhotoBtn} onPress={resetAllPhotos}>
              <MaterialCommunityIcons name="restore" size={18} color="#EF4444" />
              <Text style={styles.resetPhotoBtnText}>Reset</Text>
            </TouchableOpacity>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  
  // PERMISSIONS
  permTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  permText: { color: Colors.textSub, textAlign: 'center', marginBottom: 30, paddingHorizontal: 40 },
  
  // HEADER
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 50, backgroundColor: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center' },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  stepBadge: { backgroundColor: Colors.gold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stepText: { fontWeight: 'bold', fontSize: 12 },

  guideBox: { margin: 20, backgroundColor: 'rgba(24, 24, 27, 0.9)', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
  guideTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  guideDesc: { color: '#CCC', fontSize: 13, marginBottom: 15 },
  
  progressBarBg: { height: 4, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.gold },

  // CAMERA
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  captureZone: { position: 'absolute', bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', paddingBottom: 30 },
  shutterBtnOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  shutterBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF' },

  // GALLERY BAR
  galleryBar: { height: 100, backgroundColor: '#18181B', borderTopWidth: 1, borderTopColor: '#333', flexDirection: 'row', alignItems: 'center' },
  thumbContainer: { marginRight: 15, alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
  thumbActive: { opacity: 1, transform: [{scale: 1.1}] },
  thumbImage: { width: 50, height: 50, borderRadius: 10, borderWidth: 1, borderColor: '#555' },
  thumbPlaceholder: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#27272A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  checkBadge: { position: 'absolute', bottom: -5, right: -5, backgroundColor: Colors.gold, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  
  resetPhotoBtn: {
    position: 'absolute',
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
  },
  resetPhotoBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // PREVIEW
  previewContainer: { flex: 1, backgroundColor: '#000' },
  previewImage: { flex: 1, resizeMode: 'contain' },
  guideOverlay: { position: 'absolute', top: 60, alignSelf: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 15, borderRadius: 20 },
  guideText: { color: '#FFF', fontWeight: 'bold', marginTop: 5, fontSize: 16 },
  
  actionBar: { flexDirection: 'row', padding: 30, backgroundColor: '#18181B', gap: 20, justifyContent: 'space-between' },
  btnGold: { flex: 1, backgroundColor: Colors.gold, padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', gap: 8, alignItems: 'center' },
  btnOutline: { flex: 1, borderWidth: 1, borderColor: '#555', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', gap: 8, alignItems: 'center' },
  btnBack: { marginTop: 15 },
  btnTextBlack: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  btnTextWhite: { color: '#FFF', fontWeight: 'bold', fontSize: 14 }
});
