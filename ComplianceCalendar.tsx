import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SafetyRoundService } from '../services/SafetyRoundService';
import { SafetyRound } from '../types/safetyRound';
import { getAuth } from 'firebase/auth';
import { useTranslation } from 'react-i18next';

// Configuration française
LocaleConfig.locales['fr'] = {
  monthNames: [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ],
  monthNamesShort: ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'],
  today: "Aujourd'hui"
};

// Configuration anglaise
LocaleConfig.locales['en'] = {
  monthNames: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  monthNamesShort: ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun.', 'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.'],
  today: 'Today'
};

interface ComplianceCalendarProps {
  onDateSelect: (date: string, rounds: SafetyRound[]) => void;
}

interface MarkedDates {
  [date: string]: {
    selected?: boolean;
    marked?: boolean;
    selectedColor?: string;
    dotColor?: string;
  };
}

const ComplianceCalendar: React.FC<ComplianceCalendarProps> = ({ onDateSelect }) => {
  const { t, i18n } = useTranslation();
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [allRounds, setAllRounds] = useState<SafetyRound[]>([]);

  useEffect(() => {
    LocaleConfig.defaultLocale = i18n.language === 'en' ? 'en' : 'fr';
  }, [i18n.language]);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.log('Utilisateur non connecté');
        setLoading(false);
        return;
      }

      // Charger toutes les rondes depuis Firebase
      const rounds = await SafetyRoundService.getByDriver(user.uid);
      setAllRounds(rounds);

      // Créer le marquage des dates avec code couleur
      const marked: MarkedDates = {};

      rounds.forEach(round => {
        // Vérification de sécurité : s'assurer que round.date existe
        if (!round.date) {
          console.warn('Ronde sans date trouvée:', round.id);
          return;
        }

        const dateKey = round.date.split('T')[0]; // Format YYYY-MM-DD

        // Déterminer la couleur selon le statut
        let color = '#22C55E'; // Vert par défaut (conforme)
        if (round.statut === 'defaut_majeur') {
          color = '#EF4444'; // Rouge
        } else if (round.statut === 'defaut_mineur') {
          color = '#F59E0B'; // Orange
        }

        // Marquer la date (prendre le plus grave si plusieurs rondes le même jour)
        if (marked[dateKey]) {
          // Si déjà marqué, garder le plus grave (Rouge > Orange > Vert)
          if (round.statut === 'defaut_majeur') {
            marked[dateKey].dotColor = '#EF4444';
          } else if (round.statut === 'defaut_mineur' && marked[dateKey].dotColor !== '#EF4444') {
            marked[dateKey].dotColor = '#F59E0B';
          }
        } else {
          marked[dateKey] = {
            marked: true,
            dotColor: color,
          };
        }
      });

      // Sélectionner aujourd'hui par défaut
      const today = new Date().toISOString().split('T')[0];
      marked[today] = {
        ...marked[today],
        selected: true,
        selectedColor: '#FBBF24',
      };

      setMarkedDates(marked);
      setSelectedDate(today);

      // Charger les rondes du jour (avec vérification de date)
      const todayRounds = rounds.filter(r => r.date && r.date.startsWith(today));
      onDateSelect(today, todayRounds);

      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement calendrier:', error);
      setLoading(false);
    }
  };

  const handleDayPress = (day: any) => {
    const dateKey = day.dateString;

    // Mettre à jour le marquage (déplacer la sélection)
    const newMarked: MarkedDates = {};
    Object.keys(markedDates).forEach(key => {
      newMarked[key] = {
        ...markedDates[key],
        selected: key === dateKey,
        selectedColor: key === dateKey ? '#FBBF24' : undefined,
      };
    });

    // Si la date n'était pas marquée, l'ajouter avec sélection
    if (!newMarked[dateKey]) {
      newMarked[dateKey] = {
        selected: true,
        selectedColor: '#FBBF24',
      };
    }

    setMarkedDates(newMarked);
    setSelectedDate(dateKey);

    // Filtrer les rondes du jour sélectionné (avec vérification de date)
    const dayRounds = allRounds.filter(r => r.date && r.date.startsWith(dateKey));
    onDateSelect(dateKey, dayRounds);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FBBF24" />
        <Text style={styles.loadingText}>{t('calendar.loadingCalendar')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Calendar
        current={selectedDate || new Date().toISOString().split('T')[0]}
        onDayPress={handleDayPress}
        markedDates={markedDates}
        theme={{
          backgroundColor: '#FFFFFF',
          calendarBackground: '#FFFFFF',
          textSectionTitleColor: '#1F2937',
          selectedDayBackgroundColor: '#FBBF24',
          selectedDayTextColor: '#FFFFFF',
          todayTextColor: '#FBBF24',
          dayTextColor: '#1F2937',
          textDisabledColor: '#D1D5DB',
          dotColor: '#FBBF24',
          selectedDotColor: '#FFFFFF',
          arrowColor: '#FBBF24',
          monthTextColor: '#1F2937',
          indicatorColor: '#FBBF24',
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 14,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 12,
        }}
      />

      {/* Légende */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>{t('calendar.legend')} :</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.legendText}>{t('calendar.conforme')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>{t('calendar.minorDefect')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>{t('calendar.majorDefect')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
  },
  legend: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default ComplianceCalendar;
