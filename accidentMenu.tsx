import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { Stack, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { AccidentDataManager } from '../services/AccidentDataManager';
import { DocumentManager } from '../services/DocumentManager';
import { ProfileManager } from '../services/ProfileManager';
import { useAuth } from '../src/hooks/useAuth';
import { auth } from '../src/services/firebaseConfig';

// --- THÈME DARK LUXE ---
const Colors = {
  background: '#18181B',
  card: '#FFFFFF',
  darkCard: '#27272A',
  textMain: '#1F2937',
  textHeader: '#FFFFFF',
  textSub: '#6B7280',
  gold: '#FBBF24',
  danger: '#EF4444',
  success: '#22C55E', // Vert pour validation
};

export default function AccidentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // --- 1. CHARGEMENT PROFIL & VÉRIFICATION ---
  const [monProfil, setMonProfil] = useState<any>(null);
  const [mesDocuments, setMesDocuments] = useState<any>({ permis: null, assurance: null });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    chargerTout();
  }, []);

  const chargerTout = async () => {
    // Charger d'abord les documents pour récupérer le nom du permis
    await chargerDocuments();
    await chargerProfil();
  };

  const chargerProfil = async () => {
    try {
      console.log('🔍 Chargement du profil...');
      let data = await ProfileManager.getProfile();
      
      // Si pas de profil local, créer un profil temporaire depuis l'authentification
      if (!data) {
        console.log('⚠️ Pas de profil local, utilisation des infos Firebase Auth...');
        const user = auth.currentUser;
        if (user && user.email) {
          // Essayer de récupérer le nom depuis le permis si disponible
          let userName = user.displayName || user.email.split('@')[0];
          if (mesDocuments.permis?.metadata?.fullName) {
            userName = mesDocuments.permis.metadata.fullName;
            console.log('✅ Nom récupéré depuis le permis:', userName);
          }
          
          data = {
            id: user.uid,
            name: userName,
            email: user.email,
            chauffeurId: `chauffeur-${user.uid}`,
            createdAt: new Date().toISOString()
          };
          console.log('✅ Profil temporaire créé depuis Firebase Auth');
        }
      }
      
      // Migration: Ajouter chauffeurId si manquant
      if (data && !data.chauffeurId) {
        console.log('⚠️ chauffeurId manquant, ajout automatique...');
        data = {
          ...data,
          id: data.id || Date.now().toString(),
          chauffeurId: `chauffeur-${Date.now()}`,
          createdAt: data.createdAt || new Date().toISOString()
        };
        await ProfileManager.saveProfile(data);
        console.log('✅ Profil migré avec chauffeurId:', data.chauffeurId);
      }
      
      console.log('👤 Profil chargé:', data);
      console.log('👤 Profil détails:', {
        name: data?.name,
        email: data?.email,
        chauffeurId: data?.chauffeurId,
        hasName: !!data?.name,
        hasEmail: !!data?.email,
        hasChauffeurId: !!data?.chauffeurId
      });
      setMonProfil(data);
    } catch (error) {
      console.error('❌ Erreur chargement profil:', error);
    }
  };

  const chargerDocuments = async () => {
    try {
      const currentUserId = user?.uid || auth.currentUser?.uid;
      console.log('🆔 Chargement documents conducteur A avec userId:', currentUserId);
      const docs = await DocumentManager.getDocuments(currentUserId);
      console.log('📄 Documents chargés pour conducteur A:', docs);
      console.log('📄 Types de documents disponibles:', docs.map((d: any) => d.type));
      
      // Chercher le permis classe 5 (permis_taxi)
      const permis = docs.find((d: any) => d.type === 'permis_taxi');
      
      // Chercher l'assurance
      const assurance = docs.find((d: any) => d.type === 'assurance');
      
      setMesDocuments({ permis, assurance });
      console.log('✅ Permis:', permis);
      console.log('✅ Assurance:', assurance);
    } catch (error) {
      console.error('❌ Erreur chargement documents:', error);
    }
  };

  // Vérifier si un document est valide (non expiré)
  const isDocumentValide = (document: any): boolean => {
    if (!document || !document.expirationDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expirationDate = new Date(document.expirationDate);
    expirationDate.setHours(0, 0, 0, 0);
    return expirationDate >= today; // Valide si expiration >= aujourd'hui
  };

  // Vérifier si tout est prêt quand profil ou documents changent
  useEffect(() => {
    const permisValide = isDocumentValide(mesDocuments.permis);
    const assuranceValide = isDocumentValide(mesDocuments.assurance);
    
    console.log('🔄 Vérification état conducteur A:', {
      profilPresent: !!monProfil,
      profilName: monProfil?.name,
      profilEmail: monProfil?.email,
      profilChauffeurId: monProfil?.chauffeurId,
      permisPresent: !!mesDocuments.permis,
      permisValide: permisValide,
      assurancePresent: !!mesDocuments.assurance,
      assuranceValide: assuranceValide
    });
    
    // Conducteur A est prêt si :
    // 1. Profil complet (nom, email, chauffeurId)
    // 2. Permis présent ET valide (non expiré)
    // 3. Assurance présente ET valide (non expirée)
    const profilComplet = monProfil && monProfil.name && monProfil.email && monProfil.chauffeurId;
    
    if (profilComplet && permisValide && assuranceValide) {
      setIsReady(true);
      console.log('✅ Conducteur A prêt (profil + permis valide + assurance valide)');
    } else {
      setIsReady(false);
      console.log('⏳ Conducteur A incomplet ou documents expirés');
    }
  }, [monProfil, mesDocuments]);

  // Fonction SOS
  const appelerSecours = () => {
    Alert.alert(
      t('accident.emergency911'),
      t('accident.confirmEmergencyCall'),
      [
        { text: t('common.cancel'), style: "cancel" },
        { text: t('accident.yesCall'), onPress: () => Linking.openURL('tel:911'), style: "destructive" }
      ]
    );
  };

  // --- 2. GÉNÉRATION PDF ---
  const genererRapportPDF = async () => {
    try {
      const nom = monProfil?.name || t('common.notProvided');
      const email = monProfil?.email || t('common.notProvided');
      const chauffeurId = monProfil?.chauffeurId || t('common.notProvided');
      const dateHeure = new Date().toLocaleString('fr-CA');

      // Infos du permis classe 5 (Conducteur A)
      const permisNumero = mesDocuments.permis?.documentNumber || t('common.notProvided');
      const permisExpiration = mesDocuments.permis?.expirationDate || t('common.notProvided');
      const permisNom = mesDocuments.permis?.metadata?.fullName || nom;
      const permisAdresse = mesDocuments.permis?.metadata?.address || t('common.notProvided');
      
      // Infos de l'assurance (Conducteur A)
      const assuranceNumero = mesDocuments.assurance?.documentNumber || t('common.notProvided');
      const assuranceCompagnie = mesDocuments.assurance?.metadata?.insuranceCompany || t('common.notProvided');
      const assuranceExpiration = mesDocuments.assurance?.expirationDate || t('common.notProvided');

      // Charger les infos du conducteur B depuis AsyncStorage
      let conducteurB = { permis: null, assurance: null };
      try {
        const dataConducteurB = await AsyncStorage.getItem('@conducteur_b_documents');
        if (dataConducteurB) {
          conducteurB = JSON.parse(dataConducteurB);
        }
      } catch (error) {
        console.error('❌ Erreur chargement conducteur B:', error);
      }

      const conducteurB_nom = conducteurB.permis?.fullName || '______________________';
      const conducteurB_permis = conducteurB.permis?.documentNumber || '______________________';
      const conducteurB_adresse = conducteurB.permis?.address || '______________________';
      const conducteurB_assuranceCompagnie = conducteurB.assurance?.insuranceCompany || '______________________';
      const conducteurB_assuranceNumero = conducteurB.assurance?.documentNumber || '______________________';

      // Charger les photos et le croquis
      const photos = await AccidentDataManager.getPhotos();
      const croquisUri = await AccidentDataManager.getCroquis();
      
      // Convertir les images en base64 pour le PDF
      let photosHtml = '';
      for (const photo of photos) {
        try {
          const base64 = await FileSystem.readAsStringAsync(photo.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const photoLabel = {
            'vue-large': 'Vue d\'ensemble',
            'avant': 'Vue avant',
            'arriere': 'Vue arrière',
            'zoom': 'Vue rapprochée'
          }[photo.type] || photo.type;
          
          photosHtml += `
            <div style="margin-bottom: 15px;">
              <p style="font-weight: bold; margin-bottom: 5px; color: #1F2937;">${photoLabel}</p>
              <img src="data:image/jpeg;base64,${base64}" style="max-width: 100%; height: auto; border: 1px solid #E5E7EB; border-radius: 4px;" />
            </div>
          `;
        } catch (error) {
          console.error(`❌ Erreur lecture photo ${photo.type}:`, error);
        }
      }

      let croquisHtml = '';
      if (croquisUri) {
        try {
          const base64 = await FileSystem.readAsStringAsync(croquisUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          croquisHtml = `
            <div style="margin-top: 15px;">
              <p style="font-weight: bold; margin-bottom: 5px; color: #1F2937;">Croquis de la scène</p>
              <img src="data:image/png;base64,${base64}" style="max-width: 100%; height: auto; border: 1px solid #E5E7EB; border-radius: 4px;" />
            </div>
          `;
        } catch (error) {
          console.error('❌ Erreur lecture croquis:', error);
        }
      }

      const htmlContent = `
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Arial', 'Helvetica', sans-serif; 
                padding: 30px; 
                color: #333; 
                line-height: 1.6;
                font-size: 11px;
              }
              .header-banner {
                background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 8px;
                margin-bottom: 20px;
              }
              .header-banner h1 {
                font-size: 24px;
                margin-bottom: 5px;
              }
              .header-banner .subtitle {
                font-size: 12px;
                opacity: 0.9;
              }
              .meta-info {
                display: flex;
                justify-content: space-between;
                background: #f5f5f5;
                padding: 12px 15px;
                border-radius: 6px;
                margin-bottom: 20px;
                font-size: 10px;
              }
              .meta-info strong { color: #1F2937; }
              .alert-box {
                background: #FEF2F2;
                border-left: 4px solid #EF4444;
                padding: 12px 15px;
                margin-bottom: 20px;
                border-radius: 4px;
              }
              .alert-box strong {
                color: #DC2626;
                display: block;
                margin-bottom: 5px;
              }
              .section {
                margin-bottom: 20px;
                border: 1px solid #E5E7EB;
                border-radius: 8px;
                overflow: hidden;
                page-break-inside: avoid;
              }
              .section-header {
                background: #1F2937;
                color: white;
                padding: 10px 15px;
                font-weight: bold;
                font-size: 14px;
                display: flex;
                align-items: center;
              }
              .section-header .icon {
                margin-right: 8px;
              }
              .section-body {
                padding: 15px;
                background: white;
              }
              .info-row {
                display: flex;
                padding: 8px 0;
                border-bottom: 1px dashed #E5E7EB;
              }
              .info-row:last-child {
                border-bottom: none;
              }
              .info-label {
                flex: 0 0 40%;
                font-weight: 600;
                color: #6B7280;
              }
              .info-value {
                flex: 1;
                color: #111827;
                font-weight: 500;
              }
              .subsection {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #E5E7EB;
              }
              .subsection-title {
                font-weight: bold;
                color: #4B5563;
                margin-bottom: 8px;
                font-size: 12px;
              }
              .footer {
                margin-top: 30px;
                padding-top: 15px;
                border-top: 2px solid #E5E7EB;
                text-align: center;
                font-size: 9px;
                color: #9CA3AF;
              }
              .page-break { page-break-before: always; }
            </style>
          </head>
          <body>
            <!-- En-tête -->
            <div class="header-banner">
              <h1>📋 CONSTAT À L'AMIABLE</h1>
              <div class="subtitle">Rapport officiel pour compagnies d'assurance</div>
            </div>

            <!-- Métadonnées -->
            <div class="meta-info">
              <div><strong>Date & Heure:</strong> ${dateHeure}</div>
              <div><strong>N° Rapport:</strong> ${Date.now()}</div>
              <div><strong>Type:</strong> Constat à l'amiable</div>
            </div>

            <!-- Alerte -->
            <div class="alert-box">
              <strong>⚠️ DOCUMENT NUMÉRIQUE OFFICIEL</strong>
              Ce rapport a été généré numériquement et contient toutes les informations nécessaires pour le traitement du sinistre. Les photos et croquis sont joints séparément.
            </div>

            <!-- VÉHICULE A (Vous) -->
            <div class="section">
              <div class="section-header">
                <span class="icon">🚕</span>
                VÉHICULE A - Chauffeur de taxi (Vous)
              </div>
              <div class="section-body">
                <!-- Informations personnelles -->
                <div class="subsection-title">📋 Informations du conducteur</div>
                <div class="info-row">
                  <div class="info-label">Nom complet</div>
                  <div class="info-value">${permisNom}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Adresse</div>
                  <div class="info-value">${permisAdresse}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Email</div>
                  <div class="info-value">${email}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">ID Chauffeur</div>
                  <div class="info-value">${chauffeurId}</div>
                </div>

                <!-- Permis de conduire -->
                <div class="subsection">
                  <div class="subsection-title">🪪 Permis de conduire</div>
                  <div class="info-row">
                    <div class="info-label">N° de permis</div>
                    <div class="info-value">${permisNumero}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Date d'expiration</div>
                    <div class="info-value">${permisExpiration}</div>
                  </div>
                </div>

                <!-- Assurance -->
                <div class="subsection">
                  <div class="subsection-title">🛡️ Assurance automobile</div>
                  <div class="info-row">
                    <div class="info-label">Compagnie d'assurance</div>
                    <div class="info-value">${assuranceCompagnie}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">N° de police</div>
                    <div class="info-value">${assuranceNumero}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Date d'expiration</div>
                    <div class="info-value">${assuranceExpiration}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- VÉHICULE B (Autre partie) -->
            <div class="section">
              <div class="section-header">
                <span class="icon">🚗</span>
                VÉHICULE B - Autre conducteur impliqué
              </div>
              <div class="section-body">
                <!-- Informations personnelles -->
                <div class="subsection-title">📋 Informations du conducteur</div>
                <div class="info-row">
                  <div class="info-label">Nom complet</div>
                  <div class="info-value">${conducteurB_nom}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Adresse</div>
                  <div class="info-value">${conducteurB_adresse}</div>
                </div>

                <!-- Permis de conduire -->
                <div class="subsection">
                  <div class="subsection-title">🪪 Permis de conduire</div>
                  <div class="info-row">
                    <div class="info-label">N° de permis</div>
                    <div class="info-value">${conducteurB_permis}</div>
                  </div>
                </div>

                <!-- Assurance -->
                <div class="subsection">
                  <div class="subsection-title">🛡️ Assurance automobile</div>
                  <div class="info-row">
                    <div class="info-label">Compagnie d'assurance</div>
                    <div class="info-value">${conducteurB_assuranceCompagnie}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">N° de police</div>
                    <div class="info-value">${conducteurB_assuranceNumero}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Circonstances -->
            <div class="section">
              <div class="section-header">
                <span class="icon">📝</span>
                CIRCONSTANCES DE L'ACCIDENT
              </div>
              <div class="section-body">
                <p style="color: #6B7280; font-style: italic; margin-bottom: 15px;">
                  Les détails des circonstances sont décrits ci-dessous avec les photos et le croquis de l'accident.
                </p>
              </div>
            </div>

            <!-- Photos des dommages -->
            ${photos.length > 0 ? `
              <div class="section">
                <div class="section-header">
                  <span class="icon">📷</span>
                  PHOTOS DES DOMMAGES
                </div>
                <div class="section-body">
                  ${photosHtml}
                </div>
              </div>
            ` : ''}

            <!-- Croquis de l'accident -->
            ${croquisUri ? `
              <div class="section">
                <div class="section-header">
                  <span class="icon">✏️</span>
                  CROQUIS DE LA SCÈNE
                </div>
                <div class="section-body">
                  ${croquisHtml}
                </div>
              </div>
            ` : ''}

            <!-- Pied de page -->
            <div class="footer">
              <div style="margin-bottom: 5px;">
                Rapport généré automatiquement par <strong>TaxiFlow Pro</strong>
              </div>
              <div>
                Ce document est valide pour soumission aux compagnies d'assurance
              </div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (error) {
      Alert.alert(t('common.error'), t('errors.pdfGenerationFailed'));
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('accident.title')}</Text>
        <TouchableOpacity style={styles.sosButton} onPress={appelerSecours}>
          <MaterialCommunityIcons name="phone-alert" size={20} color="#fff" />
          <Text style={styles.sosText}>{t('accident.emergencyNumber')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{paddingBottom: 40}}>
        
        {/* ALERTE SÉCURITÉ */}
        <View style={styles.alertBox}>
           <MaterialCommunityIcons name="alert-decagram" size={24} color="#FFF" />
           <View style={{flex: 1}}>
             <Text style={styles.alertTitle}>{t('common.important')}</Text>
             <Text style={styles.alertText}>
               {t('accident.importantWarning')}
             </Text>
           </View>
        </View>

        {/* WIDGET CONSEILS */}
        <View style={styles.calmCard}>
          <View style={styles.calmHeader}>
            <MaterialCommunityIcons name="shield-check" size={28} color={Colors.gold} />
            <Text style={styles.calmTitle}>{t('accident.safetyProcedure')}</Text>
          </View>
          <Text style={styles.calmText}>
            {t('accident.safetySteps')}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t('accident.section1')}</Text>
        
        {/* --- NOUVEAU BOUTON : CONDUCTEUR A (VOUS) --- */}
        <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => {
              if(!isReady) {
                Alert.alert(t('accident.missingDocuments'), t('accident.completeProfile'), [
                  {text: t('accident.goToDocuments'), onPress: () => router.push('/documents')}
                ]);
              } else {
                Alert.alert(t('common.perfect'), t('accident.documentsReady'));
              }
            }} 
        >
          {/* Fond Vert si OK, Rouge/Gris si pas prêt */}
          <View style={[styles.iconBox, { backgroundColor: isReady ? Colors.success + '20' : Colors.danger + '10' }]}>
            <MaterialCommunityIcons 
              name={isReady ? "account-check" : "account-alert"} 
              size={28} 
              color={isReady ? Colors.success : Colors.danger} 
            />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{t('accident.driverA')}</Text>
            <Text style={[styles.cardSub, { color: isReady ? Colors.success : Colors.danger, fontWeight: isReady ? 'bold' : 'normal' }]}>
              {isReady ? t('accident.fileComplete') : t('accident.missingInfo')}
            </Text>
          </View>
          {isReady && <MaterialCommunityIcons name="check-circle" size={24} color={Colors.success} />}
        </TouchableOpacity>

        {/* --- BOUTON : CONDUCTEUR B (TIERS) --- */}
        <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/conducteurB')} 
        >
          <View style={[styles.iconBox, { backgroundColor: Colors.background }]}>
            <MaterialCommunityIcons name="card-account-details-star" size={28} color={Colors.gold} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{t('accident.scanDriverB')}</Text>
            <Text style={styles.cardSub}>{t('accident.otherPartyDocs')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="shield-account" size={20} color={Colors.gold} />
            <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/photosDommages')}>
          <View style={[styles.iconBox, { backgroundColor: Colors.background }]}>
            <MaterialCommunityIcons name="camera-burst" size={28} color={Colors.gold} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{t('accident.damagePhotos')}</Text>
            <Text style={styles.cardSub}>{t('accident.visualEvidence')}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>{t('accident.section2')}</Text>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/croquisAccident')}>
          <View style={[styles.iconBox, { backgroundColor: Colors.background }]}>
            <MaterialCommunityIcons name="draw" size={28} color={Colors.gold} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{t('accident.sceneSketch')}</Text>
            <Text style={styles.cardSub}>{t('accident.drawImpact')}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

         {/* BOUTON PDF */}
         <TouchableOpacity style={styles.finalButton} onPress={() => router.push('/detailsAccident')}>
            <MaterialCommunityIcons name="file-pdf-box" size={24} color="#000" />
            <Text style={styles.finalButtonText}>{t('accident.generatePDF')}</Text>
         </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, 
    backgroundColor: Colors.background, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#333'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textHeader },
  backButton: { padding: 5 },
  sosButton: {
    flexDirection: 'row', backgroundColor: Colors.danger, 
    paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20,
    alignItems: 'center', gap: 5, elevation: 5
  },
  sosText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  content: { padding: 20 },
  
  alertBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: Colors.danger,
    borderRadius: 12, padding: 15, marginBottom: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12
  },
  alertTitle: { color: Colors.danger, fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
  alertText: { color: '#FFF', fontSize: 13, lineHeight: 18 },

  calmCard: {
    backgroundColor: Colors.darkCard, padding: 20, borderRadius: 16, marginBottom: 25,
    borderLeftWidth: 4, borderLeftColor: Colors.gold,
  },
  calmHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  calmTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  calmText: { fontSize: 14, color: '#AAA', lineHeight: 22 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textHeader, marginBottom: 15, marginTop: 5 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    padding: 16, borderRadius: 16, marginBottom: 15, elevation: 2,
  },
  iconBox: {
    width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textMain },
  cardSub: { fontSize: 13, color: Colors.textSub, marginTop: 2 },
  finalButton: {
    backgroundColor: Colors.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 18, borderRadius: 16, gap: 10, marginTop: 20, elevation: 5
  },
  finalButtonText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
});