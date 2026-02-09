import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Stack, useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import type { ExpenseCategoryId } from '../src/constants/Accounting';
import { useAuth } from '../src/hooks/useAuth';
import { addExpense } from '../src/services/ExpenseService';
import { storage } from '../src/services/firebaseConfig';

// ✅ CONFIGURATION BACKEND API
const BACKEND_API_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://us-central1-taxiflow-app-768f5.cloudfunctions.net';
// Essayer plusieurs endpoints possibles
const POSSIBLE_ENDPOINTS = [
  `${BACKEND_API_URL}/analyzeReceipt`,
  `${BACKEND_API_URL}/analyze-receipt`,
  `${BACKEND_API_URL}/analyzeFacture`,
  `${BACKEND_API_URL}/receiptAnalysis`
];

if (__DEV__) {
  console.log('🔧 Backend API URL:', BACKEND_API_URL);
  console.log('🔧 Endpoints à tester:', POSSIBLE_ENDPOINTS);
}

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

interface FactureData {
  montant_total: number;
  montant_sans_taxes: number;
  tps: number;
  tvq: number;
  description: string;
  date: string;
  marchand: string;
}

// Styles définis au niveau global pour éviter les erreurs de référence
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  
  // PERMISSIONS
  permTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  permText: { color: Colors.textSub, textAlign: 'center', marginBottom: 30, paddingHorizontal: 40 },
  
  // HEADER
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#333', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textMain },
  
  overlayHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 50, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overlayTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  iconBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },

  // FORMULAIRE
  previewSmall: { width: '100%', height: 200, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  formCard: { backgroundColor: Colors.card, padding: 20, borderRadius: 16 },
  label: { color: Colors.gold, fontSize: 12, fontWeight: 'bold', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: Colors.inputBg, color: '#FFF', padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#444' },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#444' },
  totalLabel: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  totalValue: { color: Colors.success, fontSize: 24, fontWeight: 'bold' },

  // BOUTONS
  btnGold: { backgroundColor: Colors.gold, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  btnOutline: { borderWidth: 1, borderColor: '#555', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnBack: { marginTop: 15 },
  btnTextBlack: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  btnTextWhite: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  // CAMERA
  camera: { flex: 1 },
  captureZone: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardGuide: { 
    width: '95%',      // ✅ Presque tout l'écran en largeur
    height: '85%',     // ✅ Presque tout l'écran en hauteur
    borderWidth: 3,    // Bordure plus visible
    borderColor: Colors.gold, 
    borderRadius: 20, 
    marginBottom: 20,  // Réduit pour plus d'espace
    borderStyle: 'dashed' 
  },
  shutterBtnOuter: { position: 'absolute', bottom: 50, width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  shutterBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF' },
});

export default function ScanFactureScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [factureData, setFactureData] = useState<FactureData | null>(null);
  
  // Champs éditables
  const [montantSansTaxes, setMontantSansTaxes] = useState('');
  const [tps, setTps] = useState('');
  const [tvq, setTvq] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<ExpenseCategoryId>('FUEL');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'app'>('cash');
  
  const cameraRef = useRef<any>(null);

  // Vérification de la session au montage (APRÈS chargement)
  useEffect(() => {
    // Attendre que authLoading soit terminé avant de vérifier
    if (authLoading) {
      console.log('⏳ scanFacture: Chargement authentification en cours...');
      return;
    }

    if (!user) {
      console.log('⚠️ scanFacture: Utilisateur non connecté détecté');
      Alert.alert(
        '🔐 Session expirée',
        'Vous devez être connecté pour utiliser le scanner de factures.\n\nVeuillez vous reconnecter.',
        [
          {
            text: 'Se reconnecter',
            onPress: () => router.replace('/login')
          }
        ]
      );
    } else {
      console.log('✅ scanFacture: Utilisateur connecté OK -', user.uid);
    }
  }, [user, authLoading]);

  // Vérifier session avant prise de photo
  const checkAuthBeforeAction = (): boolean => {
    if (!user) {
      Alert.alert(
        '🔐 Session expirée',
        'Votre session a expiré. Veuillez vous reconnecter.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
      return false;
    }
    return true;
  };

  // Écran de chargement pendant vérification auth
  if (authLoading) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={{color: Colors.textSub, marginTop: 16, fontSize: 16}}>
          Vérification de la session...
        </Text>
      </View>
    );
  }

  if (!permission) return <View style={styles.container} />;
  
  if (!permission.granted) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center', padding: 20}]}>
        <Stack.Screen options={{ headerShown: false }} />
        <MaterialCommunityIcons name="receipt" size={60} color={Colors.textSub} />
        <Text style={styles.permTitle}>{t('scanInvoice.title')}</Text>
        <Text style={styles.permText}>{t('scanInvoice.cameraPermission')}</Text>
        <TouchableOpacity style={styles.btnGold} onPress={requestPermission}>
          <Text style={styles.btnTextBlack}>{t('common.authorize')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnBack} onPress={() => router.back()}>
          <Text style={styles.btnTextWhite}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ DÉCLENCHEUR PHOTO - INJECTION IMMÉDIATE DE L'ANALYSE
  const takePicture = async () => {
    // Vérifier session avant prise de photo
    if (!checkAuthBeforeAction()) return;

    if (cameraRef.current) {
      try {
        console.log('📸 Début prise de photo...');
        const photoData = await cameraRef.current.takePictureAsync({
          quality: 1.0,
          base64: true,
        });
        
        console.log('✅ Photo capturée avec succès');
        console.log('  - URI:', photoData.uri ? 'Oui' : 'Non');
        console.log('  - Base64:', photoData.base64 ? `Oui (${photoData.base64.length} chars)` : 'Non');
        
        // ✅ COMPRESSION POUR STORAGE (garder l'originale pour analyse)
        const compressedPhoto = await ImageManipulator.manipulateAsync(
          photoData.uri,
          [{ resize: { width: 800 } }],
          {
            compress: 0.4,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true
          }
        );
        
        console.log('🗜️ Compression image pour Storage...');
        console.log('  📏 Résolution cible: 800px largeur');
        console.log('  🎨 Qualité JPEG: 40%');
        
        // ✅ DÉCLENCHEUR IMMÉDIAT - PAS D'ATTENTE
        console.log('🚀 Lancement immédiat de l\'analyse automatique...');
        await analyzeReceiptWithGPT(photoData);
        
        setPhoto({
          ...photoData,
          compressedUri: compressedPhoto.uri,
          compressedBase64: compressedPhoto.base64
        });
        
      } catch(e: any) { 
        console.error('❌ Erreur prise photo:', e);
        Alert.alert(t('common.error'), 'Impossible de prendre la photo');
      }
    }
  };

  // ✅ FONCTION D'ANALYSE VIA BACKEND SÉCURISÉ
  const analyzeReceiptWithGPT = async (photoData: any) => {
    setAnalyzing(true);
    setLoading(true);

    try {
      if (__DEV__) {
        console.log('🚀 Début analyse facture');
        console.log('🔧 Endpoints à tester:', POSSIBLE_ENDPOINTS);
      }

      // ✅ VÉRIFICATION BASE64
      const base64Image = photoData.base64;
      if (!base64Image) {
        throw new Error('❌ Image base64 manquante. Problème lors de la capture photo.');
      }

      if (__DEV__) {
        console.log('📡 Envoi requête backend pour analyse...');
        console.log('📏 Taille image base64:', base64Image.length, 'caractères');
      }

      // ✅ APPEL BACKEND SÉCURISÉ (la clé OpenAI est côté serveur)
      // Créer un timeout manuel pour React Native
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes
      
      let response: Response | null = null;
      let lastError: Error | null = null;
      
      // Essayer chaque endpoint jusqu'à en trouver un qui fonctionne
      let data: any = null;
      
      for (const endpoint of POSSIBLE_ENDPOINTS) {
        try {
          if (__DEV__) {
            console.log('🔧 Tentative endpoint:', endpoint);
          }
          
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageBase64: base64Image
            }),
            signal: controller.signal
          });
          
          if (__DEV__) {
            console.log('📡 Statut HTTP pour', endpoint, ':', response.status);
          }
          
          if (response.ok) {
            // Endpoint trouvé ! Lire immédiatement la réponse
            data = await response.json();
            if (__DEV__) {
              console.log('✅ Endpoint fonctionnel trouvé:', endpoint);
            }
            break;
          } else {
            if (__DEV__) {
              console.log('❌ Endpoint', endpoint, 'a retourné', response.status);
            }
            lastError = new Error(`Endpoint ${endpoint} a retourné ${response.status}`);
          }
        } catch (error) {
          lastError = error as Error;
          if (__DEV__) {
            console.log('❌ Erreur pour endpoint', endpoint, ':', error);
          }
        }
      }
      
      // Nettoyer le timeout
      clearTimeout(timeoutId);
      
      if (!data) {
        throw lastError || new Error('Aucun endpoint n\'a répondu avec succès');
      }
      
      if (__DEV__) {
        console.log('📄 Réponse backend reçue:', data);
      }
      
      if (!data.success || !data.result) {
        throw new Error(data.error || 'Pas de résultat de l\'analyse');
      }

      const result: FactureData = data.result;

      if (__DEV__) {
        console.log('✅ Analyse reçue du backend');
      }
      
      // Le backend retourne déjà les données calculées correctement
      setFactureData(result);
      
      // Convertir en string avec 2 décimales pour affichage
      const montantHT = result.montant_sans_taxes?.toFixed(2) || '0.00';
      const tpsValue = result.tps?.toFixed(2) || '0.00';
      const tvqValue = result.tvq?.toFixed(2) || '0.00';
      const desc = result.description || result.marchand || 'Facture scannée';
      const dateValue = result.date || new Date().toISOString().split('T')[0];
      
      setMontantSansTaxes(montantHT);
      setTps(tpsValue);
      setTvq(tvqValue);
      setDescription(desc);
      setDate(dateValue);
      
      setAnalyzing(false);
      setLoading(false);

      // ✅ NOTIFICATION AVEC INSTRUCTIONS CLAIRES
      Alert.alert(
        '✅ Analyse terminée',
        `📋 Données extraites:\n\n` +
        `📅 Date: ${result.date || 'Non détectée'}\n` +
        `🏪 Marchand: ${result.marchand || 'Non détecté'}\n` +
        `💰 Total: ${result.montant_total?.toFixed(2) || '0.00'} $\n` +
        `💵 HT: ${result.montant_sans_taxes?.toFixed(2) || '0.00'} $\n` +
        `📊 TPS: ${result.tps?.toFixed(2) || '0.00'} $\n` +
        `📊 TVQ: ${result.tvq?.toFixed(2) || '0.00'} $\n\n` +
        `⚠️ VÉRIFIEZ ET CORRIGEZ si nécessaire avant d'enregistrer !`,
        [{ text: 'Vérifier', style: 'default' }]
      );

    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Erreur analyse:', error.message);
        console.error('❌ Stack trace:', error.stack);
      }
      
      setAnalyzing(false);
      setLoading(false);
      
      // ❌ MODE MANUEL DE SECOURS AVEC MESSAGE D'ERREUR DÉTAILLÉ
      let userMessage = 'Impossible d\'analyser la facture. Veuillez entrer les données manuellement.';
      
      if (error.message.includes('Network request failed')) {
        userMessage = 'Erreur de connexion au serveur d\'analyse. Vérifiez votre connexion internet et réessayez.';
      } else if (error.message.includes('timeout') || error.name === 'AbortError') {
        userMessage = 'L\'analyse a pris trop de temps. Veuillez réessayer ou entrer les données manuellement.';
      } else if (error.message.includes('Aucun endpoint n\'a répondu')) {
        userMessage = 'Le service d\'analyse n\'est pas disponible. Veuillez contacter le support technique.';
      } else if (error.message.includes('404')) {
        userMessage = 'Le service d\'analyse n\'est pas encore déployé. Veuillez réessayer plus tard.';
      }
      
      Alert.alert(
        '❌ Erreur d\'analyse',
        userMessage,
        [
          { text: 'Réessayer', onPress: () => analyzeReceiptWithGPT(photoData) },
          { text: 'Entrer manuellement', style: 'default' }
        ]
      );
      
      setFactureData({ 
        montant_total: 0, 
        montant_sans_taxes: 0, 
        tps: 0, 
        tvq: 0, 
        description: '', 
        date: '', 
        marchand: '' 
      });
      
      setMontantSansTaxes('0.00');
      setTps('0.00');
      setTvq('0.00');
      setDescription('');
      setDate('');
      setAnalyzing(false);
      setLoading(false);
    }
  };

  // ✅ UPLOAD PHOTO DANS FIREBASE STORAGE
  const uploadReceiptImage = async (): Promise<string | null> => {
    if (!photo || !photo.compressedUri) return null;
    
    try {
      const response = await fetch(photo.compressedUri);
      const blob = await response.blob();
      
      // Créer chemin structuré par année/mois/jour
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const timestamp = now.getTime();
      
      const storagePath = `receipts/${user!.uid}/${year}/${month}/${day}/receipt_${timestamp}.jpg`;
      
      if (__DEV__) {
        console.log('📸 Upload photo vers Storage:', storagePath);
      }
      
      // Créer référence Storage
      const storageRef = ref(storage, storagePath);
      
      // Upload
      await uploadBytes(storageRef, blob);
      
      // Récupérer URL de téléchargement
      const downloadUrl = await getDownloadURL(storageRef);
      
      if (__DEV__) {
        console.log('✅ Photo sauvegardée dans Storage');
      }
      
      return downloadUrl;
      
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Erreur upload photo:', error.message);
      }
      
      // Ne pas bloquer l'enregistrement si upload échoue
      Alert.alert(
        '⚠️ Avertissement',
        `La photo n'a pas pu être sauvegardée dans le cloud.\n\nLes données seront quand même enregistrées.\n\nErreur: ${error.message}`,
        [{ text: 'Continuer' }]
      );
      
      return null;
    }
  };

  const saveDepense = async () => {
    console.log('>>> TENTATIVE SAUVEGARDE DÉPENSE SCAN');
    console.log('>>> USER:', !!user);
    console.log('>>> DATE:', date);
    console.log('>>> MONTANT TOTAL:', parseFloat(montantSansTaxes || '0') + parseFloat(tps || '0') + parseFloat(tvq || '0'));
    console.log('>>> DESCRIPTION:', description);
    
    if (!user) {
      Alert.alert(t('common.error'), 'Utilisateur non connecté');
      return;
    }

    const total = parseFloat(montantSansTaxes || '0') + parseFloat(tps || '0') + parseFloat(tvq || '0');
    
    if (total <= 0) {
      Alert.alert(t('common.error'), t('errors.invalidAmount'));
      return;
    }

    if (!description.trim()) {
      Alert.alert(t('common.error'), 'Veuillez entrer une description');
      return;
    }

    // Validation date obligatoire
    if (!date.trim()) {
      Alert.alert(t('common.error'), 'Veuillez entrer une date (YYYY-MM-DD)');
      return;
    }

    // Validation format date (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date.trim())) {
      Alert.alert(t('common.error'), 'Format de date invalide. Utilisez YYYY-MM-DD (ex: 2026-01-18)');
      return;
    }

    try {
      setLoading(true);
      
      console.log('💾 DÉBUT ENREGISTREMENT DÉPENSE');
      console.log('═══════════════════════════════════════');
      
      // Convertir la date saisie en Timestamp Firebase
      const expenseDate = new Date(date.trim());
      const expenseTimestamp = Timestamp.fromDate(expenseDate);
      
      console.log('📅 Date de la dépense:', date, '→', expenseDate.toLocaleDateString());
      
      // 1. UPLOAD PHOTO DANS FIREBASE STORAGE
      console.log('📸 Étape 1/2: Upload photo dans Firebase Storage...');
      const receiptUrl = await uploadReceiptImage();
      
      if (receiptUrl) {
        console.log('✅ Photo uploadée avec succès');
      } else {
        console.warn('⚠️ Photo non uploadée (erreur ou manquante)');
      }
      
      // 2. ENREGISTRER DONNÉES DANS FIRESTORE
      console.log('💾 Étape 2/2: Enregistrement dans Firestore...');
      console.log('>>> ENVOI À FIREBASE:', {
        categoryId: category,
        merchant: description.trim(),
        amountExclTax: parseFloat(montantSansTaxes || '0'),
        tps: parseFloat(tps || '0'),
        tvq: parseFloat(tvq || '0'),
        total,
        date: expenseTimestamp,
        paymentMethod,
        source: 'scanner',
        receiptUrl: receiptUrl || ''
      });
      
      const expenseId = await addExpense(
        {
          categoryId: category,
          merchant: description.trim(),
          amountExclTax: parseFloat(montantSansTaxes || '0'),
          tps: parseFloat(tps || '0'),
          tvq: parseFloat(tvq || '0'),
          total,
          date: expenseTimestamp,
          paymentMethod,
          source: 'scanner',
          receiptUrl: receiptUrl || '', // URL Firebase Storage ou vide si échec
          notes: `Scanné avec OpenAI Vision le ${new Date().toLocaleDateString()}`
        },
        user.uid
      );

      console.log('✅ Dépense enregistrée avec succès:', expenseId);
      console.log('═══════════════════════════════════════');
      console.log('✅ ENREGISTREMENT COMPLET RÉUSSI');
      console.log('  📄 ID Dépense:', expenseId);
      console.log('  📸 Photo:', receiptUrl ? 'Sauvegardée' : 'Non sauvegardée');
      console.log('  📅 Date:', date);
      console.log('  💰 Total:', total.toFixed(2), '$');
      console.log('═══════════════════════════════════════');

      Alert.alert(
        '✅ Succès !',
        `Dépense enregistrée avec succès !\n\n📅 Date: ${date}\n💰 Total: $${total.toFixed(2)}\n🏪 Marchand: ${description.trim()}\n\n${receiptUrl ? '📸 Photo sauvegardée dans le cloud' : '⚠️ Photo non sauvegardée'}`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('>>> RETOUR À COMPTABILITÉ');
              router.back(); // Retour à Comptabilité
            }
          }
        ]
      );
      
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde dépense:', error);
      Alert.alert(t('common.error'), error.message || 'Impossible de sauvegarder la dépense');
    } finally {
      setLoading(false);
    }
  };

  // --- UI MANUELLE ---
  if (factureData && photo) {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" /></TouchableOpacity>
                <Text style={styles.headerTitle}>{t('scanInvoice.validation')}</Text>
                <View style={{width: 24}}/>
            </View>

            {/* Bouton fermer clavier pour iOS */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity 
                style={{alignSelf: 'center', marginBottom: 10, backgroundColor: Colors.gold + '20', padding: 8, borderRadius: 8}}
                onPress={Keyboard.dismiss}
              >
                <Text style={{color: Colors.gold, fontSize: 12, fontWeight: 'bold'}}>⌨️ Fermer le clavier</Text>
              </TouchableOpacity>
            )}

          <ScrollView 
            contentContainerStyle={{padding: 20}} 
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            <Image source={{ uri: photo.uri }} style={styles.previewSmall} />
            
            {/* BANNIÈRE RAPPEL VÉRIFICATION */}
            <View style={{backgroundColor: Colors.gold + '20', padding: 12, borderRadius: 8, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: Colors.gold}}>
              <Text style={{color: Colors.gold, fontSize: 13, fontWeight: 'bold'}}>
                ⚠️ VÉRIFIEZ LES MONTANTS
              </Text>
              <Text style={{color: Colors.textSub, fontSize: 11, marginTop: 4}}>
                Le scanner automatique peut faire des erreurs. Comparez avec votre facture et corrigez si nécessaire.
              </Text>
            </View>
            
            <View style={styles.formCard}>
                {/* DATE - PRIMORDIAL POUR CLASSEMENT */}
                <Text style={styles.label}>📅 Date * (IMPORTANT)</Text>
                <TextInput 
                  style={styles.input} 
                  value={date} 
                  onChangeText={setDate} 
                  placeholder="YYYY-MM-DD (ex: 2026-01-18)" 
                  placeholderTextColor="#666"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  blurOnSubmit={true}
                />
                <Text style={{color: Colors.gold, fontSize: 10, marginTop: 2, fontStyle: 'italic'}}>
                  ⚠️ Cette date détermine l'organisation dans Storage (année/mois)
                </Text>
                
                <Text style={styles.label}>{t('scanInvoice.amountExclTax')}</Text>
                <TextInput style={styles.input} value={montantSansTaxes} onChangeText={setMontantSansTaxes} keyboardType="numeric" placeholder={t('common.zeroAmount')} placeholderTextColor="#666" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} blurOnSubmit={true} />
                
                <View style={{flexDirection: 'row', gap: 10}}>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>{t('scanInvoice.tps')}</Text>
                        <TextInput style={styles.input} value={tps} onChangeText={setTps} keyboardType="numeric" placeholder={t('common.zeroAmount')} placeholderTextColor="#666" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} blurOnSubmit={true} />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>{t('scanInvoice.tvq')}</Text>
                        <TextInput style={styles.input} value={tvq} onChangeText={setTvq} keyboardType="numeric" placeholder={t('common.zeroAmount')} placeholderTextColor="#666" />
                    </View>
                </View>

                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{t('accounting.total')}</Text>
                    <Text style={styles.totalValue}>${(parseFloat(montantSansTaxes || '0') + parseFloat(tps || '0') + parseFloat(tvq || '0')).toFixed(2)}</Text>
                </View>

                <Text style={styles.label}>{t('common.description')}</Text>
                <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder={t('scanInvoice.descriptionPlaceholder')} placeholderTextColor="#666" />

                <TouchableOpacity style={styles.btnGold} onPress={saveDepense}>
                    <Text style={styles.btnTextBlack}>{t('common.save')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.btnOutline} onPress={() => {setPhoto(null); setFactureData(null);}}>
                    <Text style={styles.btnTextWhite}>{t('scanInvoice.retakePhoto')}</Text>
                </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }

  // --- UI CHARGEMENT AVEC INDICATEUR VISIBLE ---
  if (analyzing || loading) {
    return (
      <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={{color: Colors.gold, marginTop: 20, fontSize: 18, fontWeight: 'bold'}}>
          🤖 Analyse de la facture en cours...
        </Text>
        <Text style={{color: Colors.textSub, marginTop: 10, textAlign: 'center', paddingHorizontal: 40}}>
          Analyse automatique en cours{'\n'}Veuillez patienter...
        </Text>
      </View>
    );
  }

  // --- UI CAMERA ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      
      <View style={styles.overlayHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.overlayTitle}>{t('scanInvoice.scanReceipt')}</Text>
          <View style={{width: 40}} />
      </View>

      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.captureZone}>
            <View style={styles.cardGuide} />
            <TouchableOpacity style={styles.shutterBtnOuter} onPress={takePicture}>
                <View style={styles.shutterBtnInner} />
            </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}
