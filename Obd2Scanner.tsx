import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { errorHandler, ErrorType } from '../utils/errorHandler';

interface Obd2Data {
  codes_erreur: string[];
  frein_status: 'OK' | 'ATTENTION' | 'URGENT';
  engine_status: 'OK' | 'CHECK_ENGINE';
}

interface Obd2ScannerProps {
  onDataReceived: (data: Obd2Data) => void;
}

// Tentative d'import conditionnel de react-native-ble-plx
let BleManager: any = null;
let Device: any = null;
let bleAvailable = false;

try {
  const bleModule = require('react-native-ble-plx');
  if (bleModule && bleModule.BleManager) {
    BleManager = bleModule.BleManager;
    Device = bleModule.Device;
    bleAvailable = true;
  }
} catch (e) {
  console.log('Bluetooth module not available - Code: OBD001');
  errorHandler.log(ErrorType.BLUETOOTH, 'Module Bluetooth non disponible', { code: 'OBD001' });
  bleAvailable = false;
}

export default function Obd2Scanner({ onDataReceived }: Obd2ScannerProps) {
  const [manager, setManager] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [device, setDevice] = useState<any>(null);
  const [obdData, setObdData] = useState<Obd2Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simulationMode, setSimulationMode] = useState(!bleAvailable);
  const [initialized, setInitialized] = useState(false);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      if (manager) {
        try {
          manager.destroy();
        } catch (e) {
          console.log('Erreur nettoyage - Code: OBD002');
          errorHandler.log(ErrorType.BLUETOOTH, 'Erreur nettoyage manager Bluetooth', { code: 'OBD002' });
        }
      }
    };
  }, [manager]);

  const initializeBluetooth = async () => {
    if (initialized) return;
    
    setError(null);
    
    // Vérifie si Bluetooth est disponible
    if (!bleAvailable || !BleManager) {
      setSimulationMode(true);
      setInitialized(true);
      return;
    }

    try {
      // Initialise le BleManager seulement maintenant
      const bleManager = new BleManager();
      setManager(bleManager);
      setInitialized(true);

      // Vérifie si Bluetooth est activé
      const subscription = bleManager.onStateChange((state: string) => {
        if (state === 'PoweredOff') {
          setError('Bluetooth est désactivé. Veuillez l&apos;activer.');
        } else if (state === 'Unauthorized') {
          setError('Permission Bluetooth nécessaire.');
        } else {
          setError(null);
        }
      }, true);

      // Nettoyage sera fait dans useEffect
    } catch (err: any) {
      console.error('Erreur initialisation Bluetooth:', err);
      setSimulationMode(true);
      setInitialized(true);
    }
  };

  const scanDevices = async () => {
    // Initialise Bluetooth si pas encore fait
    if (!initialized) {
      await initializeBluetooth();
    }

    // Mode simulation pour tester sans Bluetooth réel
    if (simulationMode || !manager) {
      setScanning(true);
      setError(null);
      
      // Simule un scan de 3 secondes
      setTimeout(() => {
        setScanning(false);
        setConnecting(true);
        
        // Simule une connexion réussie après 1 seconde
        setTimeout(() => {
          setConnecting(false);
          setConnected(true);
          setDevice({ name: 'OBD2 Simulateur' } as any);
          
          // Simule la lecture des codes d'erreur
          readErrorCodes(null);
        }, 1000);
      }, 3000);
      return;
    }

    try {
      setScanning(true);
      setError(null);

      // Scanne les appareils Bluetooth pendant 5 secondes
      manager.startDeviceScan(null, null, (err: any, scannedDevice: any) => {
        if (err) {
          setError(err.message);
          setScanning(false);
          return;
        }

        // Recherche les adaptateurs OBD2 (généralement nommés "OBD", "ELM327", "Vgate")
        if (scannedDevice?.name?.toUpperCase().includes('OBD') ||
            scannedDevice?.name?.toUpperCase().includes('ELM') ||
            scannedDevice?.name?.toUpperCase().includes('VGATE')) {
          manager.stopDeviceScan();
          connectToDevice(scannedDevice);
        }
      });

      // Arrête le scan après 10 secondes
      setTimeout(() => {
        if (manager) {
          manager.stopDeviceScan();
        }
        setScanning(false);
        if (!connected) {
          setError('Aucun adaptateur OBD2 trouvé. Vérifiez que l&apos;appareil est allumé et à proximité.');
        }
      }, 10000);
    } catch (err: any) {
      setError(err.message);
      setScanning(false);
    }
  };

  const connectToDevice = async (deviceToConnect: any) => {
    if (simulationMode || !deviceToConnect) {
      setConnected(true);
      readErrorCodes(null);
      return;
    }

    try {
      setConnecting(true);
      setError(null);

      const connectedDevice = await deviceToConnect.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();

      setDevice(connectedDevice);
      setConnected(true);
      setConnecting(false);

      // Commence à lire les codes d'erreur
      readErrorCodes(connectedDevice);
    } catch (err: any) {
      setError(`Erreur de connexion: ${err.message}`);
      setConnecting(false);
    }
  };

  // ✅ CONFIGURATION ELM327 BLE
  const ELM327_CONFIG = {
    serviceUUID: '0000FFE0-0000-1000-8000-00805F9B34FB',
    characteristicUUID: '0000FFE1-0000-1000-8000-00805F9B34FB',
    // Séquence d'initialisation complète inspirée de Car Scanner
    initCommands: [
      'ATZ\r',      // Reset complet du module
      'ATE0\r',     // Désactiver écho (évite doublons)
      'ATL0\r',     // Désactiver line feeds
      'ATS0\r',     // Désactiver espaces dans réponses
      'ATH1\r',     // Activer headers (pour debug)
      'ATAT1\r',    // Adaptive timing auto (meilleure fiabilité)
      'ATSP0\r',    // Auto-détection protocole
      '0100\r',     // Test communication (Mode 01 PID 00)
    ],
  };

  // ✅ HELPERS ENCODAGE/DÉCODAGE (sans dépendance Buffer)
  const stringToBase64 = (str: string): string => {
    // Convertit string ASCII en base64 pour React Native
    const bytes = str.split('').map(c => c.charCodeAt(0));
    const binString = String.fromCharCode(...bytes);
    return btoa(binString);
  };

  const base64ToString = (base64: string): string => {
    // Convertit base64 en string ASCII
    try {
      const binString = atob(base64);
      return binString.split('').map(c => String.fromCharCode(c.charCodeAt(0))).join('');
    } catch {
      return '';
    }
  };

  // ✅ ENVOI COMMANDE OBD2 VIA BLE
  const sendOBDCommand = async (device: any, command: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        let responseData = '';
        let timeoutHandle: ReturnType<typeof setTimeout>;

        console.log(`📤 Envoi commande: ${command.trim()}`);

        // Subscription pour recevoir les réponses
        const subscription = device.monitorCharacteristicForService(
          ELM327_CONFIG.serviceUUID,
          ELM327_CONFIG.characteristicUUID,
          (error: any, characteristic: any) => {
            if (error) {
              console.error('❌ Erreur monitoring:', error);
              subscription?.remove();
              clearTimeout(timeoutHandle);
              reject(error);
              return;
            }

            if (characteristic?.value) {
              // Décode base64 en texte
              const decoded = base64ToString(characteristic.value);
              console.log(`📥 Reçu: "${decoded}"`);
              responseData += decoded;

              // Attend réponse complète (terminée par '>' ou contient 'OK'/'ERROR')
              if (decoded.includes('>') || decoded.includes('OK') || decoded.includes('ERROR') || decoded.includes('NO DATA')) {
                subscription?.remove();
                clearTimeout(timeoutHandle);
                console.log(`✅ Réponse complète: "${responseData.trim()}"`);
                resolve(responseData.trim());
              }
            }
          }
        );

        // Timeout augmenté à 10 secondes
        timeoutHandle = setTimeout(() => {
          console.warn(`⏱️ Timeout atteint. Réponse partielle: "${responseData}"`);
          subscription?.remove();
          resolve(responseData.trim() || 'NO DATA');
        }, 10000);

        // Encode et envoie la commande
        const commandBuffer = stringToBase64(command);
        await device.writeCharacteristicWithResponseForService(
          ELM327_CONFIG.serviceUUID,
          ELM327_CONFIG.characteristicUUID,
          commandBuffer
        );
      } catch (err) {
        console.error('❌ Erreur sendOBDCommand:', err);
        reject(err);
      }
    });
  };

  // ✅ PARSER CODES DTC (DIAGNOSTIC TROUBLE CODES)
  const parseDTCCodes = (response: string): string[] => {
    const codes: string[] = [];
    
    console.log(`🔍 Parsing DTC. Réponse brute: "${response}"`);
    
    // Nettoie la réponse (enlève espaces, retours ligne, '>', headers possibles)
    let cleaned = response.replace(/\s/g, '').replace(/>/g, '').toUpperCase();
    
    // Enlève headers possibles (ex: "48 6B 10 41" ou similaires avant "43")
    // Les headers peuvent être 3 ou 4 bytes avant la vraie réponse
    if (cleaned.includes('43')) {
      const idx43 = cleaned.indexOf('43');
      // Si il y a plus de 12 caractères hex avant le 43, c'est probablement un header
      if (idx43 > 12) {
        cleaned = cleaned.substring(idx43);
        console.log(`🧹 Headers détectés et enlevés. Nouvelle réponse: "${cleaned}"`);
      }
    }
    
    console.log(`🧹 Réponse nettoyée: "${cleaned}"`);
    
    // Vérifie "NO DATA" ou réponse vide
    if (cleaned.includes('NODATA') || cleaned.includes('UNABLETOCONNECT') || cleaned.length < 4) {
      console.log('ℹ️ Aucune donnée ou réponse vide');
      return codes;
    }
    
    // Vérifie si réponse MODE 03 (commence par '43')
    if (!cleaned.includes('43')) {
      console.warn(`⚠️ Réponse ne contient pas "43". Format inattendu.`);
      return codes;
    }

    // Extrait les bytes après '43'
    const dataStart = cleaned.indexOf('43') + 2;
    const numCodesHex = cleaned.substring(dataStart, dataStart + 2);
    const numCodes = parseInt(numCodesHex, 16);
    
    console.log(`📊 Nombre de codes (hex: ${numCodesHex}, décimal: ${numCodes})`);

    if (numCodes === 0 || isNaN(numCodes)) {
      console.log('ℹ️ Aucun code d\'erreur (numCodes = 0 ou NaN)');
      return codes;
    }

    // Extrait chaque DTC (2 bytes / 4 caractères hex chacun)
    let offset = dataStart + 2;
    for (let i = 0; i < numCodes && offset + 4 <= cleaned.length; i++) {
      const dtcHex = cleaned.substring(offset, offset + 4);
      
      // Ignore les padding "0000" ou "FFFF"
      if (dtcHex === '0000' || dtcHex === 'FFFF') {
        console.log(`  ⏭️ DTC ${i + 1}: "${dtcHex}" (padding ignoré)`);
        offset += 4;
        continue;
      }
      
      const dtcValue = parseInt(dtcHex, 16);
      console.log(`  🔢 DTC ${i + 1}: hex="${dtcHex}", value=${dtcValue}`);

      // Décode le type de code (2 premiers bits du premier byte)
      const firstByte = parseInt(dtcHex.substring(0, 2), 16);
      const type = (firstByte >> 6) & 0x3;
      const typeChar = ['P', 'C', 'B', 'U'][type];

      // Le reste forme le code numérique
      const digit1 = (firstByte >> 4) & 0x3;
      const digit2 = firstByte & 0x0F;
      const digit3 = parseInt(dtcHex.substring(2, 3), 16);
      const digit4 = parseInt(dtcHex.substring(3, 4), 16);

      const fullCode = `${typeChar}${digit1}${digit2.toString(16).toUpperCase()}${digit3.toString(16).toUpperCase()}${digit4.toString(16).toUpperCase()}`;
      console.log(`  ✅ Code DTC décodé: ${fullCode}`);
      codes.push(fullCode);
      offset += 4;
    }

    console.log(`🎯 Total codes extraits: ${codes.length}`, codes);
    return codes;
  };

  // ✅ INITIALISATION ELM327
  const initializeELM327 = async (device: any): Promise<boolean> => {
    try {
      console.log('🔧 Initialisation ELM327...');
      
      for (let i = 0; i < ELM327_CONFIG.initCommands.length; i++) {
        const cmd = ELM327_CONFIG.initCommands[i];
        console.log(`📤 [${i + 1}/${ELM327_CONFIG.initCommands.length}] ${cmd.trim()}`);
        
        const response = await sendOBDCommand(device, cmd);
        console.log(`📥 Réponse: "${response}"`);
        
        // Vérifie erreurs critiques (sauf pour test 0100)
        if (cmd !== '0100\r') {
          if (response.includes('ERROR')) {
            console.error(`❌ Erreur initialisation: ${response}`);
            return false;
          }
          // UNABLE TO CONNECT est OK pour certaines commandes AT
          if (response.includes('UNABLE TO CONNECT')) {
            console.warn(`⚠️ ${cmd.trim()}: UNABLE TO CONNECT (continuera quand même)`);
          }
        }
        
        // Délai plus long après ATZ (reset prend du temps)
        if (cmd === 'ATZ\r') {
          console.log('⏳ Attente 2s après reset...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log('✅ ELM327 initialisé avec succès');
      return true;
    } catch (err: any) {
      console.error('❌ Erreur initialisation ELM327:', err);
      return false;
    }
  };

  // ✅ LECTURE CODES ERREUR RÉELLE
  const readErrorCodes = async (connectedDevice: any) => {
    // Mode simulation
    if (simulationMode || !connectedDevice) {
      const data: Obd2Data = {
        codes_erreur: [],
        frein_status: 'OK',
        engine_status: 'OK',
      };
      setObdData(data);
      onDataReceived(data);
      return;
    }

    try {
      console.log('📡 Lecture codes erreur OBD2...');

      // 1. Initialise ELM327
      const initialized = await initializeELM327(connectedDevice);
      if (!initialized) {
        throw new Error('Échec initialisation ELM327');
      }

      // 2. Envoie commande MODE 03 (Read DTCs)
      const dtcResponse = await sendOBDCommand(connectedDevice, '03\r');
      console.log('Réponse MODE 03:', dtcResponse);

      // 3. Parse les codes erreur
      const dtcCodes = parseDTCCodes(dtcResponse);
      console.log('Codes DTC extraits:', dtcCodes);

      // 4. Détermine statut moteur et freins basé sur codes
      let engineStatus: 'OK' | 'CHECK_ENGINE' = 'OK';
      let freinStatus: 'OK' | 'ATTENTION' | 'URGENT' = 'OK';

      // Check Engine si codes présents
      if (dtcCodes.length > 0) {
        engineStatus = 'CHECK_ENGINE';

        // Codes critiques freins (exemples)
        const brakeRelatedCodes = ['C0035', 'C0040', 'C0045', 'C0050', 'C0110', 'C0121'];
        const hasCriticalBrake = dtcCodes.some(code => brakeRelatedCodes.includes(code));
        
        if (hasCriticalBrake) {
          freinStatus = 'URGENT';
        } else if (dtcCodes.some(code => code.startsWith('C'))) {
          // Codes C (Chassis) peuvent indiquer problème freins
          freinStatus = 'ATTENTION';
        }
      }

      const data: Obd2Data = {
        codes_erreur: dtcCodes,
        frein_status: freinStatus,
        engine_status: engineStatus,
      };

      setObdData(data);
      onDataReceived(data);
      console.log('✅ Scan OBD2 terminé:', data);
    } catch (err: any) {
      console.error('❌ Erreur lecture codes:', err);
      setError(`Erreur lecture codes: ${err.message}`);
      
      // Fallback avec données vides en cas d'erreur
      const fallbackData: Obd2Data = {
        codes_erreur: [],
        frein_status: 'OK',
        engine_status: 'OK',
      };
      setObdData(fallbackData);
      onDataReceived(fallbackData);
    }
  };

  const disconnect = async () => {
    if (simulationMode) {
      setDevice(null);
      setConnected(false);
      setObdData(null);
      return;
    }

    if (device && manager) {
      try {
        await device.cancelConnection();
        setDevice(null);
        setConnected(false);
        setObdData(null);
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="car-connected" size={24} color="#0056b3" />
        <Text style={styles.title}>Scanner OBD2</Text>
        {simulationMode && initialized && (
          <View style={styles.simBadge}>
            <Text style={styles.simText}>SIMULATION</Text>
          </View>
        )}
      </View>

      {error && initialized && (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={20} color="#d32f2f" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!connected ? (
        <TouchableOpacity
          style={[styles.button, scanning || connecting && styles.buttonDisabled]}
          onPress={scanDevices}
          disabled={scanning || connecting}
        >
          {scanning || connecting ? (
            <>
              <ActivityIndicator color="#fff" style={styles.loader} />
              <Text style={styles.buttonText}>
                {scanning ? 'Recherche en cours...' : 'Connexion...'}
              </Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="bluetooth-connect" size={20} color="#fff" />
              <Text style={styles.buttonText}>Rechercher OBD2</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.connectedContainer}>
          <View style={styles.statusRow}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
            <Text style={styles.connectedText}>Connecté à {device?.name || 'OBD2'}</Text>
            <TouchableOpacity onPress={disconnect} style={styles.disconnectButton}>
              <Text style={styles.disconnectText}>Déconnecter</Text>
            </TouchableOpacity>
          </View>

          {obdData && (
            <View style={styles.dataContainer}>
              <Text style={styles.dataTitle}>Données OBD2:</Text>
              
              <View style={styles.statusRow}>
                <Text style={styles.label}>Moteur:</Text>
                <View style={[
                  styles.statusBadge,
                  obdData.engine_status === 'CHECK_ENGINE' && styles.statusBadgeWarning
                ]}>
                  <Text style={styles.statusText}>
                    {obdData.engine_status === 'CHECK_ENGINE' ? '⚠️ Check Engine' : '✓ OK'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.label}>Freins:</Text>
                <View style={[
                  styles.statusBadge,
                  obdData.frein_status === 'URGENT' && styles.statusBadgeDanger,
                  obdData.frein_status === 'ATTENTION' && styles.statusBadgeWarning
                ]}>
                  <Text style={styles.statusText}>
                    {obdData.frein_status === 'OK' && '✓ OK'}
                    {obdData.frein_status === 'ATTENTION' && '⚠️ ATTENTION'}
                    {obdData.frein_status === 'URGENT' && '🚨 URGENT'}
                  </Text>
                </View>
              </View>

              {obdData.codes_erreur.length > 0 && (
                <View style={styles.codesContainer}>
                  <Text style={styles.codesTitle}>Codes d'erreur détectés:</Text>
                  {obdData.codes_erreur.map((code, index) => (
                    <View key={index} style={styles.codeItem}>
                      <MaterialCommunityIcons name="alert" size={16} color="#ff9800" />
                      <Text style={styles.codeText}>{code}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
    flex: 1,
  },
  simBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 10,
  },
  simText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#0056b3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginRight: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    flex: 1,
  },
  connectedContainer: {
    marginTop: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  connectedText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  disconnectButton: {
    padding: 8,
  },
  disconnectText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '600',
  },
  dataContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#e8f5e9',
  },
  statusBadgeWarning: {
    backgroundColor: '#fff3e0',
  },
  statusBadgeDanger: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  codesContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  codesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  codeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 6,
    gap: 8,
  },
  codeText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
});

