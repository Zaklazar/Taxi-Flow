import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';

export interface OBD2Result {
  success: boolean;
  dtcCodes?: string[];
  rawResponse?: string;
  error?: string;
}

export class OBD2Manager {
  private static manager: BleManager | null = null;
  private static connectedDevice: Device | null = null;
  private static isConnected: boolean = false;
  private static responseBuffer: string = '';
  private static readonly TIMEOUT_MS = 5000;
  private static bleAvailable: boolean | null = null;
  
  // UUIDs pour ELM327 (standard)
  private static readonly OBD_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
  private static readonly OBD_WRITE_CHAR_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';
  private static readonly OBD_NOTIFY_CHAR_UUID = '0000fff2-0000-1000-8000-00805f9b34fb';

  static checkBleAvailability(): boolean {
    if (this.bleAvailable !== null) {
      return this.bleAvailable;
    }
    
    // Vérifier si le module natif BLE est disponible
    const BleModule = NativeModules.BleClientManager || NativeModules.BlePlxModule;
    this.bleAvailable = BleModule !== undefined && BleModule !== null;
    
    if (!this.bleAvailable) {
      console.warn('⚠️ Module BLE natif non disponible. Utilisez un build natif (pas Expo Go).');
    }
    
    return this.bleAvailable;
  }

  static async initialize(): Promise<void> {
    try {
      if (!this.checkBleAvailability()) {
        throw new Error('Module BLE non disponible. Veuillez compiler l\'application avec un build natif.');
      }
      
      if (!this.manager) {
        this.manager = new BleManager();
      }
      console.log('✅ BleManager (PLX) initialisé');
      
      // Demander les permissions Android
      if (Platform.OS === 'android') {
        const permissions: string[] = [];
        
        // Android 12+ (API 31+) : Permissions BLE nouvelles
        if (parseInt(Platform.Version as string) >= 31) {
          permissions.push(
            'android.permission.BLUETOOTH_SCAN',
            'android.permission.BLUETOOTH_CONNECT',
            'android.permission.ACCESS_FINE_LOCATION'
          );
        } else {
          // Android < 12 : Permissions classiques
          permissions.push(
            'android.permission.BLUETOOTH',
            'android.permission.BLUETOOTH_ADMIN',
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION'
          );
        }
        
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        console.log('📱 Permissions Bluetooth:', granted);
        
        // Vérifier si toutes les permissions sont accordées
        const allGranted = Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED
        );
        
        if (!allGranted) {
          console.warn('⚠️ Certaines permissions Bluetooth n\'ont pas été accordées');
        }
      } else if (Platform.OS === 'web') {
        console.log('🌐 Web : Pas de permissions Bluetooth requises');
      }
    } catch (error) {
      console.error('❌ Erreur initialisation BLE:', error);
      throw error;
    }
  }

  static async checkBluetoothState(): Promise<State> {
    if (!this.checkBleAvailability()) {
      return State.Unsupported;
    }
    
    if (!this.manager) {
      await this.initialize();
    }
    return await this.manager!.state();
  }

  static async scanForOBD2Device(): Promise<Device[]> {
    try {
      await this.initialize();
      
      const devices: Device[] = [];
      const deviceIds = new Set<string>();
      
      console.log('🔍 Début du scan Bluetooth (10 secondes)...');
      
      this.manager!.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('❌ Erreur scan:', error);
          return;
        }
        
        if (device && device.name) {
          console.log('🔍 Périphérique trouvé:', device.name, device.id);
          
          if ((device.name.includes('OBD') || 
               device.name.includes('ELM327') ||
               device.name.includes('OBDII') ||
               device.name.includes('CHX')) &&
              !deviceIds.has(device.id)) {
            devices.push(device);
            deviceIds.add(device.id);
            console.log('✅ Scanner OBD2 détecté:', device.name, device.id);
          }
        }
      });
      
      return new Promise((resolve) => {
        setTimeout(() => {
          this.manager!.stopDeviceScan();
          console.log(`🔍 Scan terminé - ${devices.length} scanner(s) OBD2 trouvé(s)`);
          resolve(devices);
        }, 10000);
      });
    } catch (error) {
      console.error('❌ Erreur scan Bluetooth:', error);
      throw error;
    }
  }

  static async connect(device: Device): Promise<boolean> {
    try {
      console.log('🔗 Connexion à', device.name, device.id);
      
      this.connectedDevice = await device.connect();
      console.log('✅ Device connecté');
      
      await this.connectedDevice.discoverAllServicesAndCharacteristics();
      console.log('✅ Services découverts');
      
      // S'abonner aux notifications
      this.connectedDevice.monitorCharacteristicForService(
        this.OBD_SERVICE_UUID,
        this.OBD_NOTIFY_CHAR_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('❌ Erreur notification:', error);
            return;
          }
          
          if (characteristic?.value) {
            const response = Buffer.from(characteristic.value, 'base64').toString('ascii');
            this.responseBuffer += response;
            console.log('📡 Réponse OBD2:', response);
          }
        }
      );
      
      this.isConnected = true;
      console.log('✅ Connecté à OBD2');
      return true;
    } catch (error) {
      console.error('❌ Erreur connexion OBD2:', error);
      return false;
    }
  }

  static async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
        this.isConnected = false;
        this.connectedDevice = null;
        console.log('✅ Déconnecté de OBD2');
      } catch (error) {
        console.error('❌ Erreur déconnexion:', error);
      }
    }
  }

  private static async sendCommand(command: string): Promise<string> {
    if (!this.connectedDevice || !this.isConnected) {
      throw new Error('Non connecté à un périphérique OBD2');
    }

    this.responseBuffer = '';
    
    const commandWithCR = command + '\r';
    const base64Command = Buffer.from(commandWithCR).toString('base64');
    
    console.log('📤 Envoi commande:', command);
    
    await this.connectedDevice.writeCharacteristicWithResponseForService(
      this.OBD_SERVICE_UUID,
      this.OBD_WRITE_CHAR_UUID,
      base64Command
    );

    // Attendre la réponse avec timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: Aucune réponse du scanner OBD2'));
      }, this.TIMEOUT_MS);

      const checkResponse = setInterval(() => {
        if (this.responseBuffer.includes('>')) {
          clearInterval(checkResponse);
          clearTimeout(timeout);
          const response = this.responseBuffer.trim();
          console.log('📥 Réponse reçue:', response);
          resolve(response);
        }
      }, 100);
    });
  }

  static async initializeOBD2Protocol(): Promise<boolean> {
    try {
      console.log('🔧 Initialisation protocole OBD2...');
      
      // ATZ - Reset
      console.log('📤 Envoi: ATZ (Reset)');
      await this.sendCommand('ATZ');
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('✅ ATZ OK');
      
      // ATE0 - Echo OFF
      console.log('📤 Envoi: ATE0 (Echo OFF)');
      await this.sendCommand('ATE0');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ ATE0 OK');
      
      // ATL0 - Line feeds OFF
      console.log('📤 Envoi: ATL0 (Line feeds OFF)');
      await this.sendCommand('ATL0');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ ATL0 OK');
      
      // ATSP0 - Auto protocol detection
      console.log('📤 Envoi: ATSP0 (Auto protocol)');
      await this.sendCommand('ATSP0');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ ATSP0 OK');
      
      // 0100 - Vérifier connexion ECU
      console.log('📤 Envoi: 0100 (Test ECU)');
      const ecuResponse = await this.sendCommand('0100');
      console.log('📥 Réponse ECU:', ecuResponse);
      
      if (ecuResponse.includes('NO DATA') || ecuResponse.includes('ERROR')) {
        console.error('❌ ECU non détecté - Réponse:', ecuResponse);
        return false;
      }
      
      console.log('✅ Protocole OBD2 initialisé avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur initialisation protocole:', error);
      return false;
    }
  }

  static async readDTCCodes(): Promise<OBD2Result> {
    try {
      if (!this.isConnected) {
        return {
          success: false,
          error: 'Non connecté au scanner OBD2'
        };
      }

      console.log('🔍 Lecture des codes DTC...');
      console.log('📤 Envoi: 03 (Read DTC)');
      const response = await this.sendCommand('03');
      console.log('📥 Réponse brute DTC:', response);
      
      if (response.includes('NO DATA') || response === '') {
        console.log('✅ Aucun code DTC détecté');
        return {
          success: true,
          dtcCodes: [],
          rawResponse: response
        };
      }

      // Parser les codes DTC
      const dtcCodes = this.parseDTCCodes(response);
      console.log('✅ Codes DTC extraits:', dtcCodes);
      
      return {
        success: true,
        dtcCodes,
        rawResponse: response
      };
    } catch (error: any) {
      console.error('❌ Erreur lecture DTC:', error);
      return {
        success: false,
        error: error.message || 'Erreur de communication avec le scanner OBD2'
      };
    }
  }

  private static parseDTCCodes(response: string): string[] {
    const codes: string[] = [];
    
    // Nettoyer la réponse
    const cleanResponse = response
      .replace(/\s+/g, '')
      .replace('43', '')
      .replace('>', '');
    
    // Extraire les codes DTC (format: 2 octets par code)
    for (let i = 0; i < cleanResponse.length; i += 4) {
      const codeHex = cleanResponse.substr(i, 4);
      if (codeHex && codeHex !== '0000') {
        const dtcCode = this.hexToDTC(codeHex);
        if (dtcCode) {
          codes.push(dtcCode);
        }
      }
    }
    
    return codes;
  }

  private static hexToDTC(hex: string): string | null {
    if (hex.length !== 4) return null;
    
    const firstByte = parseInt(hex.substr(0, 2), 16);
    const secondByte = parseInt(hex.substr(2, 2), 16);
    
    // Déterminer le préfixe (P, C, B, U)
    const prefixes = ['P', 'C', 'B', 'U'];
    const prefixIndex = (firstByte >> 6) & 0x03;
    const prefix = prefixes[prefixIndex];
    
    // Extraire les chiffres
    const digit1 = (firstByte >> 4) & 0x03;
    const digit2 = firstByte & 0x0F;
    const digit3 = (secondByte >> 4) & 0x0F;
    const digit4 = secondByte & 0x0F;
    
    return `${prefix}${digit1}${digit2.toString(16).toUpperCase()}${digit3.toString(16).toUpperCase()}${digit4.toString(16).toUpperCase()}`;
  }

  static async clearDTCCodes(): Promise<boolean> {
    try {
      console.log('🗑️ Effacement des codes DTC...');
      const response = await this.sendCommand('04');
      
      if (response.includes('44') || response.includes('OK')) {
        console.log('✅ Codes DTC effacés');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erreur effacement DTC:', error);
      return false;
    }
  }

  static destroy() {
    if (this.manager) {
      this.manager.destroy();
      this.manager = null;
    }
  }
}
