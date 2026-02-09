import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as MailComposer from 'expo-mail-composer';
import { Stack, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import ComplianceCalendar from '../components/ComplianceCalendar';
import DeclareRepairModal from '../components/DeclareRepairModal';
import { DEFECT_RULES } from '../constants/defectRules';
import { NetworkMonitor } from '../services/NetworkMonitor';
import { ProfileManager } from '../services/ProfileManager';
import { SafetyRoundOfflineService } from '../services/SafetyRoundOfflineService';
import { CreateSafetyRoundInput, DefectDetail, SafetyRound } from '../types/safetyRound';

// --- THÈME DARK LUXE ---
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

export default function RondeSecuriteScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  
  // États
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStatus, setModalStatus] = useState<'conforme' | 'defaut_mineur' | 'defaut_majeur'>('conforme');
  const [modalMessage, setModalMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Données
  const [odometre, setOdometre] = useState('');
  const [observations, setObservations] = useState('');
  const [isRental, setIsRental] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  // Calendrier et rondes du jour
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dayRounds, setDayRounds] = useState<SafetyRound[]>([]);

  // Modal réparation
  const [repairModalVisible, setRepairModalVisible] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<{ checkName: string; checkLabel: string } | null>(null);

  // IDs et infos véhicule
  const [chauffeurId, setChauffeurId] = useState('chauffeur-1');
  const [vehiculeId, setVehiculeId] = useState('vehicule-1');
  const [vehicleInfo, setVehicleInfo] = useState('');
  
  // Profil complet du chauffeur (pour le rapport détaillé)
  const [driverProfile, setDriverProfile] = useState<any>(null);

  // Charger les infos du profil au montage
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await ProfileManager.getProfile();
      if (profile) {
        // Stocker le profil complet pour le rapport
        setDriverProfile(profile);
        
        // Utiliser le nom comme ID chauffeur
        if (profile.name) {
          setChauffeurId(profile.name);
        }
        
        // Créer l'ID véhicule avec marque/modèle/année ou plaque
        if (profile.vehicleMake && profile.vehicleModel && profile.vehicleYear) {
          const vehicleDesc = `${profile.vehicleMake} ${profile.vehicleModel} ${profile.vehicleYear}`;
          setVehiculeId(vehicleDesc);
          setVehicleInfo(vehicleDesc + (profile.vehiclePlate ? ` (${profile.vehiclePlate})` : ''));
        } else if (profile.vehiclePlate) {
          setVehiculeId(profile.vehiclePlate);
          setVehicleInfo(profile.vehiclePlate);
        }
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    }
  };

  // État des vérifications
  const [checks, setChecks] = useState<{[key: string]: boolean}>({
    check_phares_feux: true,
    check_pneus: true,
    check_essuie_glaces: true,
    check_retroviseurs: true,
    check_fuites: true,
    check_frein_stationnement: true,
    check_liquide_frein: true,
    check_direction: true,
    check_klaxon: true,
    check_degivrage: true,
    check_voyants_tableau: true,
    check_ceintures: true,
    check_lanternon: true,
    check_taximetre: true,
    check_proprete: true,
    check_trousse: true,
  });

  // Mapping des clés techniques vers les clés de traduction
  const getCheckTranslationKey = (checkKey: string): string => {
    const mapping: {[key: string]: string} = {
      'check_phares_feux': 'lights',
      'check_pneus': 'tires',
      'check_essuie_glaces': 'wipers',
      'check_retroviseurs': 'mirrors',
      'check_fuites': 'leaks',
      'check_frein_stationnement': 'handbrake',
      'check_liquide_frein': 'serviceBrake',
      'check_direction': 'steering',
      'check_klaxon': 'horn',
      'check_degivrage': 'heating',
      'check_voyants_tableau': 'dashboard',
      'check_ceintures': 'seatbelts',
      'check_lanternon': 'beacon',
      'check_taximetre': 'taximeter',
      'check_proprete': 'cleanliness',
      'check_trousse': 'firstAidKit',
    };
    return mapping[checkKey] || checkKey.replace('check_', '');
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        console.log('Utilisateur non connecté');
        setRefreshing(false);
        return;
      }

      // Charger les rondes (offline-first)
      const rounds = await SafetyRoundOfflineService.getSafetyRounds(user.uid);
      
      // Filtrer les rondes des 72 dernières heures
      const now = new Date();
      const seventyTwoHoursAgo = new Date(now.getTime() - (72 * 60 * 60 * 1000));
      
      const recentRounds = rounds.filter(round => {
        if (!round.date) return false; // Ignorer les rondes sans date
        const roundDate = new Date(round.date);
        return roundDate >= seventyTwoHoursAgo;
      });
      
      // Convertir au format historique local pour compatibilité UI
      const historyItems = recentRounds.map(round => ({
        id: round.id,
        date: round.date,
        odometre: round.odometre,
        statut: round.statut,
        vehicule: round.vehicleId,
        note: round.observations || '',
        checks: round.checks,
        defects: round.defects || [],
        photos: round.photos || [],
      }));

      setHistory(historyItems);
      setRefreshing(false);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      setRefreshing(false);
    }
  };

  const toggleSwitch = (key: string) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sendReportToOwner = async (rondeData: any, isConforme: boolean) => {
    const isAvailable = await MailComposer.isAvailableAsync();
    
    if (isAvailable && ownerEmail) {
      const hasMajeur = Object.entries(checks).some(([key, val]) => !val && DEFECT_RULES[key] === 'majeur');
      const severityTitle = hasMajeur ? t('ronde.majorSeverity') : t('ronde.minorSeverity');

      const subject = `${hasMajeur ? t('ronde.emailSubjectMajor') : t('ronde.emailSubjectMinor')} - ${new Date().toLocaleDateString()}`;
      
      const defautsList = Object.entries(checks)
        .filter(([key, val]) => !val)
        .map(([key]) => {
            const gravite = DEFECT_RULES[key] === 'majeur' ? t('ronde.majorTag') : t('ronde.minorTag');
            return `- ${key.replace('check_', '').toUpperCase()} ${gravite}`;
        })
        .join('\n');

      const body = `
      ${t('ronde.emailBodyTitle')}
      -------------------------------------
      ${t('ronde.emailBodyDate')} ${new Date().toLocaleString()}
      ${t('ronde.emailBodyVehicle')} ${t('ronde.vehicleName')} (${t('ronde.vehicleId')})
      ${t('ronde.emailBodyDriver')} ${chauffeurId}
      ${t('ronde.emailBodyOdometer')} ${rondeData.odometre} ${t('common.km').toLowerCase()}
      
      ${t('ronde.emailBodyStatus')} (${severityTitle})
      
      ${t('ronde.emailBodyDefects')}
      ${defautsList || t('ronde.emailBodyNoDefects')}
      
      ${t('ronde.emailBodyObservations')}
      ${observations || t('ronde.emailBodyNoObservations')}
      
      ${hasMajeur ? t('ronde.emailBodyUrgent') : t('ronde.emailBodyRepair')}
      `;

      await MailComposer.composeAsync({
        recipients: [ownerEmail],
        subject: subject,
        body: body,
      });
    } else {
        Alert.alert(t('common.info'), t('ronde.emailError'));
    }
  };

  const validerRonde = async () => {
    if (isRental && !ownerEmail.includes('@')) {
        Alert.alert(t('common.error'), t('ronde.ownerEmailError'));
        return;
    }
    if (!odometre || isNaN(parseInt(odometre))) {
      Alert.alert(t('common.error'), t('ronde.odometerError'));
      return;
    }

    setLoading(true);

    try {
      // Récupérer l'utilisateur authentifié
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert(t('common.error'), t('common.userNotConnected'));
        setLoading(false);
        return;
      }

      // Géolocalisation
      let location = '0,0';
      try {
         const { status } = await Location.requestForegroundPermissionsAsync();
         if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({});
            location = `${loc.coords.latitude}, ${loc.coords.longitude}`;
         }
      } catch (e) { console.log('GPS Error - Code: RS001'); }

      // Déterminer le statut de la ronde
      const isConforme = Object.values(checks).every(v => v === true);
      const hasMajeur = Object.entries(checks).some(([key, val]) => !val && DEFECT_RULES[key] === 'majeur');
      
      let finalStatus: 'conforme' | 'defaut_mineur' | 'defaut_majeur' = 'conforme';
      if (!isConforme) finalStatus = hasMajeur ? 'defaut_majeur' : 'defaut_mineur';

      // Créer la liste des défauts avec gravité
      const defects: DefectDetail[] = Object.entries(checks)
        .filter(([key, val]) => !val)
        .map(([key]) => ({
          checkName: key,
          severity: DEFECT_RULES[key] === 'majeur' ? 'majeur' : 'mineur',
          repaired: false,
        }));

      // Préparer les données pour Firebase (sans undefined)
      const safetyRoundInput: CreateSafetyRoundInput = {
        driverId: user.uid,
        vehicleId: vehiculeId,
        odometre: parseInt(odometre),
        statut: finalStatus,
        checks: checks,
        localisation_gps: location,
      };

      // Ajouter champs optionnels seulement s'ils existent
      if (observations && observations.trim().length > 0) {
        safetyRoundInput.observations = observations;
      }
      if (defects.length > 0) {
        safetyRoundInput.defects = defects;
      }

      // Sauvegarder avec le système offline-first
      const roundId = await SafetyRoundOfflineService.createSafetyRound(safetyRoundInput);
      console.log('Ronde sauvegardée (offline-first):', roundId);

      // Mettre à jour l'historique local immédiatement
      const newItem = {
        id: roundId,
        date: safetyRoundInput.date,
        odometre: safetyRoundInput.odometre,
        statut: safetyRoundInput.statut,
        vehicule: safetyRoundInput.vehicleId,
        note: safetyRoundInput.observations || '',
        checks: safetyRoundInput.checks,
        defects: safetyRoundInput.defects || [],
      };
      setHistory([newItem, ...history]);

      // Message adapté selon l'état réseau
      const isOffline = NetworkMonitor.isOffline();
      const baseMessage = isConforme 
        ? t('ronde.compliantMessage') 
        : hasMajeur 
          ? t('ronde.majorDefectMessage') 
          : t('ronde.minorDefectMessage');
      
      const fullMessage = isOffline 
        ? `${baseMessage}\n\n📵 Sera synchronisée dès le retour du réseau` 
        : baseMessage;

      // Afficher le résultat après un délai pour l'UX
      setTimeout(() => {
        if (isConforme) {
            setModalStatus('conforme');
            setModalMessage(fullMessage);
        } else if (hasMajeur) {
            setModalStatus('defaut_majeur');
            setModalMessage(fullMessage);
        } else {
            setModalStatus('defaut_mineur');
            setModalMessage(fullMessage);
        }

        // Envoi email propriétaire si location avec défaut
        if (isRental && !isConforme) {
            setLoading(false);
            setTimeout(() => {
                Alert.alert(
                    t('ronde.autoReport'),
                    t('ronde.autoReportMessage'),
                    [{ text: t('common.ok'), onPress: () => sendReportToOwner(savedRound, isConforme) }]
                );
            }, 500);
        } else {
            setLoading(false);
        }

        setModalVisible(true);
      }, 1500);

    } catch (error: any) {
      console.error('Erreur validation ronde:', error);
      Alert.alert(t('common.error'), t('ronde.sendError'));
      setLoading(false);
    }
  };

  const openHistoryDetails = (item: any) => {
    setSelectedHistoryItem(item);
    setDetailsModalVisible(true);
  };

  // Gestion sélection date dans le calendrier
  const handleDateSelect = (date: string, rounds: SafetyRound[]) => {
    setSelectedDate(date);
    setDayRounds(rounds);
  };

  // --- FONCTIONS D'EXPORTATION D'HISTORIQUE ---
  const filtrerHistoriqueParPeriode = (historique: any[], periode: string): any[] => {
    const maintenant = new Date();
    let dateDebut = new Date();

    switch (periode) {
      case 'jour':
        dateDebut.setHours(0, 0, 0, 0);
        break;
      case '3mois':
        dateDebut.setMonth(maintenant.getMonth() - 3);
        break;
      case '6mois':
        dateDebut.setMonth(maintenant.getMonth() - 6);
        break;
      case '12mois':
        dateDebut.setFullYear(maintenant.getFullYear() - 1);
        break;
      default:
        return historique;
    }

    return historique.filter(item => {
      const dateItem = new Date(item.date);
      return dateItem >= dateDebut;
    });
  };

  const genererRapportHistorique = (historiqueFiltre: any[], periode: string): string => {
    const maintenant = new Date();
    let dateDebut = new Date();
    let periodeTexte = '';

    switch (periode) {
      case 'jour':
        dateDebut.setHours(0, 0, 0, 0);
        periodeTexte = dateDebut.toLocaleDateString('fr-CA');
        break;
      case '3mois':
        dateDebut.setMonth(maintenant.getMonth() - 3);
        periodeTexte = `3 ${t('export.last3Months').toLowerCase()} (${dateDebut.toLocaleDateString('fr-CA')} ${t('export.to')} ${maintenant.toLocaleDateString('fr-CA')})`;
        break;
      case '6mois':
        dateDebut.setMonth(maintenant.getMonth() - 6);
        periodeTexte = `6 ${t('export.last6Months').toLowerCase()} (${dateDebut.toLocaleDateString('fr-CA')} ${t('export.to')} ${maintenant.toLocaleDateString('fr-CA')})`;
        break;
      case '12mois':
        dateDebut.setFullYear(maintenant.getFullYear() - 1);
        periodeTexte = `12 ${t('export.last12Months').toLowerCase()} (${dateDebut.toLocaleDateString('fr-CA')} ${t('export.to')} ${maintenant.toLocaleDateString('fr-CA')})`;
        break;
    }

    let rapport = `${t('export.reportTitle')}\n`;
    rapport += `═══════════════════════════════════════\n\n`;
    rapport += `${t('export.period')} ${periodeTexte}\n\n`;
    
    // INFORMATIONS DU CHAUFFEUR
    rapport += `${t('export.driverInfo')}\n`;
    rapport += `───────────────────────────────────────\n`;
    if (driverProfile) {
      rapport += `${t('export.fullName')} ${driverProfile.name || t('common.notProvided')}\n`;
      rapport += `${t('export.licenseNumber')} ${driverProfile.licenseNumber || t('common.notProvided')}\n`;
      if (driverProfile.pocketNumber) {
        rapport += `${t('export.pocketNumber')} ${driverProfile.pocketNumber}\n`;
      }
      rapport += `${t('export.email')} ${driverProfile.email || t('common.notProvided')}\n`;
    } else {
      rapport += `${t('export.driver')} ${t('common.notProvided')}\n`;
    }
    
    // INFORMATIONS DU VÉHICULE
    rapport += `\n${t('export.vehicleInfo')}\n`;
    rapport += `───────────────────────────────────────\n`;
    if (driverProfile) {
      if (driverProfile.vehicleMake && driverProfile.vehicleModel && driverProfile.vehicleYear) {
        rapport += `${t('export.vehicle')} ${driverProfile.vehicleMake} ${driverProfile.vehicleModel} ${driverProfile.vehicleYear}\n`;
      }
      if (driverProfile.vehiclePlate) {
        rapport += `${t('export.plate')} ${driverProfile.vehiclePlate}\n`;
      }
      if (!driverProfile.vehicleMake && !driverProfile.vehiclePlate) {
        rapport += `${t('export.vehicle')} ${t('common.notProvided')}\n`;
      }
    } else {
      rapport += `${t('export.vehicle')} ${t('common.notProvided')}\n`;
    }

    rapport += `\n${t('export.roundsDetails')}\n`;
    rapport += `───────────────────────────────────────\n`;

    if (historiqueFiltre.length === 0) {
      rapport += `${t('export.noInspections')}\n`;
    } else {
      historiqueFiltre.forEach((item, index) => {
        const date = new Date(item.date);
        const statutIcone = item.statut === 'conforme' ? '✅' : (item.statut === 'defaut_majeur' ? '🔴' : '⚠️');
        let statutTexte = '';
        if (item.statut === 'conforme') {
          statutTexte = t('ronde.compliant');
        } else if (item.statut === 'defaut_majeur') {
          statutTexte = `${t('ronde.nonCompliant')} - ${t('ronde.majorDefect')}`;
        } else {
          statutTexte = `${t('ronde.nonCompliant')} - ${t('ronde.minorDefect')}`;
        }
        
        rapport += `\n${t('export.inspectionNumber')} ${index + 1}\n`;
        rapport += `${date.toLocaleDateString('fr-CA')} - ${date.toLocaleTimeString('fr-CA', {hour: '2-digit', minute:'2-digit'})} - ${statutIcone} ${statutTexte}\n`;
        rapport += `${t('calendar.odometer')} ${item.odometre} km\n`;
        
        // Détails COMPLETS des vérifications avec MAJEUR/MINEUR
        // Si pas de checks (ancien historique), tout est considéré OK par défaut
        const checks = item.checks || {};
        rapport += `\n  ${t('export.detailedChecks')}:\n`;
        rapport += `  ─────────────────────────────────────\n`;
        
        // SECTION 1: Extérieur & Feux
        rapport += `  ${t('ronde.section1')}\n`;
        const lightsOk = checks.check_phares_feux !== undefined ? checks.check_phares_feux : true;
        const lightsSeverity = !lightsOk ? ` [${DEFECT_RULES['check_phares_feux'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.lights')}: ${lightsOk ? '✅' : '❌'}${lightsSeverity}\n`;
        
        const tiresOk = checks.check_pneus !== undefined ? checks.check_pneus : true;
        const tiresSeverity = !tiresOk ? ` [${DEFECT_RULES['check_pneus'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.tires')}: ${tiresOk ? '✅' : '❌'}${tiresSeverity}\n`;
        
        const mirrorsOk = checks.check_retroviseurs !== undefined ? checks.check_retroviseurs : true;
        const mirrorsSeverity = !mirrorsOk ? ` [${DEFECT_RULES['check_retroviseurs'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.mirrors')}: ${mirrorsOk ? '✅' : '❌'}${mirrorsSeverity}\n`;
        
        const wipersOk = checks.check_essuie_glaces !== undefined ? checks.check_essuie_glaces : true;
        const wipersSeverity = !wipersOk ? ` [${DEFECT_RULES['check_essuie_glaces'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.wipers')}: ${wipersOk ? '✅' : '❌'}${wipersSeverity}\n`;
        
        const leaksOk = checks.check_fuites !== undefined ? checks.check_fuites : true;
        const leaksSeverity = !leaksOk ? ` [${DEFECT_RULES['check_fuites'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.leaks')}: ${leaksOk ? '✅' : '❌'}${leaksSeverity}\n`;
        
        // SECTION 2: Intérieur & Mécanique
        rapport += `\n  ${t('ronde.section2')}\n`;
        const handbrakeOk = checks.check_frein_stationnement !== undefined ? checks.check_frein_stationnement : true;
        const handbrakeSeverity = !handbrakeOk ? ` [${DEFECT_RULES['check_frein_stationnement'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.handbrake')}: ${handbrakeOk ? '✅' : '❌'}${handbrakeSeverity}\n`;
        
        const brakesOk = checks.check_liquide_frein !== undefined ? checks.check_liquide_frein : true;
        const brakesSeverity = !brakesOk ? ` [${DEFECT_RULES['check_liquide_frein'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.serviceBrake')}: ${brakesOk ? '✅' : '❌'}${brakesSeverity}\n`;
        
        const steeringOk = checks.check_direction !== undefined ? checks.check_direction : true;
        const steeringSeverity = !steeringOk ? ` [${DEFECT_RULES['check_direction'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.steering')}: ${steeringOk ? '✅' : '❌'}${steeringSeverity}\n`;
        
        const hornOk = checks.check_klaxon !== undefined ? checks.check_klaxon : true;
        const hornSeverity = !hornOk ? ` [${DEFECT_RULES['check_klaxon'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.horn')}: ${hornOk ? '✅' : '❌'}${hornSeverity}\n`;
        
        const heatingOk = checks.check_degivrage !== undefined ? checks.check_degivrage : true;
        const heatingSeverity = !heatingOk ? ` [${DEFECT_RULES['check_degivrage'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.heating')}: ${heatingOk ? '✅' : '❌'}${heatingSeverity}\n`;
        
        const dashboardOk = checks.check_voyants_tableau !== undefined ? checks.check_voyants_tableau : true;
        const dashboardSeverity = !dashboardOk ? ` [${DEFECT_RULES['check_voyants_tableau'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.dashboard')}: ${dashboardOk ? '✅' : '❌'}${dashboardSeverity}\n`;
        
        // SECTION 3: Équipement Taxi
        rapport += `\n  ${t('ronde.section3')}\n`;
        const seatbeltsOk = checks.check_ceintures !== undefined ? checks.check_ceintures : true;
        const seatbeltsSeverity = !seatbeltsOk ? ` [${DEFECT_RULES['check_ceintures'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.seatbelts')}: ${seatbeltsOk ? '✅' : '❌'}${seatbeltsSeverity}\n`;
        
        const beaconOk = checks.check_lanternon !== undefined ? checks.check_lanternon : true;
        const beaconSeverity = !beaconOk ? ` [${DEFECT_RULES['check_lanternon'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.beacon')}: ${beaconOk ? '✅' : '❌'}${beaconSeverity}\n`;
        
        const taximeterOk = checks.check_taximetre !== undefined ? checks.check_taximetre : true;
        const taximeterSeverity = !taximeterOk ? ` [${DEFECT_RULES['check_taximetre'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.taximeter')}: ${taximeterOk ? '✅' : '❌'}${taximeterSeverity}\n`;
        
        const cleanlinessOk = checks.check_proprete !== undefined ? checks.check_proprete : true;
        const cleanlinessSeverity = !cleanlinessOk ? ` [${DEFECT_RULES['check_proprete'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.cleanliness')}: ${cleanlinessOk ? '✅' : '❌'}${cleanlinessSeverity}\n`;
        
        const firstAidOk = checks.check_trousse !== undefined ? checks.check_trousse : true;
        const firstAidSeverity = !firstAidOk ? ` [${DEFECT_RULES['check_trousse'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.firstAidKit')}: ${firstAidOk ? '✅' : '❌'}${firstAidSeverity}\n`;
        
        // TOUJOURS afficher les observations (même si vides)
        if (item.note && item.note.trim()) {
          rapport += `\n  📝 ${t('export.observations')}: ${item.note.trim()}\n`;
        } else {
          rapport += `\n  📝 ${t('export.observations')}: ${t('export.noObservations')}\n`;
        }
      });
    }

    rapport += `\n───────────────────────────────────────\n`;
    rapport += `${t('export.totalInspections')} ${historiqueFiltre.length}\n`;
    rapport += `${t('export.certified')}\n`;

    return rapport;
  };

  const afficherMenuExportation = async () => {
    const options = [t('export.dailyReport'), t('export.last3Months'), t('export.last6Months'), t('export.last12Months'), t('common.cancel')];
    const cancelButtonIndex = 4;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: t('export.exportInspectionHistory')
        },
        async (buttonIndex) => {
          if (buttonIndex !== cancelButtonIndex) {
            await exporterHistorique(options[buttonIndex]);
          }
        }
      );
    } else if (Platform.OS === 'web') {
      // Web : utiliser une alerte simple
      Alert.alert(
        t('export.exportHistory'),
        t('export.choosePeriod'),
        [
          { text: t('export.dailyReport'), onPress: () => exporterHistorique(t('export.dailyReport')) },
          { text: t('export.last3Months'), onPress: () => exporterHistorique(t('export.last3Months')) },
          { text: t('export.last6Months'), onPress: () => exporterHistorique(t('export.last6Months')) },
          { text: t('export.last12Months'), onPress: () => exporterHistorique(t('export.last12Months')) },
          { text: t('common.cancel'), style: 'cancel' }
        ]
      );
    } else {
      // Pour Android, on utilise une alerte simple
      Alert.alert(
        t('export.exportHistory'),
        t('export.choosePeriod'),
        [
          { text: t('export.dailyReport'), onPress: () => exporterHistorique(t('export.dailyReport')) },
          { text: t('export.last3Months'), onPress: () => exporterHistorique(t('export.last3Months')) },
          { text: t('export.last6Months'), onPress: () => exporterHistorique(t('export.last6Months')) },
          { text: t('export.last12Months'), onPress: () => exporterHistorique(t('export.last12Months')) },
          { text: t('common.cancel'), style: 'cancel' }
        ]
      );
    }
  };

  const exporterHistorique = async (periode: string) => {
    try {
      const periodeKey = periode.toLowerCase().replace(' ', '').replace('derniers', '');
      const historiqueFiltre = filtrerHistoriqueParPeriode(history, periodeKey);
      const rapport = genererRapportHistorique(historiqueFiltre, periodeKey);

      await Share.share({
        message: rapport,
        title: 'Rapport Inspection SAAQ'
      });
    } catch (error) {
      console.error('Erreur exportation:', error);
      Alert.alert(t('common.error'), t('errors.exportFailed'));
    }
  };

  // --- COMPOSANT DE LIGNE (CORRIGÉ POUR L'AFFICHAGE) ---
  const CheckItem = ({ label, icon, checkKey }: { label: string, icon: any, checkKey: string }) => {
    const isOk = checks[checkKey];
    const severity = DEFECT_RULES[checkKey]; 

    return (
      <View style={styles.checkWrapper}>
        <View style={styles.checkRow}>
            {/* Conteneur gauche (Icône + Texte) avec flex: 1 pour prendre la place */}
            <View style={styles.checkLabelContainer}>
                <View style={[styles.checkIconBox, {backgroundColor: isOk ? Colors.success + '20' : Colors.error + '20'}]}>
                    <MaterialCommunityIcons name={icon} size={20} color={isOk ? Colors.success : Colors.error} />
                </View>
                {/* Texte avec flexShrink pour qu'il passe à la ligne si trop long */}
                <Text style={styles.checkLabelText}>{label}</Text>
            </View>
            
            {/* Switch (fixe à droite) */}
            <Switch
                trackColor={{ false: Colors.error, true: Colors.success }}
                thumbColor={"#fff"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={() => toggleSwitch(checkKey)}
                value={isOk}
            />
        </View>
        
        {/* BADGE GRAVITÉ */}
        {!isOk && (
            <View style={styles.autoSeverityBadge}>
                {severity === 'majeur' ? (
                    <View style={[styles.severityTag, {backgroundColor: Colors.error}]}>
                        <MaterialCommunityIcons name="alert-octagon" size={14} color="#FFF" />
                        <Text style={styles.severityTagText}>{t('ronde.majorDefect')}</Text>
                    </View>
                ) : (
                    <View style={[styles.severityTag, {backgroundColor: Colors.warning}]}>
                        <MaterialCommunityIcons name="alert" size={14} color="#FFF" />
                        <Text style={styles.severityTagText}>{t('ronde.minorDefect')}</Text>
                    </View>
                )}
            </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* --- MODAL RESULTAT --- */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.iconCircle, {
                backgroundColor: modalStatus === 'conforme' ? Colors.success : (modalStatus === 'defaut_majeur' ? Colors.error : Colors.warning)
            }]}>
              <MaterialCommunityIcons 
                name={modalStatus === 'conforme' ? "check" : "alert"} 
                size={40} color="#fff" 
              />
            </View>
            <Text style={styles.modalTitle}>{t('ronde.saved')}</Text>
            <Text style={[styles.modalMessage, {
                color: modalStatus === 'conforme' ? Colors.textMain : (modalStatus === 'defaut_majeur' ? Colors.error : Colors.warning)
            }]}>
              {modalMessage}
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => { setModalVisible(false); router.back(); }}>
              <Text style={styles.modalButtonText}>{t('common.backHome')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL DÉTAILS RONDE COMPLET --- */}
      <Modal animationType="slide" transparent={true} visible={detailsModalVisible} onRequestClose={() => setDetailsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            <View style={[styles.modalCard, { maxHeight: '90%' }]}>
              {/* En-tête avec statut */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <MaterialCommunityIcons 
                  name={selectedHistoryItem?.statut === 'conforme' ? 'check-circle' : 'alert-circle'} 
                  size={48} 
                  color={
                    selectedHistoryItem?.statut === 'conforme' ? Colors.success : 
                    selectedHistoryItem?.statut === 'defaut_mineur' ? Colors.warning : 
                    Colors.error
                  } 
                />
                <Text style={[styles.modalTitle, { marginTop: 10 }]}>
                  {selectedHistoryItem?.statut === 'conforme' ? t('ronde.statusOk') : 
                   selectedHistoryItem?.statut === 'defaut_mineur' ? t('ronde.minorDefect') : 
                   t('ronde.majorDefect')}
                </Text>
              </View>

              {selectedHistoryItem && (
                <ScrollView 
                  style={{ maxHeight: 400 }}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                >
                  {/* Informations générales */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('ronde.generalInfo')}</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.label}>📅 {t('common.date')}:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedHistoryItem.date).toLocaleString(i18n.language === 'en' ? 'en-US' : 'fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.label}>🚗 {t('calendar.odometer')}</Text>
                      <Text style={styles.detailValue}>{selectedHistoryItem.odometre} km</Text>
                    </View>
                    {selectedHistoryItem.localisation_gps && selectedHistoryItem.localisation_gps !== '0,0' && (
                      <View style={styles.detailRow}>
                        <Text style={styles.label}>📍 GPS:</Text>
                        <Text style={[styles.detailValue, { fontSize: 12 }]}>
                          {selectedHistoryItem.localisation_gps}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Vérifications */}
                  {selectedHistoryItem.checks && Object.keys(selectedHistoryItem.checks).length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>
                        {t('ronde.verificationsCount', { count: Object.keys(selectedHistoryItem.checks).length })}
                      </Text>
                      {Object.entries(selectedHistoryItem.checks).map(([key, value]) => (
                        <View key={key} style={styles.checkDetailRow}>
                          <MaterialCommunityIcons 
                            name={value ? 'check-circle' : 'close-circle'} 
                            size={18} 
                            color={value ? Colors.success : Colors.error} 
                          />
                          <Text style={styles.checkDetailText}>
                            {t(`ronde.${getCheckTranslationKey(key)}`)}
                          </Text>
                          {!value && (
                            <Text style={styles.severityBadge}>
                              {DEFECT_RULES[key] === 'majeur' ? '🛑 ' + t('ronde.majorDefect').split(' ')[0] : '⚠️ ' + t('ronde.minorDefect').split(' ')[0]}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Défauts détectés */}
                  {selectedHistoryItem.defects && selectedHistoryItem.defects.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>{t('ronde.defectsDetected')}</Text>
                      {selectedHistoryItem.defects.map((defect: any, index: number) => (
                        <View key={index} style={styles.defectCard}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.defectName}>
                              {t(`ronde.${getCheckTranslationKey(defect.checkName)}`)}
                            </Text>
                            <Text style={[styles.severityTag, { 
                              backgroundColor: defect.severity === 'majeur' ? Colors.error : Colors.warning 
                            }]}>
                              {defect.severity === 'majeur' ? '🛑 ' + t('ronde.majorDefect').split(' ')[0] : '⚠️ ' + t('ronde.minorDefect').split(' ')[0]}
                            </Text>
                          </View>
                          {defect.repaired ? (
                            <Text style={styles.repairedText}>{t('ronde.repairedOn')} {defect.repairDate}</Text>
                          ) : (
                            <Text style={styles.notRepairedText}>{t('ronde.notRepaired')}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Observations */}
                  {selectedHistoryItem.observations && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>📝 {t('ronde.observations')}</Text>
                      <View style={styles.observationsBox}>
                        <Text style={styles.observationsText}>"{selectedHistoryItem.observations}"</Text>
                      </View>
                    </View>
                  )}
                </ScrollView>
              )}

              {/* Boutons d'action */}
              <View style={{ marginTop: 20, gap: 10 }}>
                {selectedHistoryItem?.defects && selectedHistoryItem.defects.some((d: any) => !d.repaired) && (
                  <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: Colors.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]} 
                    onPress={() => {
                      // Prendre le premier défaut non réparé
                      const firstUnrepairedDefect = selectedHistoryItem.defects.find((d: any) => !d.repaired);
                      if (firstUnrepairedDefect) {
                        setSelectedDefect({
                          checkName: firstUnrepairedDefect.checkName,
                          checkLabel: t(`ronde.${getCheckTranslationKey(firstUnrepairedDefect.checkName)}`),
                        });
                        setDetailsModalVisible(false);
                        setRepairModalVisible(true);
                      }
                    }}
                  >
                    <MaterialCommunityIcons name="wrench" size={20} color="#000" />
                    <Text style={{ color: '#000', fontWeight: 'bold' }}>{t('ronde.declareRepair')}</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.modalButton, { backgroundColor: Colors.darkCard }]} 
                  onPress={() => setDetailsModalVisible(false)}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('ronde.title')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="police-badge" size={20} color={Colors.gold} />
          <TouchableOpacity onPress={afficherMenuExportation} style={styles.exportButton}>
            <MaterialCommunityIcons name="share-outline" size={24} color={Colors.gold} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} tintColor={Colors.gold} />}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        removeClippedSubviews={false}
      >
        
        {/* CARTE VÉHICULE & LOCATION */}
        <View style={styles.vehicleCard}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}>
            <View style={styles.vehicleIconBox}>
               <MaterialCommunityIcons name="taxi" size={32} color={Colors.gold} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>
                {vehicleInfo || t('ronde.vehicleName')}
              </Text>
              <Text style={styles.vehiclePlate}>
                {chauffeurId !== 'chauffeur-1' ? chauffeurId : t('ronde.vehicleId')}
              </Text>
            </View>
            <View style={styles.badge}>
               <Text style={styles.badgeText}>{t('ronde.inService')}</Text>
            </View>
          </View>

          {/* SECTION LOCATION */}
          <View style={styles.rentalSection}>
             <View style={styles.rentalRow}>
                <Text style={{color: '#FFF', fontWeight: 'bold'}}>{t('ronde.rentalVehicle')}</Text>
                <Switch 
                    value={isRental} 
                    onValueChange={setIsRental}
                    trackColor={{false: '#555', true: Colors.gold}}
                    thumbColor={'#FFF'}
                />
             </View>
             {isRental && (
                 <View style={styles.emailInputContainer}>
                    <MaterialCommunityIcons name="email-outline" size={20} color="#AAA" style={{marginRight: 10}} />
                    <TextInput 
                        style={styles.rentalInput}
                        placeholder={t('ronde.ownerEmail')}
                        placeholderTextColor="#AAA"
                        value={ownerEmail}
                        onChangeText={setOwnerEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                 </View>
             )}
          </View>
        </View>
        
        {/* ODOMÈTRE */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>{t('ronde.currentMileage')}</Text>
          <View style={styles.inputWrapper}>
             <MaterialCommunityIcons name="speedometer" size={24} color={Colors.textSub} style={{marginLeft: 15}} />
             <TextInput
                style={styles.input}
                value={odometre}
                onChangeText={setOdometre}
                placeholder={t('ronde.mileagePlaceholder')}
                placeholderTextColor={Colors.textSub}
                keyboardType="numeric"
             />
             <Text style={{marginRight: 15, color: Colors.textSub, fontWeight:'bold'}}>{t('common.km')}</Text>
          </View>
        </View>

        {/* 1. EXTÉRIEUR */}
        <Text style={styles.sectionTitle}>{t('ronde.section1')}</Text>
        <View style={styles.checkCard}>
          <CheckItem label={t('ronde.lights')} icon="car-light-high" checkKey="check_phares_feux" />
          <View style={styles.separator} />
          <CheckItem label={t('ronde.tires')} icon="tire" checkKey="check_pneus" />
          <View style={styles.separator} />
          <CheckItem label={t('ronde.mirrors')} icon="car-side" checkKey="check_retroviseurs" />
          <View style={styles.separator} />
          <CheckItem label={t('ronde.wipers')} icon="wiper" checkKey="check_essuie_glaces" />
          <View style={styles.separator} />
          <CheckItem label={t('ronde.leaks')} icon="water-off" checkKey="check_fuites" />
        </View>

        {/* 2. INTÉRIEUR / MÉCANIQUE */}
        <Text style={styles.sectionTitle}>{t('ronde.section2')}</Text>
        <View style={styles.checkCard}>
          <CheckItem label={t('ronde.handbrake')} icon="car-brake-parking" checkKey="check_frein_stationnement" />
          <View style={styles.separator} />
          <CheckItem label={t('ronde.serviceBrake')} icon="car-brake-fluid-level" checkKey="check_liquide_frein" />
          <View style={styles.separator} />
          <CheckItem label={t('ronde.steering')} icon="steering" checkKey="check_direction" />
          <View style={styles.separator} />
          <CheckItem label={t('ronde.horn')} icon="bullhorn" checkKey="check_klaxon" />
          <View style={styles.separator} />
          <CheckItem label={t('ronde.heating')} icon="fan" checkKey="check_degivrage" />
          <View style={styles.separator} />
          <CheckItem label={t('ronde.dashboard')} icon="alert-circle-check" checkKey="check_voyants_tableau" />
        </View>

        {/* 3. ÉQUIPEMENT TAXI */}
        <Text style={styles.sectionTitle}>{t('ronde.section3')}</Text>
        <View style={styles.checkCard}>
          <CheckItem label={t('ronde.seatbelts')} icon="seatbelt" checkKey="check_ceintures" />
          <View style={styles.separator} />
          <CheckItem label={t('ronde.beacon')} icon="lightbulb-on" checkKey="check_lanternon" />
          <View style={styles.separator} />
          <CheckItem label={t('ronde.taximeter')} icon="calculator-variant" checkKey="check_taximetre" />
          <View style={styles.separator} />
          <CheckItem label={t('ronde.cleanliness')} icon="spray-bottle" checkKey="check_proprete" />
          <View style={styles.separator} />
          <CheckItem label={t('ronde.firstAidKit')} icon="medical-bag" checkKey="check_trousse" />
        </View>

        {/* OBSERVATIONS */}
        <Text style={styles.sectionTitle}>{t('common.notes')}</Text>
        <TextInput
            style={[styles.inputWrapper, styles.textArea]}
            value={observations}
            onChangeText={setObservations}
            placeholder={t('ronde.observations')}
            placeholderTextColor={Colors.textSub}
            multiline
            numberOfLines={3}
        />

        {/* BOUTON VALIDATION */}
        <TouchableOpacity 
          style={[styles.validateButton, loading && {opacity: 0.7}]} 
          onPress={validerRonde}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
                <MaterialCommunityIcons name="check-decagram" size={24} color="#000" />
                <Text style={styles.validateButtonText}>{t('ronde.validate')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* CALENDRIER DE CONFORMITÉ */}
        <Text style={[styles.sectionTitle, {marginTop: 30}]}>{t('ronde.complianceCalendar')}</Text>
        <ComplianceCalendar onDateSelect={handleDateSelect} />

        {/* RONDES DU JOUR SÉLECTIONNÉ */}
        {selectedDate && (
          <>
            <Text style={[styles.sectionTitle, {marginTop: 20}]}>
              {t('ronde.roundsOf')} {new Date(selectedDate).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            
            {dayRounds.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="calendar-blank" size={48} color={Colors.textSub} />
                <Text style={styles.emptyText}>{t('ronde.noRoundsThisDay')}</Text>
              </View>
            ) : (
              dayRounds.map((item) => {
                // Vérifier si la ronde a des défauts ET si tous sont réparés
                const hasDefects = item.defects && item.defects.length > 0;
                const allRepaired = hasDefects && item.defects.every((d: any) => d.repaired);
                
                return (
                <TouchableOpacity key={item.id} style={styles.historyItem} onPress={() => openHistoryDetails(item)}>
                  <View style={styles.historyLeft}>
                    <View style={[styles.historyIcon, {
                      backgroundColor: item.statut === 'conforme' ? Colors.success + '20' : 
                                      item.statut === 'defaut_mineur' ? Colors.warning + '20' : 
                                      Colors.error + '20'
                    }]}>
                      <MaterialCommunityIcons 
                        name={item.statut === 'conforme' ? "check" : "alert-circle"} 
                        size={20} 
                        color={item.statut === 'conforme' ? Colors.success : 
                               item.statut === 'defaut_mineur' ? Colors.warning : 
                               Colors.error} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyDate}>
                        {new Date(item.date).toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={styles.historyKm}>
                        {item.odometre} km - {
                          item.statut === 'conforme' ? t('ronde.statusOk') : 
                          item.statut === 'defaut_mineur' ? t('ronde.minorDefect') : 
                          t('ronde.majorDefect')
                        }
                      </Text>
                      
                      {/* ✅ INDICATEUR RÉPARATION CONFIRMÉE */}
                      {allRepaired && (
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginTop: 6,
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          backgroundColor: Colors.success + '20',
                          borderRadius: 6,
                          alignSelf: 'flex-start'
                        }}>
                          <MaterialCommunityIcons name="check-circle" size={14} color={Colors.success} />
                          <Text style={{
                            fontSize: 11,
                            color: Colors.success,
                            fontWeight: 'bold',
                            marginLeft: 4
                          }}>
                            {t('ronde.allRepaired')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textSub} />
                </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {/* HISTORIQUE 72H */}
        {history.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, {marginTop: 30}]}>
              {t('ronde.recentHistory72h')}
            </Text>
            <View style={styles.historyInfo}>
              <MaterialCommunityIcons name="information-outline" size={16} color={Colors.textSub} />
              <Text style={styles.historyInfoText}>
                {t('ronde.fullHistoryInfo')}
              </Text>
            </View>
            
            {history.map((item) => {
              // Vérifier si la ronde a des défauts ET si tous sont réparés
              const hasDefects = item.defects && item.defects.length > 0;
              const allRepaired = hasDefects && item.defects.every((d: any) => d.repaired);
              
              return (
              <TouchableOpacity key={item.id} style={styles.historyItem} onPress={() => openHistoryDetails(item)}>
                <View style={styles.historyLeft}>
                  <View style={[styles.historyIcon, {
                    backgroundColor: item.statut === 'conforme' ? Colors.success + '20' : 
                                    item.statut === 'defaut_mineur' ? Colors.warning + '20' : 
                                    Colors.error + '20'
                  }]}>
                    <MaterialCommunityIcons 
                      name={item.statut === 'conforme' ? "check" : "alert-circle"} 
                      size={20} 
                      color={item.statut === 'conforme' ? Colors.success : 
                             item.statut === 'defaut_mineur' ? Colors.warning : 
                             Colors.error} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyDate}>
                      {new Date(item.date).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR', { 
                        day: '2-digit', 
                        month: 'short',
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                    <Text style={styles.historyKm}>
                      {item.odometre} km - {
                        item.statut === 'conforme' ? t('ronde.statusOk') : 
                        item.statut === 'defaut_mineur' ? t('ronde.minorDefect') : 
                        t('ronde.majorDefect')
                      }
                    </Text>
                    
                    {/* ✅ INDICATEUR RÉPARATION CONFIRMÉE */}
                    {allRepaired && (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 6,
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        backgroundColor: Colors.success + '20',
                        borderRadius: 6,
                        alignSelf: 'flex-start'
                      }}>
                        <MaterialCommunityIcons name="check-circle" size={14} color={Colors.success} />
                        <Text style={{
                          fontSize: 11,
                          color: Colors.success,
                          fontWeight: 'bold',
                          marginLeft: 4
                        }}>
                          {t('ronde.allRepaired')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textSub} />
              </TouchableOpacity>
              );
            })}
          </>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Déclaration Réparation */}
      {selectedHistoryItem && selectedDefect && (
        <DeclareRepairModal
          visible={repairModalVisible}
          onClose={() => {
            setRepairModalVisible(false);
            // Recharger l'historique pour voir la réparation
            fetchHistory();
          }}
          roundId={selectedHistoryItem.id}
          checkName={selectedDefect.checkName}
          checkLabel={selectedDefect.checkLabel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: Colors.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textHeader },
  backButton: { padding: 5 },
  exportButton: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(251, 191, 36, 0.2)' },
  scrollContent: { padding: 20 },
  vehicleCard: { backgroundColor: Colors.darkCard, padding: 15, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.gold },
  vehicleIconBox: { width: 50, height: 50, backgroundColor: 'rgba(251, 191, 36, 0.1)', borderRadius: 12, justifyContent:'center', alignItems:'center', marginRight: 15 },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  vehiclePlate: { fontSize: 14, color: Colors.textSub },
  badge: { backgroundColor: Colors.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#FFF' },
  rentalSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#444', paddingTop: 10 },
  rentalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  emailInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, paddingHorizontal: 10, height: 45 },
  rentalInput: { flex: 1, color: '#FFF', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textHeader, marginBottom: 10, marginTop: 10, marginLeft: 5 },
  inputSection: { marginBottom: 10 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, height: 55, marginBottom: 10 },
  input: { flex: 1, height: '100%', paddingHorizontal: 15, fontSize: 18, fontWeight: 'bold', color: Colors.textMain },
  textArea: { height: 80, alignItems: 'flex-start', paddingTop: 15, paddingHorizontal: 15, marginTop: 10, backgroundColor: Colors.card, borderRadius: 12 },
  
  // CHECKS CORRECTIFS
  checkCard: { backgroundColor: Colors.card, borderRadius: 16, paddingVertical: 5, marginBottom: 10 },
  checkWrapper: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  checkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 15 },
  checkLabelContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  checkIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent:'center', alignItems:'center', marginRight: 12 },
  checkLabelText: { fontSize: 15, color: Colors.textMain, fontWeight: '500', flexShrink: 1 },
  separator: { display: 'none' }, 
  
  autoSeverityBadge: { paddingHorizontal: 50, paddingBottom: 10 },
  severityTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  severityTagText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  validateButton: { backgroundColor: Colors.gold, flexDirection: 'row', gap: 10, padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 20, elevation: 5 },
  validateButtonText: { color: '#000', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  
  historyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  historyInfoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSub,
    lineHeight: 16,
  },
  historyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.card, padding: 15, borderRadius: 12, marginBottom: 10 },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  historyIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  historyDate: { fontWeight: 'bold', color: Colors.textMain, fontSize: 14 },
  
  // État vide
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 30, 
    backgroundColor: Colors.card, 
    borderRadius: 12, 
    marginVertical: 10 
  },
  emptyText: { 
    marginTop: 10, 
    fontSize: 14, 
    color: Colors.textSub, 
    textAlign: 'center' 
  },
  historyKm: { color: Colors.textSub, fontSize: 12 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 30, alignItems: 'center', elevation: 10 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: -10 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  modalMessage: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  modalButton: { backgroundColor: '#18181B', paddingVertical: 16, paddingHorizontal: 30, borderRadius: 12, width: '100%', alignItems: 'center' },
  modalButtonText: { color: Colors.gold, fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10, borderBottomWidth:1, borderBottomColor:'#eee', paddingBottom:5 },
  label: { fontWeight: 'bold', color: '#666' },
  
  // Styles détails ronde
  detailSection: { 
    width: '100%', 
    marginBottom: 20, 
    padding: 15, 
    backgroundColor: '#F9FAFB', 
    borderRadius: 12 
  },
  detailSectionTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1F2937', 
    marginBottom: 12 
  },
  detailValue: { 
    fontSize: 14, 
    color: '#4B5563', 
    flex: 1, 
    textAlign: 'right' 
  },
  checkDetailRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB',
    gap: 10
  },
  checkDetailText: { 
    fontSize: 14, 
    color: '#374151', 
    flex: 1 
  },
  severityBadge: { 
    fontSize: 11, 
    fontWeight: 'bold', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 4, 
    backgroundColor: '#FEE2E2', 
    color: '#991B1B' 
  },
  defectCard: { 
    backgroundColor: '#FFF', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 10, 
    borderLeftWidth: 4, 
    borderLeftColor: Colors.error 
  },
  defectName: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#1F2937' 
  },
  severityTag: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 4, 
    fontSize: 11, 
    fontWeight: 'bold', 
    color: '#FFF' 
  },
  repairedText: { 
    fontSize: 12, 
    color: Colors.success, 
    marginTop: 5, 
    fontWeight: '600' 
  },
  notRepairedText: { 
    fontSize: 12, 
    color: Colors.error, 
    marginTop: 5, 
    fontWeight: '600' 
  },
  observationsBox: { 
    backgroundColor: '#FFF', 
    padding: 12, 
    borderRadius: 8, 
    borderLeftWidth: 3, 
    borderLeftColor: Colors.gold 
  },
  observationsText: { 
    fontSize: 14, 
    color: '#4B5563', 
    fontStyle: 'italic' 
  },
});