import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface FinancialSummaryProps {
  revenues: number;
  expenses: number;
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

export const FinancialSummary = memo<FinancialSummaryProps>(({ revenues, expenses }) => {
  const { t } = useTranslation();
  const netBalance = revenues - expenses;

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{t('accounting.netBalance')}</Text>
      <Text style={[styles.netAmount, { color: netBalance >= 0 ? Colors.success : Colors.error }]}>
        ${netBalance.toFixed(2)}
      </Text>
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Revenus</Text>
          <Text style={[styles.detailValue, { color: Colors.success }]}>
            ${revenues.toFixed(2)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Dépenses</Text>
          <Text style={[styles.detailValue, { color: Colors.error }]}>
            ${expenses.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
});

FinancialSummary.displayName = 'FinancialSummary';

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: Colors.card,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    color: Colors.textSub,
    marginBottom: 8,
  },
  netAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSub,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
