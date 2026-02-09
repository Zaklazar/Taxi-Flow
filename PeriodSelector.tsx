import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface PeriodSelectorProps {
  historyPeriod: 'today' | '30days' | 'custom';
  onPeriodChange: (period: 'today' | '30days' | 'custom') => void;
  showDateRange: boolean;
  onToggleDateRange: () => void;
  customStartDate: Date;
  customEndDate: Date;
  onStartDatePress: () => void;
  onEndDatePress: () => void;
}

const Colors = {
  background: '#18181B',
  card: '#27272A',
  textMain: '#FFFFFF',
  textHeader: '#FFFFFF',
  textSub: '#9CA3AF',
  gold: '#FBBF24',
  accent: '#F97316',
  success: '#22C55E',
  error: '#EF4444',
  inputBg: '#333',
  border: '#3F3F46',
};

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  historyPeriod,
  onPeriodChange,
  showDateRange,
  onToggleDateRange,
  customStartDate,
  customEndDate,
  onStartDatePress,
  onEndDatePress,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Historique</Text>
      <View style={styles.periodButtons}>
        <TouchableOpacity 
          onPress={() => onPeriodChange('today')} 
          style={[styles.periodBtn, historyPeriod === 'today' && styles.periodBtnActive]}
        >
          <Text style={styles.periodBtnText}>Aujourd'hui</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => onPeriodChange('30days')} 
          style={[styles.periodBtn, historyPeriod === '30days' && styles.periodBtnActive]}
        >
          <Text style={styles.periodBtnText}>30 jours</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => {
            onToggleDateRange();
            if (!showDateRange) {
              onPeriodChange('custom');
            }
          }} 
          style={[styles.periodBtn, historyPeriod === 'custom' && styles.periodBtnActive]}
        >
          <Text style={styles.periodBtnText}>Choisir Date</Text>
        </TouchableOpacity>
      </View>

      {showDateRange && (
        <View style={styles.dateRangeButtons}>
          <TouchableOpacity style={styles.dateRangeButton} onPress={onStartDatePress}>
            <Text style={styles.dateRangeLabel}>Du</Text>
            <Text style={styles.dateRangeValue}>
              {customStartDate.toLocaleDateString('fr-CA', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
              })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateRangeButton} onPress={onEndDatePress}>
            <Text style={styles.dateRangeLabel}>Au</Text>
            <Text style={styles.dateRangeValue}>
              {customEndDate.toLocaleDateString('fr-CA', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
              })}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textHeader,
    marginBottom: 16,
  },
  periodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodBtnActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  periodBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textMain,
  },
  dateRangeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dateRangeButton: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateRangeLabel: {
    fontSize: 12,
    color: Colors.textSub,
    marginBottom: 4,
  },
  dateRangeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textMain,
  },
});
