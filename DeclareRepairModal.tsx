import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { RepairService } from '../services/RepairService';
import { getAuth } from 'firebase/auth';

const Colors = {
  background: '#18181B',
  card: '#FFFFFF',
  darkCard: '#27272A',
  textMain: '#1F2937',
  textHeader: '#FFFFFF',
  textSub: '#9CA3AF',
  gold: '#FBBF24',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  inputBg: '#F3F4F6',
};

interface DeclareRepairModalProps {
  visible: boolean;
  onClose: () => void;
  roundId: string;
  checkName: string;
  checkLabel: string;
}

const DeclareRepairModal: React.FC<DeclareRepairModalProps> = ({
  visible,
  onClose,
  roundId,
  checkName,
  checkLabel,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'choice' | 'invoice' | 'manual'>('choice');

  // Données facture
  const [invoicePhoto, setInvoicePhoto] = useState<string | null>(null);

  // Données manuelles
  const [repairDate, setRepairDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [garageName, setGarageName] = useState('');

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('ronde.repairErrorCamera'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setInvoicePhoto(result.assets[0].uri);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('ronde.repairErrorGallery'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setInvoicePhoto(result.assets[0].uri);
    }
  };

  const handleSubmitWithInvoice = async () => {
    if (!invoicePhoto) {
      Alert.alert(t('common.error'), t('ronde.repairErrorPhoto'));
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Utilisateur non connecté');

      const photoUrl = await RepairService.uploadInvoicePhoto(
        user.uid,
        roundId,
        invoicePhoto
      );

      await RepairService.create({
        roundId,
        driverId: user.uid,
        checkName,
        repairDate: new Date().toISOString(),
        description: `Réparation avec facture - ${checkLabel}`,
        invoicePhotoUrl: photoUrl,
        isRental: false,
      });

      Alert.alert(
        t('common.success'),
        t('ronde.repairSuccess'),
        [{ text: t('common.ok'), onPress: onClose }]
      );
    } catch (error) {
      console.error('Erreur déclaration réparation:', error);
      Alert.alert(t('common.error'), t('ronde.repairErrorFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitManual = async () => {
    if (!description.trim()) {
      Alert.alert(t('common.error'), t('ronde.repairErrorDescription'));
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Utilisateur non connecté');

      await RepairService.create({
        roundId,
        driverId: user.uid,
        checkName,
        repairDate,
        description,
        garageName: garageName || undefined,
        isRental: true,
      });

      Alert.alert(
        t('common.success'),
        t('ronde.repairSuccess'),
        [{ text: t('common.ok'), onPress: onClose }]
      );
    } catch (error) {
      console.error('Erreur déclaration réparation:', error);
      Alert.alert(t('common.error'), t('ronde.repairErrorFailed'));
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep('choice');
    setInvoicePhoto(null);
    setDescription('');
    setGarageName('');
    setRepairDate(new Date().toISOString().split('T')[0]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* En-tête */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <MaterialCommunityIcons name="wrench" size={28} color={Colors.gold} />
              <Text style={[styles.title, { marginBottom: 0, marginLeft: 10 }]}>{t('ronde.declareRepair')}</Text>
            </View>
            <Text style={styles.subtitle}>{t('ronde.defect')} : {checkLabel}</Text>
          </View>

          <ScrollView style={styles.content}>
            {/* ÉTAPE 1 : Choix */}
            {step === 'choice' && (
              <View style={styles.choiceContainer}>
                <TouchableOpacity style={styles.choiceButton} onPress={() => setStep('invoice')}>
                  <MaterialCommunityIcons name="camera" size={40} color={Colors.gold} />
                  <Text style={styles.choiceTitle}>{t('ronde.repairChoiceInvoice')}</Text>
                  <Text style={styles.choiceDesc}>
                    {t('ronde.repairChoiceInvoiceDesc')}
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t('ronde.repairOrDivider')}</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity style={styles.choiceButton} onPress={() => setStep('manual')}>
                  <MaterialCommunityIcons name="file-document-edit" size={40} color={Colors.gold} />
                  <Text style={styles.choiceTitle}>{t('ronde.repairChoiceManual')}</Text>
                  <Text style={styles.choiceDesc}>
                    {t('ronde.repairChoiceManualDesc')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ÉTAPE 2 : Upload facture */}
            {step === 'invoice' && (
              <View>
                {invoicePhoto ? (
                  <View>
                    <Image source={{ uri: invoicePhoto }} style={styles.invoicePreview} />
                    <TouchableOpacity
                      style={styles.retakeButton}
                      onPress={() => setInvoicePhoto(null)}
                    >
                      <MaterialCommunityIcons name="camera-retake" size={20} color="#FFF" />
                      <Text style={styles.retakeText}>{t('ronde.repairRetakePhoto')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoButtons}>
                    <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                      <MaterialCommunityIcons name="camera" size={32} color={Colors.gold} />
                      <Text style={styles.photoButtonText}>{t('ronde.repairTakePhoto')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
                      <MaterialCommunityIcons name="image" size={32} color={Colors.gold} />
                      <Text style={styles.photoButtonText}>{t('ronde.repairChooseGallery')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* ÉTAPE 3 : Formulaire manuel */}
            {step === 'manual' && (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('ronde.repairDateLabel')}</Text>
                  <TextInput
                    style={styles.input}
                    value={repairDate}
                    onChangeText={setRepairDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('ronde.repairDescriptionLabel')}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder={t('ronde.repairDescriptionPlaceholder')}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('ronde.repairGarageLabel')}</Text>
                  <TextInput
                    style={styles.input}
                    value={garageName}
                    onChangeText={setGarageName}
                    placeholder={t('ronde.repairGaragePlaceholder')}
                  />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Boutons d'action */}
          <View style={styles.footer}>
            {step === 'choice' && (
              <TouchableOpacity style={styles.cancelButton} onPress={resetAndClose}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            )}

            {step === 'invoice' && (
              <>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep('choice')}>
                  <Text style={styles.backText}>← {t('ronde.repairBack')}</Text>
                </TouchableOpacity>
                {invoicePhoto && (
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmitWithInvoice}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.submitText}>{t('ronde.repairValidate')}</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}

            {step === 'manual' && (
              <>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep('choice')}>
                  <Text style={styles.backText}>← {t('ronde.repairBack')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmitManual}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.submitText}>{t('ronde.repairValidate')}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    maxHeight: '90%',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textMain,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSub,
  },
  content: {
    padding: 20,
    maxHeight: 400,
  },
  choiceContainer: {
    gap: 15,
  },
  choiceButton: {
    backgroundColor: Colors.inputBg,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  choiceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textMain,
    marginTop: 10,
    marginBottom: 5,
  },
  choiceDesc: {
    fontSize: 13,
    color: Colors.textSub,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 10,
    color: Colors.textSub,
    fontWeight: 'bold',
  },
  photoButtons: {
    gap: 15,
  },
  photoButton: {
    backgroundColor: Colors.inputBg,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textMain,
  },
  invoicePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 15,
  },
  retakeButton: {
    backgroundColor: Colors.darkCard,
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retakeText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMain,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: Colors.textMain,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.darkCard,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  backText: {
    color: Colors.textMain,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.gold,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default DeclareRepairModal;
