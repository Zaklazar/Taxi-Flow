import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Expense, Income } from '../../types/Accounting';

interface TransactionsListProps {
  expenses: Expense[];
  revenues: Income[];
  loading: boolean;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onEditRevenue: (revenue: Income) => void;
  onDeleteRevenue: (id: string) => void;
  onAddExpense: () => void;
  getCategoryLabel: (categoryId: string) => string;
  getDateFromTimestamp: (timestamp: any) => Date;
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

export const TransactionsList: React.FC<TransactionsListProps> = ({
  expenses,
  revenues,
  loading,
  onEditExpense,
  onDeleteExpense,
  onEditRevenue,
  onDeleteRevenue,
  onAddExpense,
  getCategoryLabel,
  getDateFromTimestamp,
}) => {
  const renderExpenseItem = (item: Expense, index: number) => (
    <View key={item.id || index} style={styles.transactionItem}>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle}>
          {getCategoryLabel(item.categoryId || 'OTHER')}
        </Text>
        <Text style={styles.transactionDate}>
          {item.date ? 
            `${getDateFromTimestamp(item.date).toLocaleDateString('fr-CA')} à ${getDateFromTimestamp(item.date).toLocaleTimeString('fr-CA', {hour: '2-digit', minute: '2-digit'})}` 
            : 'Date inconnue'}
        </Text>
      </View>
      
      <View style={styles.transactionActions}>
        <Text style={styles.expenseAmount}>
          -${(item.total || 0).toFixed(2)}
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            onPress={() => onEditExpense(item)}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="pencil" size={20} color={Colors.gold} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => onDeleteExpense(item.id)}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.textSub} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderRevenueItem = (item: Income, index: number) => (
    <View key={item.id || index} style={styles.transactionItem}>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle}>
          {item.description || 'Course'}
        </Text>
        <Text style={styles.transactionDate}>
          {item.date ? 
            `${getDateFromTimestamp(item.date).toLocaleDateString('fr-CA')} à ${getDateFromTimestamp(item.date).toLocaleTimeString('fr-CA', {hour: '2-digit', minute: '2-digit'})}` 
            : 'Date inconnue'}
        </Text>
      </View>
      
      <View style={styles.transactionActions}>
        <Text style={styles.revenueAmount}>
          +${(item.amount || 0).toFixed(2)}
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            onPress={() => onEditRevenue(item)}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="pencil" size={20} color={Colors.gold} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => onDeleteRevenue(item.id)}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.textSub} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Liste des dépenses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Historique des dépenses ({expenses?.length || 0})
        </Text>
        
        {loading ? (
          <ActivityIndicator size="large" color={Colors.gold} style={styles.loader} />
        ) : expenses?.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="receipt-text-outline" size={40} color={Colors.textSub} />
            <Text style={styles.emptyStateText}>
              Aucune dépense pour cette période
            </Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={onAddExpense}
            >
              <Text style={styles.addButtonText}>Ajouter une dépense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {expenses.map(renderExpenseItem)}
          </View>
        )}
      </View>

      {/* Liste des revenus */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Historique des revenus ({revenues?.length || 0})
        </Text>
        
        {revenues?.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cash-plus" size={30} color={Colors.textSub} />
            <Text style={styles.emptyStateText}>Aucun revenu cette période</Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {revenues.map(renderRevenueItem)}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    color: Colors.textHeader,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  loader: {
    marginTop: 20,
  },
  emptyState: {
    backgroundColor: Colors.card,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    color: Colors.textSub,
    marginTop: 15,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 15,
    backgroundColor: Colors.gold,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  transactionsList: {
    gap: 10,
  },
  transactionItem: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    color: Colors.textMain,
    fontWeight: 'bold',
    fontSize: 16,
  },
  transactionDate: {
    color: Colors.textSub,
    fontSize: 12,
    marginTop: 4,
  },
  transactionActions: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    color: Colors.error,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  revenueAmount: {
    color: Colors.success,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: 5,
    marginLeft: 10,
  },
});
