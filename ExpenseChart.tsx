import React, { memo, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

interface ExpenseCategory {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface ExpenseChartProps {
  expensesByCategory: ExpenseCategory[];
}

const screenWidth = Dimensions.get('window').width;

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

export const ExpenseChart = memo<ExpenseChartProps>(({ expensesByCategory }) => {
  const chartData = useMemo(() => {
    return expensesByCategory.map(cat => ({
      name: cat.name,
      population: cat.amount,
      color: cat.color,
      legendFontColor: Colors.textSub,
      legendFontSize: 11
    }));
  }, [expensesByCategory]);

  const legendItems = useMemo(() => {
    return expensesByCategory.slice(0, 5).map((cat, idx) => (
      <View key={idx} style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
        <Text style={styles.legendText} numberOfLines={1}>
          {cat.name}
        </Text>
        <Text style={styles.legendAmount}>
          ${(cat.amount || 0).toFixed(2)} ({(cat.percentage || 0).toFixed(1)}%)
        </Text>
      </View>
    ));
  }, [expensesByCategory]);

  if (expensesByCategory.length === 0) {
    return null;
  }

  return (
    <View style={styles.chartCard}>
      <Text style={styles.sectionTitle}>Répartition des dépenses</Text>
      <PieChart
        data={chartData}
        width={screenWidth - 60}
        height={180}
        chartConfig={{
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="0"
        absolute
        hasLegend={false}
      />
      <View style={styles.legendContainer}>
        {legendItems}
      </View>
    </View>
  );
});

ExpenseChart.displayName = 'ExpenseChart';

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: Colors.card,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textHeader,
    marginBottom: 16,
  },
  legendContainer: {
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMain,
  },
  legendAmount: {
    fontSize: 12,
    color: Colors.textSub,
    fontWeight: 'bold',
  },
});
