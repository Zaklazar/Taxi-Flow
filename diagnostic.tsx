import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, PermissionsAndroid, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { State } from 'react-native-ble-plx';
import { OBD2InterpretationResult, OBD2InterpretationService } from '../services/OBD2InterpretationService';
import { OBD2Manager, OBD2Result } from '../services/OBD2Manager';

// --- THÈME DARK LUXE ---
const Colors = {
  background: '#18181B',
  card: '#27272A',
  textMain: '#FFFFFF',
  textSub: '#9CA3AF',
  cyan: '#06B6D4', // Couleur Tech
  success: '#22C55E',
  error: '#EF4444',
  gold: '#FBBF24',
};

// Simulation du composant Scanner si tu ne l'as pas dans un fichier séparé
const MockScanner = ({ onData, isScanning, t }: any) => {
    return (
        <View style={styles.scannerCircle}>
            {isScanning ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.cyan} />
                    <Text style={styles.loadingText}>
                        {t('diagnostic.analyzing')}
                    </Text>
                </View>
            ) : (
                <View style={styles.readyContainer}>
                    <MaterialCommunityIcons name="engine" size={50} color={Colors.textSub} />
                    <Text style={styles.readyText}>
                        {t('diagnostic.readyToScan')}
                    </Text>
                </View>
            )}
        </View>
    );
};

export default function DiagnosticScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  
  // États OBD2
  const [obd2Scanning, setObd2Scanning] = useState(false);
  const [obd2Connected, setObd2Connected] = useState(false);
  const [obd2Result, setObd2Result] = useState<OBD2Result | null>(null);
  const [obd2Interpretation, setObd2Interpretation] = useState<OBD2InterpretationResult | null>(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState<boolean | null>(null);

  // Vérifier l'état Bluetooth au montage
  useEffect(() => {
    checkBluetoothState();
  }, []);

  const checkBluetoothState = async () => {
    try {
      // Vérifier d'abord si le module BLE est disponible
      if (!OBD2Manager.checkBleAvailability()) {
        setBluetoothEnabled(null); // null = non supporté
        return;
      }
      
      const state = await OBD2Manager.checkBluetoothState();
      console.log('État Bluetooth:', state);
      setBluetoothEnabled(state === State.PoweredOn);
    } catch (error) {
      console.error('Erreur vérification Bluetooth:', error);
      setBluetoothEnabled(null); // null = erreur/non supporté
    }
  };

  // Demander les permissions Bluetooth explicitement
  const requestBluetoothPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return true; // Web n'a pas de permissions Bluetooth
    }

    if (Platform.OS === 'ios') {
      return true; // iOS gère les permissions automatiquement
    }

    try {
      const permissions: any[] = [];
      
      if (parseInt(Platform.Version as string) >= 31) {
        // Android 12+
        permissions.push(
          'android.permission.BLUETOOTH_SCAN',
          'android.permission.BLUETOOTH_CONNECT',
          'android.permission.ACCESS_FINE_LOCATION'
        );
      } else {
        // Android < 12
        permissions.push(
          'android.permission.BLUETOOTH',
          'android.permission.BLUETOOTH_ADMIN',
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.ACCESS_COARSE_LOCATION'
        );
      }

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      console.log('📱 Permissions Bluetooth:', granted);
      
      const allGranted = Object.values(granted).every(
        status => status === PermissionsAndroid.RESULTS.GRANTED
      );
      
      if (!allGranted) {
        Alert.alert(
          t('common.error'),
          t('diagnostic.bluetoothPermissionsRequired'),
          [{ text: t('common.ok'), style: 'default' }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erreur demande permissions:', error);
      Alert.alert(
        t('common.error'),
        t('diagnostic.bluetoothPermissionsError'),
        [{ text: t('common.ok'), style: 'default' }]
      );
      return false;
    }
  };

  const scanOBD2Device = async () => {
    // Vérifier disponibilité BLE
    if (!OBD2Manager.checkBleAvailability()) {
      Alert.alert(
        'Module BLE non disponible',
        'La fonctionnalité Bluetooth n\'est pas disponible.\n\nPour utiliser le scanner OBD2, vous devez avoir installé l\'APK avec le build natif EAS.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Demander les permissions AVANT de continuer
    const permissionsGranted = await requestBluetoothPermissions();
    if (!permissionsGranted) {
      return;
    }
    
    // Vérifier Bluetooth après permissions
    await checkBluetoothState();
    
    if (!bluetoothEnabled) {
      Alert.alert(
        'Bluetooth désactivé',
        'Veuillez activer le Bluetooth dans les paramètres de votre appareil avant de lancer le scan.',
        [{ text: 'OK' }]
      );
      return;
    }

    setObd2Scanning(true);
    setObd2Result(null);
    setObd2Interpretation(null);
    
    try {
      console.log('🔍 Recherche scanner OBD2...');
      
      const devices = await OBD2Manager.scanForOBD2Device();
      
      if (devices.length === 0) {
        Alert.alert(
          'Aucun scanner trouvé',
          'Assurez-vous que:\n• Le scanner OBD2 est allumé\n• Le Bluetooth est activé\n• Le scanner est à proximité',
          [{ text: 'OK' }]
        );
        setObd2Scanning(false);
        return;
      }

      const connected = await OBD2Manager.connect(devices[0]);
      
      if (!connected) {
        Alert.alert('Erreur', 'Impossible de se connecter au scanner OBD2');
        setObd2Scanning(false);
        return;
      }

      setObd2Connected(true);

      // Initialiser le protocole OBD2
      const initialized = await OBD2Manager.initializeOBD2Protocol();
      
      if (!initialized) {
        Alert.alert(
          'Erreur ECU',
          'Impossible de communiquer avec l\'ordinateur de bord (ECU).\n\nVérifiez que:\n• Le contact est mis\n• Le scanner est bien branché au port OBD2\n• Le véhicule est compatible OBD2 (1996+)'
        );
        await OBD2Manager.disconnect();
        setObd2Connected(false);
        setObd2Scanning(false);
        return;
      }

      // Lecture des codes DTC
      const result = await OBD2Manager.readDTCCodes();
      setObd2Result(result);

      if (!result.success) {
        Alert.alert('Erreur', result.error || 'Impossible de lire les codes d\'erreur');
        await OBD2Manager.disconnect();
        setObd2Connected(false);
        setObd2Scanning(false);
        return;
      }

      // Interprétation des codes (bruts pour le moment)
      if (result.dtcCodes && result.dtcCodes.length > 0) {
        console.log('📋 Codes DTC détectés:', result.dtcCodes);
        const interpretation = await OBD2InterpretationService.interpretDTCCodes(result.dtcCodes);
        setObd2Interpretation(interpretation);
      } else {
        setObd2Interpretation({
          success: true,
          statutVehicule: 'conforme',
          messageGlobal: '✅ Aucun code d\'erreur détecté.',
          interpretations: []
        });
      }

      await OBD2Manager.disconnect();
      setObd2Connected(false);
      setObd2Scanning(false);

      Alert.alert('✅ Scan OBD2 terminé', 'Consultez les résultats ci-dessous');

    } catch (error: any) {
      console.error('❌ Erreur scan OBD2:', error);
      Alert.alert('Erreur', error.message || 'Erreur lors du scan OBD2');
      
      if (obd2Connected) {
        await OBD2Manager.disconnect();
        setObd2Connected(false);
      }
      setObd2Scanning(false);
    }
  };

  const startScan = () => {
    scanOBD2Device();
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
        <Text style={styles.headerTitle}>{t('diagnostic.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* STATUT BLUETOOTH */}
        <View style={[
          styles.bluetoothStatus,
          bluetoothEnabled === true && { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: Colors.success },
          bluetoothEnabled === false && { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: Colors.error },
          bluetoothEnabled === null && { backgroundColor: 'rgba(156, 163, 175, 0.1)', borderColor: Colors.textSub }
        ]}>
          <MaterialCommunityIcons 
            name={bluetoothEnabled === true ? "bluetooth" : bluetoothEnabled === false ? "bluetooth-off" : "alert-circle"} 
            size={18} 
            color={bluetoothEnabled === true ? Colors.success : bluetoothEnabled === false ? Colors.error : Colors.textSub} 
          />
          <Text style={[
            styles.bluetoothStatusText,
            bluetoothEnabled === true && { color: Colors.success },
            bluetoothEnabled === false && { color: Colors.error },
            bluetoothEnabled === null && { color: Colors.textSub }
          ]}>
            {bluetoothEnabled === null && '⚠️ Module BLE non disponible (utilisez un build natif)'}
            {bluetoothEnabled === true && '✓ Bluetooth activé'}
            {bluetoothEnabled === false && '✗ Bluetooth désactivé - Activez-le dans les paramètres'}
          </Text>
          {bluetoothEnabled !== null && (
            <TouchableOpacity onPress={checkBluetoothState} style={styles.refreshBtn}>
              <MaterialCommunityIcons name="refresh" size={16} color={Colors.gold} />
            </TouchableOpacity>
          )}
        </View>

        {/* INFO */}
        <View style={styles.infoCard}>
            <MaterialCommunityIcons name="information" size={24} color={Colors.cyan} />
            <Text style={styles.infoText}>
                {bluetoothEnabled === null 
                  ? 'Le module Bluetooth BLE nécessite un build natif. Compilez l\'application avec "npx expo run:android" ou "npx expo run:ios".'
                  : 'Connectez un scanner OBD2 Bluetooth (ELM327) au port OBD2 de votre véhicule pour lire les codes d\'erreur.'
                }
            </Text>
        </View>

        {/* ZONE DE SCAN */}
        <View style={styles.scanZone}>
            <MockScanner isScanning={obd2Scanning} t={t} />
            
            <TouchableOpacity 
                style={[styles.scanButton, (obd2Scanning || bluetoothEnabled !== true) && {opacity: 0.5}]} 
                onPress={startScan}
                disabled={obd2Scanning || bluetoothEnabled !== true}
            >
                <MaterialCommunityIcons 
                  name={obd2Scanning ? "loading" : "car-cog"} 
                  size={20} 
                  color="#000" 
                />
                <Text style={styles.scanButtonText}>
                    {obd2Scanning ? 'Scan en cours...' : 'Démarrer le diagnostic OBD2'}
                </Text>
            </TouchableOpacity>
        </View>

        {/* RÉSULTATS OBD2 */}
        {obd2Interpretation && (
            <View style={styles.resultCard}>
                <Text style={styles.sectionTitle}>📋 Résultats du diagnostic</Text>
                
                {/* Message global */}
                <View style={[
                  styles.globalStatus,
                  obd2Interpretation.statutVehicule === 'conforme' && { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: Colors.success },
                  obd2Interpretation.statutVehicule === 'attention' && { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderColor: Colors.gold },
                  obd2Interpretation.statutVehicule === 'non-conforme' && { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: Colors.error }
                ]}>
                  <MaterialCommunityIcons 
                    name={
                      obd2Interpretation.statutVehicule === 'conforme' ? "check-circle" :
                      obd2Interpretation.statutVehicule === 'attention' ? "alert" :
                      "close-circle"
                    } 
                    size={24} 
                    color={
                      obd2Interpretation.statutVehicule === 'conforme' ? Colors.success :
                      obd2Interpretation.statutVehicule === 'attention' ? Colors.gold :
                      Colors.error
                    } 
                  />
                  <Text style={[
                    styles.globalStatusText,
                    obd2Interpretation.statutVehicule === 'conforme' && { color: Colors.success },
                    obd2Interpretation.statutVehicule === 'attention' && { color: Colors.gold },
                    obd2Interpretation.statutVehicule === 'non-conforme' && { color: Colors.error }
                  ]}>
                    {obd2Interpretation.messageGlobal}
                  </Text>
                </View>

                {/* Codes DTC détectés */}
                {obd2Interpretation.interpretations && obd2Interpretation.interpretations.length > 0 && (
                  <View style={styles.dtcCodesSection}>
                    <Text style={styles.dtcCodesTitle}>Codes d'erreur détectés :</Text>
                    {obd2Interpretation.interpretations.map((interp, index) => (
                      <View key={index} style={styles.dtcCodeCard}>
                        <View style={styles.dtcCodeHeader}>
                          <Text style={styles.dtcCodeText}>{interp.code}</Text>
                          <View style={[
                            styles.severityBadge,
                            interp.severity === 'critique' && { backgroundColor: Colors.error },
                            interp.severity === 'majeur' && { backgroundColor: Colors.gold },
                            interp.severity === 'mineur' && { backgroundColor: Colors.cyan }
                          ]}>
                            <Text style={styles.severityText}>{interp.severity}</Text>
                          </View>
                        </View>
                        <Text style={styles.dtcDescription}>{interp.description}</Text>
                        <Text style={styles.dtcExplication}>{interp.explication}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Réponse brute (debug) */}
                {obd2Result?.rawResponse && (
                  <View style={styles.debugSection}>
                    <Text style={styles.debugTitle}>Réponse brute (debug):</Text>
                    <Text style={styles.debugText}>{obd2Result.rawResponse}</Text>
                  </View>
                )}
            </View>
        )}

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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textMain },
  backButton: { padding: 5 },
  content: { padding: 20 },
  
  bluetoothStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gold,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    marginBottom: 15
  },
  bluetoothStatusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMain
  },
  refreshBtn: {
    padding: 4
  },
  
  infoCard: {
      flexDirection: 'row', alignItems: 'center', gap: 15,
      backgroundColor: 'rgba(6, 182, 212, 0.1)',
      padding: 15, borderRadius: 12, marginBottom: 30,
      borderWidth: 1, borderColor: Colors.cyan
  },
  infoText: { color: Colors.textSub, flex: 1, fontSize: 13 },

  scanZone: { alignItems: 'center', marginBottom: 30 },
  scannerCircle: {
      width: 150, height: 150, borderRadius: 75,
      borderWidth: 2, borderColor: Colors.cyan,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: '#222', marginBottom: 20,
      shadowColor: Colors.cyan, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10
  },
  scanButton: {
      backgroundColor: Colors.cyan, 
      paddingHorizontal: 40, 
      paddingVertical: 15, 
      borderRadius: 30, 
      elevation: 5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10
  },
  scanButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#FFF',
    marginTop: 10,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  readyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  readyText: {
    color: '#FFF',
    marginTop: 10,
    fontWeight: 'bold',
    textAlign: 'center'
  },

  resultCard: {
      backgroundColor: Colors.card, 
      padding: 20, 
      borderRadius: 16
  },
  sectionTitle: { 
    color: '#FFF', 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#444', 
    paddingBottom: 10 
  },
  
  globalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    marginBottom: 20
  },
  globalStatusText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600'
  },
  
  dtcCodesSection: {
    marginTop: 10
  },
  dtcCodesTitle: {
    color: Colors.textMain,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10
  },
  dtcCodeCard: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.cyan
  },
  dtcCodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  dtcCodeText: {
    color: Colors.textMain,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace'
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  severityText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  dtcDescription: {
    color: Colors.textSub,
    fontSize: 14,
    marginBottom: 4
  },
  dtcExplication: {
    color: Colors.textSub,
    fontSize: 13,
    fontStyle: 'italic'
  },
  
  debugSection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444'
  },
  debugTitle: {
    color: Colors.textSub,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5
  },
  debugText: {
    color: Colors.textSub,
    fontSize: 11,
    fontFamily: 'monospace'
  },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  label: { color: Colors.textSub, fontSize: 16 },
  
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  
  codeTag: { backgroundColor: Colors.error, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  codeText: { color: '#FFF', fontWeight: 'bold' }
});