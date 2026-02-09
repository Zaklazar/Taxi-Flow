import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { Stack, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AccidentDataManager } from '../services/AccidentDataManager';
import { DocumentManager } from '../services/DocumentManager';
import { ProfileManager } from '../services/ProfileManager';
import { useAuth } from '../src/hooks/useAuth';
import { auth } from '../src/services/firebaseConfig';

const Colors = {
  background: '#18181B',
  card: '#FFFFFF',
  darkCard: '#27272A',
  textMain: '#1F2937',
  textHeader: '#FFFFFF',
  textSub: '#6B7280',
  gold: '#FBBF24',
  danger: '#EF4444',
  success: '#22C55E',
};

export default function DetailsAccidentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // États pour les détails de l'accident
  const [dateAccident, setDateAccident] = useState(new Date().toISOString().split('T')[0]);
  const [heureAccident, setHeureAccident] = useState(new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }));
  const [ville, setVille] = useState('');
  const [intersection, setIntersection] = useState('');
  const [description, setDescription] = useState('');

  const genererRapportPDF = async () => {
    if (!ville || !intersection) {
      Alert.alert('Information manquante', 'Veuillez remplir la ville et l\'intersection de l\'accident');
      return;
    }

    setLoading(true);
    try {
      // Charger le profil
      let monProfil = await ProfileManager.getProfile();
      
      // Si pas de profil local, créer un profil temporaire depuis Firebase Auth
      if (!monProfil) {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email) {
          const currentUserId = user?.uid || auth.currentUser?.uid;
          console.log('🆔 Chargement documents pour profil temporaire avec userId:', currentUserId);
          const docs = await DocumentManager.getDocuments(currentUserId);
          const permis = docs.find((d: any) => d.type === 'permis_taxi');
          let userName = currentUser.displayName || currentUser.email.split('@')[0];
          if (permis?.metadata?.fullName) {
            userName = permis.metadata.fullName;
          }
          
          monProfil = {
            id: currentUser.uid,
            name: userName,
            email: currentUser.email,
            chauffeurId: `chauffeur-${currentUser.uid}`,
            createdAt: new Date().toISOString()
          };
        }
      }

      const nom = monProfil?.name || 'Non fourni';
      const email = monProfil?.email || 'Non fourni';
      const chauffeurId = monProfil?.chauffeurId || 'Non fourni';

      // Charger les documents
      const currentUserId = user?.uid || auth.currentUser?.uid;
      console.log('🆔 Chargement documents pour génération PDF avec userId:', currentUserId);
      const docs = await DocumentManager.getDocuments(currentUserId);
      
      // Chercher le permis classe 5 (permis_taxi)
      const permis = docs.find((d: any) => d.type === 'permis_taxi');
      
      // Chercher l'assurance
      const assurance = docs.find((d: any) => d.type === 'assurance');
      
      // Infos du permis classe 5 (Conducteur A)
      const permisNumero = permis?.documentNumber || 'Non fourni';
      const permisExpiration = permis?.expirationDate || 'Non fourni';
      const permisNom = permis?.metadata?.fullName || nom;
      const permisAdresse = permis?.metadata?.address || 'Non fourni';
      
      // Infos de l'assurance (Conducteur A)
      const assuranceNumero = assurance?.documentNumber || 'Non fourni';
      const assuranceCompagnie = assurance?.metadata?.insuranceCompany || 'Non fourni';
      const assuranceExpiration = assurance?.expirationDate || 'Non fourni';

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
      if (photos.length > 0) {
        photosHtml = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">';
        
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
              <div style="text-align: center;">
                <img src="data:image/jpeg;base64,${base64}" style="width: 100%; height: 200px; object-fit: cover; border: 1px solid #E5E7EB; border-radius: 4px;" />
                <p style="font-size: 9px; color: #6B7280; margin-top: 4px;">${photoLabel}</p>
              </div>
            `;
          } catch (error) {
            console.error(`❌ Erreur lecture photo ${photo.type}:`, error);
          }
        }
        
        photosHtml += '</div>';
      }

      let croquisHtml = '';
      if (croquisUri) {
        try {
          const base64 = await FileSystem.readAsStringAsync(croquisUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          croquisHtml = `
            <div style="margin-top: 10px; text-align: center;">
              <img src="data:image/png;base64,${base64}" style="width: 100%; max-height: 300px; object-fit: contain; border: 1px solid #E5E7EB; border-radius: 4px;" />
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
                padding: 20px; 
                color: #333; 
                line-height: 1.4;
                font-size: 9px;
              }
              .header-banner {
                background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
                color: white;
                padding: 15px;
                text-align: center;
                border-radius: 6px;
                margin-bottom: 12px;
              }
              .header-banner h1 {
                font-size: 18px;
                margin-bottom: 3px;
              }
              .header-banner .subtitle {
                font-size: 10px;
                opacity: 0.9;
              }
              .meta-info {
                display: flex;
                justify-content: space-between;
                background: #f5f5f5;
                padding: 8px 12px;
                border-radius: 4px;
                margin-bottom: 12px;
                font-size: 8px;
              }
              .meta-info strong { color: #1F2937; }
              .alert-box {
                background: #FEF2F2;
                border-left: 3px solid #EF4444;
                padding: 8px 12px;
                margin-bottom: 12px;
                border-radius: 3px;
                font-size: 8px;
              }
              .alert-box strong {
                color: #DC2626;
                display: block;
                margin-bottom: 3px;
              }
              .section {
                margin-bottom: 12px;
                border: 1px solid #E5E7EB;
                border-radius: 6px;
                overflow: hidden;
                page-break-inside: avoid;
              }
              .section-compact {
                margin-bottom: 8px;
              }
              .section-header {
                background: #1F2937;
                color: white;
                padding: 6px 12px;
                font-weight: bold;
                font-size: 11px;
              }
              .section-body {
                padding: 10px;
                background: white;
              }
              .section-body-compact {
                padding: 8px;
              }
              .two-columns {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
              }
              .info-row {
                display: flex;
                padding: 4px 0;
                border-bottom: 1px solid #F3F4F6;
                font-size: 8px;
              }
              .info-row:last-child {
                border-bottom: none;
              }
              .info-label {
                flex: 0 0 35%;
                font-weight: 600;
                color: #6B7280;
              }
              .info-value {
                flex: 1;
                color: #1F2937;
              }
              .subsection {
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid #E5E7EB;
              }
              .subsection-title {
                font-weight: bold;
                color: #1F2937;
                margin-bottom: 6px;
                font-size: 9px;
              }
              .footer {
                margin-top: 15px;
                padding-top: 10px;
                border-top: 2px solid #E5E7EB;
                text-align: center;
                color: #6B7280;
                font-size: 7px;
              }
              img {
                page-break-inside: avoid;
              }
            </style>
          </head>
          <body>
            <!-- Header Banner -->
            <div class="header-banner">
              <h1>📋 RAPPORT DE CONSTAT À L'AMIABLE</h1>
              <div class="subtitle">Document officiel pour compagnies d'assurance</div>
            </div>

            <!-- Meta Info -->
            <div class="meta-info">
              <div><strong>📅 Date:</strong> ${dateAccident} à ${heureAccident}</div>
              <div><strong>🆔 N° Rapport:</strong> ACC-${Date.now()}</div>
              <div><strong>📍 Lieu:</strong> ${ville}</div>
            </div>

            <!-- Alert Box -->
            <div class="alert-box">
              <strong>⚠️ DOCUMENT OFFICIEL</strong>
              Ce rapport contient des informations certifiées conformes aux faits constatés au moment de l'accident.
            </div>

            <!-- Lieu de l'accident -->
            <div class="section">
              <div class="section-header">
                <span class="icon">📍</span>
                LIEU DE L'ACCIDENT
              </div>
              <div class="section-body">
                <div class="info-row">
                  <div class="info-label">Date</div>
                  <div class="info-value">${dateAccident}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Heure</div>
                  <div class="info-value">${heureAccident}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Ville</div>
                  <div class="info-value">${ville}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Intersection</div>
                  <div class="info-value">${intersection}</div>
                </div>
                ${description ? `
                <div class="info-row">
                  <div class="info-label">Description</div>
                  <div class="info-value">${description}</div>
                </div>
                ` : ''}
              </div>
            </div>

            <!-- VÉHICULES (Grille 2 colonnes) -->
            <div class="two-columns">
              <!-- VÉHICULE A -->
              <div class="section section-compact">
                <div class="section-header">🚕 VÉHICULE A (Vous)</div>
                <div class="section-body section-body-compact">
                  <div class="info-row">
                    <div class="info-label">Nom</div>
                    <div class="info-value">${permisNom}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Adresse</div>
                    <div class="info-value">${permisAdresse}</div>
                  </div>
                  <div class="subsection">
                    <div class="subsection-title">🪪 Permis</div>
                    <div class="info-row">
                      <div class="info-label">N°</div>
                      <div class="info-value">${permisNumero}</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">Expiration</div>
                      <div class="info-value">${permisExpiration}</div>
                    </div>
                  </div>
                  <div class="subsection">
                    <div class="subsection-title">🛡️ Assurance</div>
                    <div class="info-row">
                      <div class="info-label">Compagnie</div>
                      <div class="info-value">${assuranceCompagnie}</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">N° Police</div>
                      <div class="info-value">${assuranceNumero}</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">Expiration</div>
                      <div class="info-value">${assuranceExpiration}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- VÉHICULE B -->
              <div class="section section-compact">
                <div class="section-header">🚗 VÉHICULE B (Autre)</div>
                <div class="section-body section-body-compact">
                  <div class="info-row">
                    <div class="info-label">Nom</div>
                    <div class="info-value">${conducteurB_nom}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Adresse</div>
                    <div class="info-value">${conducteurB_adresse}</div>
                  </div>
                  <div class="subsection">
                    <div class="subsection-title">🪪 Permis</div>
                    <div class="info-row">
                      <div class="info-label">N°</div>
                      <div class="info-value">${conducteurB_permis}</div>
                    </div>
                  </div>
                  <div class="subsection">
                    <div class="subsection-title">🛡️ Assurance</div>
                    <div class="info-row">
                      <div class="info-label">Compagnie</div>
                      <div class="info-value">${conducteurB_assuranceCompagnie}</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">N° Police</div>
                      <div class="info-value">${conducteurB_assuranceNumero}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Photos des dommages -->
            ${photos.length > 0 ? `
              <div class="section">
                <div class="section-header">📷 PHOTOS DES DOMMAGES</div>
                <div class="section-body section-body-compact">
                  ${photosHtml}
                </div>
              </div>
            ` : ''}

            <!-- Croquis de l'accident -->
            ${croquisUri ? `
              <div class="section">
                <div class="section-header">✏️ CROQUIS DE LA SCÈNE</div>
                <div class="section-body section-body-compact">
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

      Alert.alert('Succès', 'Rapport PDF généré avec succès !', [
        { text: 'OK', onPress: () => router.back() }
      ]);

    } catch (error) {
      console.error('❌ Erreur génération PDF:', error);
      Alert.alert('Erreur', 'Impossible de générer le rapport PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de l'accident</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Instructions */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information" size={24} color={Colors.gold} />
          <Text style={styles.infoText}>
            Remplissez les informations sur l'accident pour générer le rapport PDF complet
          </Text>
        </View>

        {/* Formulaire */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Date et heure</Text>
          
          <Text style={styles.label}>Date de l'accident</Text>
          <TextInput
            style={styles.input}
            value={dateAccident}
            onChangeText={setDateAccident}
            placeholder="AAAA-MM-JJ"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>Heure de l'accident</Text>
          <TextInput
            style={styles.input}
            value={heureAccident}
            onChangeText={setHeureAccident}
            placeholder="HH:MM"
            placeholderTextColor="#888"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Lieu de l'accident</Text>
          
          <Text style={styles.label}>Ville *</Text>
          <TextInput
            style={styles.input}
            value={ville}
            onChangeText={setVille}
            placeholder="Ex: Montréal"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>Intersection ou adresse *</Text>
          <TextInput
            style={styles.input}
            value={intersection}
            onChangeText={setIntersection}
            placeholder="Ex: Rue Sainte-Catherine / Rue Saint-Denis"
            placeholderTextColor="#888"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 Description (optionnel)</Text>
          
          <Text style={styles.label}>Circonstances de l'accident</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Décrivez brièvement ce qui s'est passé..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Bouton Générer */}
        <TouchableOpacity 
          style={[styles.generateButton, loading && styles.generateButtonDisabled]} 
          onPress={genererRapportPDF}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="file-pdf-box" size={24} color="#000" />
              <Text style={styles.generateButtonText}>Générer le rapport PDF</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textHeader,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.darkCard,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    color: '#CCC',
    fontSize: 13,
  },
  card: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textHeader,
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#333',
    color: '#FFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  generateButton: {
    backgroundColor: Colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
