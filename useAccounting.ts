/**
 * useAccounting.ts
 * 
 * Hook React personnalisé pour gérer la comptabilité (dépenses et revenus) dans TaxiFlow.
 * Simplifie l'utilisation des services ExpenseService et IncomeService.
 * 
 * Fonctionnalités :
 * - Chargement automatique des dépenses/revenus
 * - Filtrage et tri
 * - Ajout/modification/suppression
 * - Calculs de totaux et statistiques
 * - Gestion du cache et du refresh
 * 
 * @example
 * const {
 *   expenses,
 *   incomes,
 *   loading,
 *   addExpense,
 *   addIncome,
 *   refreshData,
 *   stats
 * } = useAccounting('chauffeur-123', { startDate, endDate });
 */

import { useState, useEffect, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  getExpenses,
  addExpense as addExpenseService,
  updateExpense as updateExpenseService,
  deleteExpense as deleteExpenseService,
  getTotalExpenses,
  getExpensesByCategory
} from '../services/ExpenseService';
import {
  getIncomes,
  addIncome as addIncomeService,
  updateIncome as updateIncomeService,
  deleteIncome as deleteIncomeService,
  getTotalIncome,
  getIncomesByCategory,
  getTripStats
} from '../services/IncomeService';
import {
  Expense,
  Income,
  CreateExpenseInput,
  CreateIncomeInput,
  TransactionFilters,
  SortOptions,
  PaginationOptions,
  ExpenseCategoryId,
  IncomeCategoryId,
  PaymentMethod
} from '../types/Accounting';

interface UseAccountingOptions {
  startDate?: Timestamp;
  endDate?: Timestamp;
  autoLoad?: boolean;
}

interface AccountingStats {
  totalExpenses: number;
  totalIncome: number;
  netProfit: number;
  expensesByCategory: Record<ExpenseCategoryId, number>;
  incomesByCategory: Record<IncomeCategoryId, number>;
  tripStats: {
    totalRevenue: number;
    tripCount: number;
    totalDistance: number;
    totalDuration: number;
    averageRevenue: number;
    averageDistance: number;
    averageDuration: number;
  };
}

interface UseAccountingReturn {
  expenses: Expense[];
  incomes: Income[];
  loading: boolean;
  error: string | null;
  stats: AccountingStats | null;
  
  // Actions sur les dépenses
  addExpense: (data: CreateExpenseInput) => Promise<string>;
  updateExpense: (id: string, updates: Partial<CreateExpenseInput>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  
  // Actions sur les revenus
  addIncome: (data: CreateIncomeInput) => Promise<string>;
  updateIncome: (id: string, updates: Partial<CreateIncomeInput>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  
  // Utilitaires
  refreshData: () => Promise<void>;
  setFilters: (filters: Partial<TransactionFilters>) => void;
  setSortOptions: (options: SortOptions) => void;
}

export const useAccounting = (
  driverId: string,
  options: UseAccountingOptions = {}
): UseAccountingReturn => {
  const { startDate, endDate, autoLoad = true } = options;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AccountingStats | null>(null);

  const [filters, setFilters] = useState<TransactionFilters>({
    startDate,
    endDate
  });
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'date',
    direction: 'desc'
  });

  // Charger les données
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger dépenses et revenus en parallèle
      const [expensesData, incomesData] = await Promise.all([
        getExpenses(driverId, filters, sortOptions),
        getIncomes(driverId, filters, sortOptions)
      ]);

      setExpenses(expensesData);
      setIncomes(incomesData);

      // Charger les statistiques
      await loadStats();
    } catch (err: any) {
      console.error('Error loading accounting data:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [driverId, filters, sortOptions]);

  // Charger les statistiques
  const loadStats = useCallback(async () => {
    try {
      const [
        totalExpenses,
        totalIncome,
        expensesByCategory,
        incomesByCategory,
        tripStats
      ] = await Promise.all([
        getTotalExpenses(driverId, filters.startDate, filters.endDate),
        getTotalIncome(driverId, filters.startDate, filters.endDate),
        getExpensesByCategory(driverId, filters.startDate, filters.endDate),
        getIncomesByCategory(driverId, filters.startDate, filters.endDate),
        getTripStats(driverId, filters.startDate, filters.endDate)
      ]);

      setStats({
        totalExpenses,
        totalIncome,
        netProfit: totalIncome - totalExpenses,
        expensesByCategory,
        incomesByCategory,
        tripStats
      });
    } catch (err: any) {
      console.error('Error loading stats:', err);
    }
  }, [driverId, filters.startDate, filters.endDate]);

  // Charger les données au montage et quand les filtres changent
  useEffect(() => {
    if (autoLoad && driverId) {
      loadData();
    }
  }, [autoLoad, driverId, loadData]);

  // Ajouter une dépense
  const addExpense = async (data: CreateExpenseInput): Promise<string> => {
    try {
      setError(null);
      const expenseId = await addExpenseService(data, driverId);
      
      // Rafraîchir les données
      await loadData();
      
      return expenseId;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Mettre à jour une dépense
  const updateExpense = async (
    id: string,
    updates: Partial<CreateExpenseInput>
  ): Promise<void> => {
    try {
      setError(null);
      await updateExpenseService(id, updates, driverId);
      
      // Rafraîchir les données
      await loadData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Supprimer une dépense
  const deleteExpense = async (id: string): Promise<void> => {
    try {
      setError(null);
      await deleteExpenseService(id);
      
      // Rafraîchir les données
      await loadData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Ajouter un revenu
  const addIncome = async (data: CreateIncomeInput): Promise<string> => {
    try {
      setError(null);
      const incomeId = await addIncomeService(data, driverId);
      
      // Rafraîchir les données
      await loadData();
      
      return incomeId;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Mettre à jour un revenu
  const updateIncome = async (
    id: string,
    updates: Partial<CreateIncomeInput>
  ): Promise<void> => {
    try {
      setError(null);
      await updateIncomeService(id, updates, driverId);
      
      // Rafraîchir les données
      await loadData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Supprimer un revenu
  const deleteIncome = async (id: string): Promise<void> => {
    try {
      setError(null);
      await deleteIncomeService(id);
      
      // Rafraîchir les données
      await loadData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Rafraîchir les données
  const refreshData = async (): Promise<void> => {
    await loadData();
  };

  // Mettre à jour les filtres
  const updateFilters = (newFilters: Partial<TransactionFilters>): void => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return {
    expenses,
    incomes,
    loading,
    error,
    stats,
    addExpense,
    updateExpense,
    deleteExpense,
    addIncome,
    updateIncome,
    deleteIncome,
    refreshData,
    setFilters: updateFilters,
    setSortOptions
  };
};

/**
 * Hook simplifié pour récupérer uniquement les statistiques
 * Utile pour les dashboards
 */
export const useAccountingStats = (
  driverId: string,
  startDate?: Timestamp,
  endDate?: Timestamp
): {
  stats: AccountingStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} => {
  const [stats, setStats] = useState<AccountingStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        totalExpenses,
        totalIncome,
        expensesByCategory,
        incomesByCategory,
        tripStats
      ] = await Promise.all([
        getTotalExpenses(driverId, startDate, endDate),
        getTotalIncome(driverId, startDate, endDate),
        getExpensesByCategory(driverId, startDate, endDate),
        getIncomesByCategory(driverId, startDate, endDate),
        getTripStats(driverId, startDate, endDate)
      ]);

      setStats({
        totalExpenses,
        totalIncome,
        netProfit: totalIncome - totalExpenses,
        expensesByCategory,
        incomesByCategory,
        tripStats
      });
    } catch (err: any) {
      console.error('Error loading stats:', err);
      setError(err.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, [driverId, startDate, endDate]);

  useEffect(() => {
    if (driverId) {
      loadStats();
    }
  }, [driverId, loadStats]);

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  };
};
