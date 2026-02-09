import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  Linking,
  StatusBar,
  Share,
  ActionSheetIOS,
  Platform
} from 'react-native';
import * as MailComposer from 'expo-mail-composer';
import { useTranslation } from 'react-i18next';
import { ProfileManager } from '../services/ProfileManager';
import { DEFECT_RULES } from '../constants/defectRules';

// URL API (Ajuster si nécessaire)
const API_URL = 'https://taxi-serveur.onrender.com'; 

// --- THÈME DARK LUXE ---
const Colors = {
  background: '#18181B',
  card: '#27272A',
  textMain: '#FFFFFF',
  textSub: '#9CA3AF',
  gold: '#FBBF24',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  blue: '#3B82F6',
  overlay: 'rgba(0,0,0,0.7)'
};

interface Ronde {
  id: string;
  date_heure: string;
  statut_global: 'conforme' | 'defaut_mineur' | 'defaut_majeur';
  vehicule_id: string;
  odometre: number;
  observations?: string;
  // Toutes les vérifications possibles
  check_liquide_frein?: boolean;
  check_frein_stationnement?: boolean;
  check_phares_feux?: boolean;
  check_pneus?: boolean;
  check_essuie_glaces?: boolean;
  check_retroviseurs?: boolean;
  check_voyants_tableau?: boolean;
  check_ceintures?: boolean;
  check_lanternon?: boolean;
  check_direction?: boolean;
  check_klaxon?: boolean;
  check_degivrage?: boolean;
  check_fuites?: boolean;
  check_proprete?: boolean;
  check_taximetre?: boolean;
  check_trousse?: boolean;
  // Autres champs techniques
  localisation_gps?: string;
  obd2_codes_erreur?: string[];
  obd2_frein_status?: string;
  obd2_engine_status?: string;
}

interface CalendrierEntry {
  date: string;
  rondes: {
    id: string;
    heure: string;
    statut: string;
    vehicule_id: string;
  }[];
  statut_global: string;
}

export default function RondeSecuriteCalendrierScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [rondes, setRondes] = useState<Ronde[]>([]);
  const [calendrier, setCalendrier] = useState<CalendrierEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'mois' | 'semaine'>('mois');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRondes, setSelectedRondes] = useState<Ronde[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);
  
  const [vehiculeId, setVehiculeId] = useState<string | null>(null);
  const [chauffeurId, setChauffeurId] = useState<string | null>('chauffeur-1');
  const [error, setError] = useState<string | null>(null);
  const [allRondesForExport, setAllRondesForExport] = useState<Ronde[]>([]);
  
  // Profil complet du chauffeur (pour le rapport détaillé)
  const [driverProfile, setDriverProfile] = useState<any>(null);

  // Charger le profil au montage
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await ProfileManager.getProfile();
      if (profile) {
        setDriverProfile(profile);
        
        if (profile.name) {
          setChauffeurId(profile.name);
        }
        
        if (profile.vehicleMake && profile.vehicleModel && profile.vehicleYear) {
          const vehicleDesc = `${profile.vehicleMake} ${profile.vehicleModel} ${profile.vehicleYear}`;
          setVehiculeId(vehicleDesc);
        } else if (profile.vehiclePlate) {
          setVehiculeId(profile.vehiclePlate);
        }
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    }
  };

  useEffect(() => {
    chargerRondes();
  }, [currentMonth, currentYear, viewMode]);

  const chargerRondes = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '';
      if (viewMode === 'mois') {
        url = `${API_URL}/rondes/calendrier?mois=${currentMonth}&annee=${currentYear}`;
        if (vehiculeId) url += `&vehicule_id=${vehiculeId}`;
        if (chauffeurId) url += `&chauffeur_id=${chauffeurId}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(t('errors.loadDataFailed'));
        const data = await response.json();
        setCalendrier(data || []);
      } else {
        url = `${API_URL}/rondes/semaine?semaine_offset=0`;
        if (vehiculeId) url += `&vehicule_id=${vehiculeId}`;
        if (chauffeurId) url += `&chauffeur_id=${chauffeurId}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(t('errors.loadDataFailed'));
        const data = await response.json();
        setRondes(data || []);
      }
    } catch (error: any) {
      console.error(error);
      // En cas d'erreur API, on utilise des données vides pour ne pas crasher l'UI
      setCalendrier([]); 
      setRondes([]);
    } finally {
      setLoading(false);
    }
  };

  const changerMois = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(currentYear - 1); } 
      else { setCurrentMonth(currentMonth - 1); }
    } else {
      if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(currentYear + 1); } 
      else { setCurrentMonth(currentMonth + 1); }
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'defaut_majeur': return Colors.error;
      case 'defaut_mineur': return Colors.warning;
      default: return Colors.success;
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'defaut_majeur': return 'alert-octagon';
      case 'defaut_mineur': return 'alert';
      default: return 'check-circle';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // --- LOGIQUE RAPPORTS ---
  const genererRapportRonde = (ronde: Ronde): string => {
    const date = new Date(ronde.date_heure);
    let rapport = `${t('calendar.reportTitle')}\n══════════════════════════\n`;
    rapport += `${t('common.date')}: ${date.toLocaleString('fr-CA')}\n`;
    rapport += `${t('calendar.odometer')} ${ronde.odometre} km\n`;
    rapport += `${t('common.status')}: ${ronde.statut_global.toUpperCase()}\n\n`;
    
    rapport += `${t('common.details')}:\n`;
    rapport += `${t('calendar.brakes')} ${ronde.check_liquide_frein ? t('common.ok') : 'X'} | ${t('calendar.tires')} ${ronde.check_pneus ? t('common.ok') : 'X'}\n`;
    rapport += `${t('calendar.lights')} ${ronde.check_phares_feux ? t('common.ok') : 'X'} | ${t('ronde.wipers')}: ${ronde.check_essuie_glaces ? t('common.ok') : 'X'}\n`;
    
    if (ronde.observations) rapport += `\n${t('calendar.observations')}\n${ronde.observations}\n`;
    
    return rapport;
  };

  const envoyerParWhatsApp = async (ronde: Ronde) => {
    try {
      const rapport = genererRapportRonde(ronde);
      const url = `whatsapp://send?text=${encodeURIComponent(rapport)}`;
      await Linking.openURL(url);
    } catch (e) { Alert.alert(t('common.error'), t('errors.whatsappNotAvailable')); }
  };

  const envoyerParCourriel = async (ronde: Ronde) => {
    try {
      if (!(await MailComposer.isAvailableAsync())) return Alert.alert(t('common.error'), t('errors.emailNotConfigured'));
      await MailComposer.composeAsync({
        recipients: [],
        subject: `Ronde Taxi - ${new Date(ronde.date_heure).toLocaleDateString()}`,
        body: genererRapportRonde(ronde)
      });
    } catch (e) { Alert.alert(t('common.error'), t('errors.emailError')); }
  };

  // --- FONCTIONS D'EXPORTATION D'HISTORIQUE ---
  const chargerToutesLesRondes = async () => {
    try {
      const response = await fetch(`${API_URL}/rondes/all?chauffeur_id=${chauffeurId}`);
      if (!response.ok) throw new Error(t('errors.loadDataFailed'));
      const data = await response.json();
      setAllRondesForExport(data || []);
      return data || [];
    } catch (error) {
      console.error('Erreur chargement toutes les rondes:', error);
      Alert.alert(t('common.error'), t('errors.loadDataFailed'));
      return [];
    }
  };

  const filtrerRondesParPeriode = (rondes: Ronde[], periode: string): Ronde[] => {
    const maintenant = new Date();
    const dateFin = new Date();
    let dateDebut = new Date();

    switch (periode) {
      case 'jour':
        dateDebut.setHours(0, 0, 0, 0);
        dateFin.setHours(23, 59, 59, 999);
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
        return rondes;
    }

    return rondes.filter(ronde => {
      const dateRonde = new Date(ronde.date_heure);
      return dateRonde >= dateDebut && dateRonde <= dateFin;
    });
  };

  const genererRapportHistorique = (rondesFiltrees: Ronde[], periode: string): string => {
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
        periodeTexte = `${t('export.last3Months')} (${dateDebut.toLocaleDateString('fr-CA')} ${t('export.to')} ${maintenant.toLocaleDateString('fr-CA')})`;
        break;
      case '6mois':
        dateDebut.setMonth(maintenant.getMonth() - 6);
        periodeTexte = `${t('export.last6Months')} (${dateDebut.toLocaleDateString('fr-CA')} ${t('export.to')} ${maintenant.toLocaleDateString('fr-CA')})`;
        break;
      case '12mois':
        dateDebut.setFullYear(maintenant.getFullYear() - 1);
        periodeTexte = `${t('export.last12Months')} (${dateDebut.toLocaleDateString('fr-CA')} ${t('export.to')} ${maintenant.toLocaleDateString('fr-CA')})`;
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

    if (rondesFiltrees.length === 0) {
      rapport += `${t('export.noInspections')}\n`;
    } else {
      rondesFiltrees.forEach((ronde, index) => {
        const date = new Date(ronde.date_heure);
        const statutIcone = ronde.statut_global === 'conforme' ? '✅' : (ronde.statut_global === 'defaut_majeur' ? '🔴' : '⚠️');
        let statutTexte = '';
        if (ronde.statut_global === 'conforme') {
          statutTexte = t('ronde.compliant');
        } else if (ronde.statut_global === 'defaut_majeur') {
          statutTexte = `${t('ronde.nonCompliant')} - ${t('ronde.majorDefect')}`;
        } else {
          statutTexte = `${t('ronde.nonCompliant')} - ${t('ronde.minorDefect')}`;
        }
        
        rapport += `\n${t('export.inspectionNumber')} ${index + 1}\n`;
        rapport += `${date.toLocaleDateString('fr-CA')} - ${date.toLocaleTimeString('fr-CA', {hour: '2-digit', minute:'2-digit'})} - ${statutIcone} ${statutTexte}\n`;
        rapport += `${t('calendar.odometer')} ${ronde.odometre} km\n`;
        
        // Détails COMPLETS des vérifications avec MAJEUR/MINEUR
        rapport += `\n  ${t('export.detailedChecks')}:\n`;
        rapport += `  ─────────────────────────────────────\n`;
        
        // SECTION 1: Extérieur & Feux
        rapport += `  ${t('ronde.section1')}\n`;
        const lightsOk = ronde.check_phares_feux ?? true;
        const lightsSeverity = !lightsOk ? ` [${DEFECT_RULES['check_phares_feux'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.lights')}: ${lightsOk ? '✅' : '❌'}${lightsSeverity}\n`;
        
        const tiresOk = ronde.check_pneus ?? true;
        const tiresSeverity = !tiresOk ? ` [${DEFECT_RULES['check_pneus'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.tires')}: ${tiresOk ? '✅' : '❌'}${tiresSeverity}\n`;
        
        const mirrorsOk = ronde.check_retroviseurs ?? true;
        const mirrorsSeverity = !mirrorsOk ? ` [${DEFECT_RULES['check_retroviseurs'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.mirrors')}: ${mirrorsOk ? '✅' : '❌'}${mirrorsSeverity}\n`;
        
        const wipersOk = ronde.check_essuie_glaces ?? true;
        const wipersSeverity = !wipersOk ? ` [${DEFECT_RULES['check_essuie_glaces'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.wipers')}: ${wipersOk ? '✅' : '❌'}${wipersSeverity}\n`;
        
        const leaksOk = ronde.check_fuites ?? true;
        const leaksSeverity = !leaksOk ? ` [${DEFECT_RULES['check_fuites'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.leaks')}: ${leaksOk ? '✅' : '❌'}${leaksSeverity}\n`;
        
        // SECTION 2: Intérieur & Mécanique
        rapport += `\n  ${t('ronde.section2')}\n`;
        const handbrakeOk = ronde.check_frein_stationnement ?? true;
        const handbrakeSeverity = !handbrakeOk ? ` [${DEFECT_RULES['check_frein_stationnement'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.handbrake')}: ${handbrakeOk ? '✅' : '❌'}${handbrakeSeverity}\n`;
        
        const brakesOk = ronde.check_liquide_frein ?? true;
        const brakesSeverity = !brakesOk ? ` [${DEFECT_RULES['check_liquide_frein'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.serviceBrake')}: ${brakesOk ? '✅' : '❌'}${brakesSeverity}\n`;
        
        const steeringOk = ronde.check_direction ?? true;
        const steeringSeverity = !steeringOk ? ` [${DEFECT_RULES['check_direction'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.steering')}: ${steeringOk ? '✅' : '❌'}${steeringSeverity}\n`;
        
        const hornOk = ronde.check_klaxon ?? true;
        const hornSeverity = !hornOk ? ` [${DEFECT_RULES['check_klaxon'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.horn')}: ${hornOk ? '✅' : '❌'}${hornSeverity}\n`;
        
        const heatingOk = ronde.check_degivrage ?? true;
        const heatingSeverity = !heatingOk ? ` [${DEFECT_RULES['check_degivrage'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.heating')}: ${heatingOk ? '✅' : '❌'}${heatingSeverity}\n`;
        
        const dashboardOk = ronde.check_voyants_tableau ?? true;
        const dashboardSeverity = !dashboardOk ? ` [${DEFECT_RULES['check_voyants_tableau'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.dashboard')}: ${dashboardOk ? '✅' : '❌'}${dashboardSeverity}\n`;
        
        // SECTION 3: Équipement Taxi
        rapport += `\n  ${t('ronde.section3')}\n`;
        const seatbeltsOk = ronde.check_ceintures ?? true;
        const seatbeltsSeverity = !seatbeltsOk ? ` [${DEFECT_RULES['check_ceintures'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.seatbelts')}: ${seatbeltsOk ? '✅' : '❌'}${seatbeltsSeverity}\n`;
        
        const beaconOk = ronde.check_lanternon ?? true;
        const beaconSeverity = !beaconOk ? ` [${DEFECT_RULES['check_lanternon'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.beacon')}: ${beaconOk ? '✅' : '❌'}${beaconSeverity}\n`;
        
        const taximeterOk = ronde.check_taximetre ?? true;
        const taximeterSeverity = !taximeterOk ? ` [${DEFECT_RULES['check_taximetre'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.taximeter')}: ${taximeterOk ? '✅' : '❌'}${taximeterSeverity}\n`;
        
        const cleanlinessOk = ronde.check_proprete ?? true;
        const cleanlinessSeverity = !cleanlinessOk ? ` [${DEFECT_RULES['check_proprete'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.cleanliness')}: ${cleanlinessOk ? '✅' : '❌'}${cleanlinessSeverity}\n`;
        
        const firstAidOk = ronde.check_trousse ?? true;
        const firstAidSeverity = !firstAidOk ? ` [${DEFECT_RULES['check_trousse'] === 'majeur' ? t('ronde.majorDefect') : t('ronde.minorDefect')}]` : '';
        rapport += `    • ${t('ronde.firstAidKit')}: ${firstAidOk ? '✅' : '❌'}${firstAidSeverity}\n`;
        
        // TOUJOURS afficher les observations (même si vides)
        if (ronde.observations && ronde.observations.trim()) {
          rapport += `\n  📝 ${t('export.observations')}: ${ronde.observations.trim()}\n`;
        } else {
          rapport += `\n  📝 ${t('export.observations')}: ${t('export.noObservations')}\n`;
        }
      });
    }

    rapport += `\n───────────────────────────────────────\n`;
    rapport += `${t('export.totalInspections')} ${rondesFiltrees.length}\n`;
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
      const toutesLesRondes = await chargerToutesLesRondes();
      const periodeKey = periode.toLowerCase().replace(' ', '').replace('derniers', '');
      const rondesFiltrees = filtrerRondesParPeriode(toutesLesRondes, periodeKey);
      const rapport = genererRapportHistorique(rondesFiltrees, periodeKey);

      await Share.share({
        message: rapport,
        title: t('export.reportTitle')
      });
    } catch (error) {
      console.error('Erreur exportation:', error);
      Alert.alert(t('common.error'), t('errors.exportFailed'));
    }
  };

  // --- LOGIQUE MODAL ---
  const ouvrirRondeDetail = async (rondeId: string) => {
    setModalVisible(true);
    setLoadingModal(true);
    try {
        const response = await fetch(`${API_URL}/rondes/${rondeId}`);
        if(response.ok) {
            const data = await response.json();
            setSelectedRondes([data]);
            setSelectedDate(new Date(data.date_heure).toISOString());
        }
    } catch(e) { console.error(e); }
    setLoadingModal(false);
  };

  const ouvrirRondesDate = async (date: string) => {
      setSelectedDate(date);
      setModalVisible(true);
      setLoadingModal(true);
      setSelectedRondes([]);
      
      try {
        const dateObj = new Date(date + 'T00:00:00');
        const d1 = new Date(dateObj); d1.setHours(0,0,0,0);
        const d2 = new Date(dateObj); d2.setHours(23,59,59,999);
        
        const url = `${API_URL}/rondes?date_debut=${d1.toISOString()}&date_fin=${d2.toISOString()}&chauffeur_id=${chauffeurId}`;
        const response = await fetch(url);
        if(response.ok) {
            const data = await response.json();
            setSelectedRondes(data);
        }
      } catch(e) { console.error(e); }
      setLoadingModal(false);
  };

  const moisNoms = [
    t('months.january'), t('months.february'), t('months.march'), 
    t('months.april'), t('months.may'), t('months.june'), 
    t('months.july'), t('months.august'), t('months.september'), 
    t('months.october'), t('months.november'), t('months.december')
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="police-badge" size={20} color={Colors.gold} />
          <TouchableOpacity onPress={afficherMenuExportation} style={styles.exportButton}>
            <MaterialCommunityIcons name="share-outline" size={24} color={Colors.gold} />
          </TouchableOpacity>
        </View>
      </View>

      {/* FILTRES */}
      <View style={styles.filters}>
        <TouchableOpacity style={[styles.filterButton, viewMode === 'mois' && styles.filterButtonActive]} onPress={() => setViewMode('mois')}>
          <Text style={[styles.filterText, viewMode === 'mois' && styles.filterTextActive]}>{t('calendar.month')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterButton, viewMode === 'semaine' && styles.filterButtonActive]} onPress={() => setViewMode('semaine')}>
          <Text style={[styles.filterText, viewMode === 'semaine' && styles.filterTextActive]}>{t('calendar.week')}</Text>
        </TouchableOpacity>
      </View>

      {/* VUE MOIS */}
      {viewMode === 'mois' ? (
        <View style={{flex: 1}}>
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={() => changerMois('prev')} style={styles.navBtn}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.gold} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{moisNoms[currentMonth - 1]} {currentYear}</Text>
            <TouchableOpacity onPress={() => changerMois('next')} style={styles.navBtn}>
              <MaterialCommunityIcons name="chevron-right" size={28} color={Colors.gold} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.gold} style={{marginTop: 50}} />
          ) : (
            <ScrollView style={{flex: 1}}>
              {calendrier.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="calendar-blank" size={64} color="#333" />
                  <Text style={styles.emptyText}>{t('calendar.noRounds')}</Text>
                </View>
              ) : (
                calendrier.map((entry, index) => (
                  <TouchableOpacity key={index} style={styles.calItem} onPress={() => ouvrirRondesDate(entry.date)}>
                    <View style={{flex: 1}}>
                      <Text style={styles.calDate}>{formatDate(entry.date)}</Text>
                      <Text style={styles.calCount}>{entry.rondes.length} {entry.rondes.length > 1 ? t('calendar.rounds') : t('calendar.round')}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(entry.statut_global) + '20' }]}>
                        <MaterialCommunityIcons name={getStatusIcon(entry.statut_global)} size={20} color={getStatusColor(entry.statut_global)} />
                        <Text style={[styles.statusText, { color: getStatusColor(entry.statut_global) }]}>
                            {entry.statut_global === 'conforme' ? t('common.ok') : t('ronde.defect')}
                        </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>
      ) : (
        /* VUE SEMAINE */
        <View style={{flex: 1}}>
             <FlatList
              data={rondes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{padding: 15}}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.calItem} onPress={() => ouvrirRondeDetail(item.id)}>
                   <View style={{flex: 1}}>
                      <Text style={styles.calDate}>{formatDate(item.date_heure)}</Text>
                      <Text style={styles.calSub}>{new Date(item.date_heure).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {item.odometre} km</Text>
                   </View>
                   <MaterialCommunityIcons name={getStatusIcon(item.statut_global)} size={24} color={getStatusColor(item.statut_global)} />
                </TouchableOpacity>
              )}
             />
        </View>
      )}

      {/* MODAL DETAIL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t('calendar.dayDetails')}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                        <MaterialCommunityIcons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
                
                {loadingModal ? (
                    <ActivityIndicator color={Colors.gold} style={{margin: 20}} />
                ) : (
                    <FlatList 
                        data={selectedRondes}
                        keyExtractor={item => item.id}
                        renderItem={({item}) => (
                            <View style={styles.detailCard}>
                                <View style={styles.detailHeader}>
                                    <Text style={styles.detailTime}>{new Date(item.date_heure).toLocaleTimeString()}</Text>
                                    <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.statut_global)}]}>
                                        <Text style={{color: '#000', fontWeight: 'bold', fontSize: 10}}>{item.statut_global.toUpperCase()}</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.grid}>
                                    <Text style={styles.gridItem}>📍 {item.odometre} {t('common.km')}</Text>
                                    <Text style={styles.gridItem}>🔧 {t('calendar.tires')} {item.check_pneus ? t('common.ok') : '⚠'}</Text>
                                    <Text style={styles.gridItem}>💡 {t('calendar.lights')} {item.check_phares_feux ? t('common.ok') : '⚠'}</Text>
                                    <Text style={styles.gridItem}>🛑 {t('calendar.brakes')} {item.check_liquide_frein ? t('common.ok') : '⚠'}</Text>
                                </View>
                                
                                {item.observations && (
                                    <Text style={styles.obsText}>📝 {item.observations}</Text>
                                )}
                                
                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={[styles.actionBtn, {backgroundColor: Colors.blue}]} onPress={() => envoyerParCourriel(item)}>
                                        <MaterialCommunityIcons name="email" size={18} color="#FFF" />
                                        <Text style={{color: '#FFF'}}>{t('calendar.mail')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#25D366'}]} onPress={() => envoyerParWhatsApp(item)}>
                                        <MaterialCommunityIcons name="whatsapp" size={18} color="#FFF" />
                                        <Text style={{color: '#FFF'}}>{t('calendar.whatsapp')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />
                )}
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textMain },
  backButton: { padding: 5 },
  exportButton: { padding: 8, borderRadius: 8, backgroundColor: Colors.card + '40' },
  
  filters: { flexDirection: 'row', padding: 15, gap: 10 },
  filterButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: Colors.card, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  filterButtonActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '20' },
  filterText: { fontSize: 14, color: Colors.textSub, fontWeight: 'bold' },
  filterTextActive: { color: Colors.gold },

  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  monthTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  navBtn: { padding: 10 },

  calItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, padding: 15, marginHorizontal: 15, marginVertical: 6, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: Colors.gold },
  calDate: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  calCount: { fontSize: 12, color: Colors.textSub },
  calSub: { fontSize: 12, color: Colors.textSub, marginTop: 2 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: Colors.textSub, marginTop: 10 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#18181B', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  
  detailCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 15, marginBottom: 15 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailTime: { color: Colors.textSub, fontWeight: 'bold' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  gridItem: { width: '45%', color: '#FFF', fontSize: 12 },
  obsText: { color: '#AAA', fontStyle: 'italic', fontSize: 12, marginBottom: 10, backgroundColor: '#000', padding: 8, borderRadius: 4 },
  
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 5 },
});
