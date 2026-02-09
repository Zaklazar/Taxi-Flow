/**
 * add-expense.tsx
 * 
 * Écran de scan et saisie de dépenses
 * - Photo (caméra ou galerie)
 * - Formulaire de saisie
 * - Sauvegarde avec organisation temporelle (année/mois)
 */

import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { calculateTotalWithTaxes, EXPENSE_CATEGORIES, ExpenseCategoryId, PaymentMethod } from '../src/constants/Accounting';
import { useAuth } from '../src/hooks/useAuth';
import { addExpense } from '../src/services/ExpenseService';
import { storage } from '../src/services/firebaseConfig';

export default function AddExpenseScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  // Fallback pour les traductions manquantes
  const fallbackTranslation = (key: string) => {
    const translation = t(key);
    if (!translation || translation === key) {
      // Fallback simple basé sur la clé
      const fallbacks: Record<string, string> = {
        'expenseCategories.FUEL': 'Essence / Carburant',
        'expenseCategories.CAR_WASH': 'Lavage Auto',
        'expenseCategories.INSURANCE': 'Assurance Auto',
        'expenseCategories.REPAIR': 'Garage Réparation',
        'expenseCategories.OIL_CHANGE': 'Changement Huile',
        'expenseCategories.TIRES': 'Pneus',
        'expenseCategories.MEALS': 'Repas',
        'expenseCategories.SAAQ': 'SAAQ',
        'expenseCategories.PHONE': 'Téléphone',
        'expenseCategories.OFFICE': 'Fournitures Bureau',
        'expenseCategories.CLEANING': 'Produits Nettoyants',
        'expenseCategories.PARKING': 'Stationnement',
        'expenseCategories.OTHER': 'Autre'
      };
      return fallbacks[key] || key;
    }
    return translation;
  };

  // État de l'image
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);

  // État du formulaire
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categoryId, setCategoryId] = useState<ExpenseCategoryId>('FUEL');
  const [merchant, setMerchant] = useState('');
  const [amountExclTax, setAmountExclTax] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [notes, setNotes] = useState('');

  // État de chargement
  const [loading, setLoading] = useState(false);

  /**
   * Demander les permissions et prendre une photo
   */
  const handleTakePhoto = async () => {
    try {
      // Demander la permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          'Permission caméra refusée. Activez-la dans les paramètres.'
        );
        return;
      }

      // Lancer la caméra
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3]
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setImageUri(uri);

        // Convertir en Blob pour upload
        const response = await fetch(uri);
        const blob = await response.blob();
        setImageBlob(blob);
      }
    } catch (error) {
      console.error('Erreur prise de photo:', error);
      Alert.alert(t('common.error'), 'Impossible de prendre la photo');
    }
  };

  /**
   * Demander les permissions et choisir depuis la galerie
   */
  const handlePickImage = async () => {
    try {
      // Demander la permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          'Permission galerie refusée. Activez-la dans les paramètres.'
        );
        return;
      }

      // Lancer le sélecteur
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3]
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setImageUri(uri);

        // Convertir en Blob pour upload
        const response = await fetch(uri);
        const blob = await response.blob();
        setImageBlob(blob);
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      Alert.alert(t('common.error'), 'Impossible de sélectionner l\'image');
    }
  };

  /**
   * Gérer le changement de date
   */
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  /**
   * Upload de l'image vers Firebase Storage
   * Organisation temporelle : receipts/{uid}/{ANNEE}/{MOIS}/image.jpg
   */
  const uploadImage = async (): Promise<string | null> => {
    if (!imageBlob || !user) {
      console.warn('⚠️ Upload impossible - imageBlob ou user manquant');
      return null;
    }

    try {
      // CRITIQUE : Extraire l'année et le mois de la date CHOISIE (pas aujourd'hui)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // 01-12

      // Nom du fichier avec timestamp pour unicité
      const timestamp = Date.now();
      const fileName = `receipt_${timestamp}.jpg`;

      // Chemin organisé par année/mois
      const storagePath = `receipts/${user.uid}/${year}/${month}/${fileName}`;
      
      console.log('📤 UPLOAD IMAGE');
      console.log('  📁 Chemin:', storagePath);
      console.log('  👤 User ID:', user.uid);
      console.log('  📅 Date facture:', `${year}-${month}`);
      console.log('  📄 Nom fichier:', fileName);
      
      const storageRef = ref(storage, storagePath);

      // Upload
      console.log('  ⏳ Upload en cours...');
      await uploadBytes(storageRef, imageBlob);
      console.log('  ✅ Upload terminé');

      // Récupérer l'URL
      const downloadUrl = await getDownloadURL(storageRef);
      console.log('  🔗 URL téléchargement:', downloadUrl);
      console.log('✅ IMAGE SAUVEGARDÉE AVEC SUCCÈS');
      console.log('  📍 Emplacement Firebase Storage:', storagePath);
      
      return downloadUrl;
    } catch (error: any) {
      console.error('❌ ERREUR UPLOAD IMAGE');
      console.error('  Message:', error.message);
      console.error('  Code:', error.code);
      console.error('  Détails:', error);
      throw new Error(`Impossible d'uploader l'image: ${error.message}`);
    }
  };

  /**
   * Sauvegarder la dépense
   */
  const handleSave = async () => {
    // Validation
    if (!user) {
      Alert.alert(t('common.error'), 'Utilisateur non connecté');
      return;
    }

    if (!imageUri) {
      Alert.alert(t('common.error'), 'Veuillez d\'abord prendre une photo');
      return;
    }

    if (!merchant.trim()) {
      Alert.alert(t('common.error'), 'Veuillez entrer le nom du marchand');
      return;
    }

    const amount = parseFloat(amountExclTax);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t('common.error'), 'Veuillez entrer un montant valide');
      return;
    }

    try {
      setLoading(true);

      // 1. Upload de l'image (organisée par année/mois de la date choisie)
      const receiptUrl = await uploadImage();

      if (!receiptUrl) {
        throw new Error('Échec de l\'upload de l\'image');
      }

      // 2. Calculer les taxes automatiquement
      const { tps, tvq, total } = calculateTotalWithTaxes(amount);

      // 3. Créer la dépense dans Firestore
      const expenseId = await addExpense(
        {
          categoryId,
          merchant: merchant.trim(),
          amountExclTax: amount,
          tps,
          tvq,
          total,
          date: Timestamp.fromDate(date), // Date choisie par l'utilisateur
          paymentMethod,
          source: 'scanner',
          receiptUrl,
          notes: notes.trim()
        },
        user.uid
      );

      console.log('✅ Dépense créée:', expenseId);

      // 4. Succès - Message détaillé
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const storagePath = `receipts/${user.uid}/${year}/${month}/`;
      
      Alert.alert(
        '✅ Succès !',
        `Dépense ajoutée avec succès !\n\n` +
        `📍 Image sauvegardée dans Storage:\n${storagePath}\n\n` +
        `💰 Montant total: $${total.toFixed(2)}\n` +
        `🏪 Marchand: ${merchant.trim()}`,
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error: any) {
      console.error('Erreur sauvegarde dépense:', error);
      Alert.alert(t('common.error'), error.message || 'Impossible de sauvegarder la dépense');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Annuler et retourner
   */
  const handleCancel = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#18181B" />
      
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* En-tête avec bouton retour */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>📄 Ajouter une Dépense</Text>
        </View>

      {/* Boutons de capture */}
      <View style={styles.captureButtons}>
        <TouchableOpacity
          style={[styles.captureButton, styles.cameraButton]}
          onPress={handleTakePhoto}
          disabled={loading}
        >
          <Text style={styles.captureButtonIcon}>📷</Text>
          <Text style={styles.captureButtonText}>Prendre Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureButton, styles.galleryButton]}
          onPress={handlePickImage}
          disabled={loading}
        >
          <Text style={styles.captureButtonIcon}>🖼️</Text>
          <Text style={styles.captureButtonText}>Galerie</Text>
        </TouchableOpacity>
      </View>

      {/* Aperçu de l'image */}
      {imageUri && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => {
              setImageUri(null);
              setImageBlob(null);
            }}
          >
            <Text style={styles.removeImageText}>❌ Retirer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Formulaire (affiché seulement si une image est choisie) */}
      {imageUri && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>📝 Détails de la Dépense</Text>

          {/* Date - CHAMP LE PLUS IMPORTANT */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>📅 Date * (IMPORTANT)</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {date.toLocaleDateString('fr-CA')} {/* YYYY-MM-DD */}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
            <Text style={styles.hint}>
              ⚠️ Cette date détermine l'organisation dans Storage (année/mois)
            </Text>
          </View>

          {/* Catégorie */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>🏷️ Catégorie *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={categoryId}
                onValueChange={(value) => setCategoryId(value as ExpenseCategoryId)}
                style={styles.picker}
              >
                {Object.keys(EXPENSE_CATEGORIES).map((key) => {
                  const label = fallbackTranslation(`expenseCategories.${key}`);
                  return (
                    <Picker.Item
                      key={key}
                      label={label}
                      value={key}
                    />
                  );
                })}
              </Picker>
            </View>
          </View>

          {/* Montant */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>💰 Montant HT * ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="45.00"
              value={amountExclTax}
              onChangeText={setAmountExclTax}
              keyboardType="decimal-pad"
            />
            {amountExclTax && parseFloat(amountExclTax) > 0 && (
              <View style={styles.taxInfo}>
                <Text style={styles.taxText}>
                  TPS (5%): ${(parseFloat(amountExclTax) * 0.05).toFixed(2)}
                </Text>
                <Text style={styles.taxText}>
                  TVQ (9.975%): ${(parseFloat(amountExclTax) * 0.09975).toFixed(2)}
                </Text>
                <Text style={styles.taxTextBold}>
                  Total TTC: ${calculateTotalWithTaxes(parseFloat(amountExclTax)).total.toFixed(2)}
                </Text>
              </View>
            )}
          </View>

          {/* Marchand */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>🏪 Marchand *</Text>
            <TextInput
              style={styles.input}
              placeholder="Shell Station-Service"
              value={merchant}
              onChangeText={setMerchant}
            />
          </View>

          {/* Méthode de paiement */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>💳 Paiement</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                style={styles.picker}
              >
                <Picker.Item label="Carte Crédit/Débit" value="card" />
                <Picker.Item label="Argent Comptant" value="cash" />
                <Picker.Item label="Débit" value="debit" />
                <Picker.Item label="Paiement Mobile" value="mobile" />
                <Picker.Item label="Autre" value="other" />
              </Picker>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>📝 Notes (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notes supplémentaires..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Boutons d'action */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>❌ Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>✅ Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Message si pas d'image */}
      {!imageUri && (
        <View style={styles.noImageContainer}>
          <Text style={styles.noImageText}>👆 Prenez une photo ou choisissez depuis la galerie</Text>
        </View>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  backButton: {
    padding: 8,
    marginRight: 10
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1
  },
  captureButtons: {
    flexDirection: 'row',
    padding: 15,
    gap: 10
  },
  captureButton: {
    flex: 1,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  cameraButton: {
    backgroundColor: '#4CAF50'
  },
  galleryButton: {
    backgroundColor: '#2196F3'
  },
  captureButtonIcon: {
    fontSize: 48,
    marginBottom: 10
  },
  captureButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  imagePreview: {
    margin: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    elevation: 2
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 10
  },
  removeImageButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F44336',
    borderRadius: 10,
    alignItems: 'center'
  },
  removeImageText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  form: {
    margin: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 2
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333'
  },
  fieldContainer: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  dateButton: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  dateText: {
    fontSize: 16,
    color: '#333'
  },
  hint: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 5,
    fontStyle: 'italic'
  },
  pickerContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden'
  },
  picker: {
    height: 50
  },
  taxInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 8
  },
  taxText: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 3
  },
  taxTextBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginTop: 5
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#F44336'
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold'
  },
  saveButton: {
    backgroundColor: '#4CAF50'
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  noImageContainer: {
    margin: 15,
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 15,
    alignItems: 'center'
  },
  noImageText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center'
  }
});
