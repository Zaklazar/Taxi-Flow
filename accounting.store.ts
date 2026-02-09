import { create } from 'zustand';
import type { Expense, Income } from '../types/Accounting';

export type HistoryPeriod = 'today' | '30days' | 'custom';

interface AccountingState {
  // Données
  expenses: Expense[];
  revenues: Income[];
  loading: boolean;
  
  // Période et filtres
  historyPeriod: HistoryPeriod;
  customStartDate: Date;
  customEndDate: Date;
  showDateRange: boolean;
  
  // États des modals
  modalRevenueVisible: boolean;
  modalExpenseVisible: boolean;
  modalSearchVisible: boolean;
  modalExportVisible: boolean;
  modalEditExpenseVisible: boolean;
  modalEditRevenueVisible: boolean;
  
  // Formulaires
  amount: string;
  description: string;
  category: string; // ExpenseCategoryId
  expenseDate: Date;
  revenueDate: Date;
  revenueCategory: string;
  
  // Édition
  editingExpense: Expense | null;
  editingRevenue: Income | null;
  
  // Recherche et export
  searchQuery: string;
  exportPeriod: string;
  exportStartDate: Date;
  exportEndDate: Date;
  
  // Données scannées
  scannedData: any;
  isScanning: boolean;
  processedScanData: string | null;
  
  // Date picker
  showCustomDateModal: 'start' | 'end' | 'expense' | 'revenue' | null;
  tempCustomDate: Date;
}

interface AccountingActions {
  // Actions pour les données
  setExpenses: (expenses: Expense[]) => void;
  setRevenues: (revenues: Income[]) => void;
  setLoading: (loading: boolean) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addRevenue: (revenue: Income) => void;
  updateRevenue: (id: string, updates: Partial<Income>) => void;
  deleteRevenue: (id: string) => void;
  
  // Actions pour la période
  setHistoryPeriod: (period: HistoryPeriod) => void;
  setCustomStartDate: (date: Date) => void;
  setCustomEndDate: (date: Date) => void;
  setShowDateRange: (show: boolean) => void;
  
  // Actions pour les modals
  setModalRevenueVisible: (visible: boolean) => void;
  setModalExpenseVisible: (visible: boolean) => void;
  setModalSearchVisible: (visible: boolean) => void;
  setModalExportVisible: (visible: boolean) => void;
  setModalEditExpenseVisible: (visible: boolean) => void;
  setModalEditRevenueVisible: (visible: boolean) => void;
  
  // Actions pour les formulaires
  setAmount: (amount: string) => void;
  setDescription: (description: string) => void;
  setCategory: (category: string) => void;
  setExpenseDate: (date: Date) => void;
  setRevenueDate: (date: Date) => void;
  setRevenueCategory: (category: string) => void;
  
  // Actions pour l'édition
  setEditingExpense: (expense: Expense | null) => void;
  setEditingRevenue: (revenue: Income | null) => void;
  
  // Actions pour la recherche et export
  setSearchQuery: (query: string) => void;
  setExportPeriod: (period: string) => void;
  setExportStartDate: (date: Date) => void;
  setExportEndDate: (date: Date) => void;
  
  // Actions pour les données scannées
  setScannedData: (data: any) => void;
  setIsScanning: (scanning: boolean) => void;
  setProcessedScanData: (data: string | null) => void;
  
  // Actions pour le date picker
  setShowCustomDateModal: (modal: 'start' | 'end' | 'expense' | 'revenue' | null) => void;
  setTempCustomDate: (date: Date) => void;
  
  // Actions utilitaires
  resetForm: () => void;
  resetExpenseForm: () => void;
  resetRevenueForm: () => void;
}

export const useAccountingStore = create<AccountingState & AccountingActions>((set, get) => ({
  // État initial
  expenses: [],
  revenues: [],
  loading: false,
  
  historyPeriod: 'today',
  customStartDate: new Date(),
  customEndDate: new Date(),
  showDateRange: false,
  
  modalRevenueVisible: false,
  modalExpenseVisible: false,
  modalSearchVisible: false,
  modalExportVisible: false,
  modalEditExpenseVisible: false,
  modalEditRevenueVisible: false,
  
  amount: '',
  description: '',
  category: 'FUEL',
  expenseDate: new Date(),
  revenueDate: new Date(),
  revenueCategory: 'COURSE',
  
  editingExpense: null,
  editingRevenue: null,
  
  searchQuery: '',
  exportPeriod: 'month',
  exportStartDate: new Date(),
  exportEndDate: new Date(),
  
  scannedData: null,
  isScanning: false,
  processedScanData: null,
  
  showCustomDateModal: null,
  tempCustomDate: new Date(),

  // Actions pour les données
  setExpenses: (expenses) => set({ expenses }),
  setRevenues: (revenues) => set({ revenues }),
  setLoading: (loading) => set({ loading }),
  
  addExpense: (expense) => set((state) => ({
    expenses: [expense, ...state.expenses]
  })),
  
  updateExpense: (id, updates) => set((state) => ({
    expenses: state.expenses.map(expense =>
      expense.id === id ? { ...expense, ...updates } : expense
    )
  })),
  
  deleteExpense: (id) => set((state) => ({
    expenses: state.expenses.filter(expense => expense.id !== id)
  })),
  
  addRevenue: (revenue) => set((state) => ({
    revenues: [revenue, ...state.revenues]
  })),
  
  updateRevenue: (id, updates) => set((state) => ({
    revenues: state.revenues.map(revenue =>
      revenue.id === id ? { ...revenue, ...updates } : revenue
    )
  })),
  
  deleteRevenue: (id) => set((state) => ({
    revenues: state.revenues.filter(revenue => revenue.id !== id)
  })),
  
  // Actions pour la période
  setHistoryPeriod: (historyPeriod) => set({ historyPeriod }),
  setCustomStartDate: (customStartDate) => set({ customStartDate }),
  setCustomEndDate: (customEndDate) => set({ customEndDate }),
  setShowDateRange: (showDateRange) => set({ showDateRange }),
  
  // Actions pour les modals
  setModalRevenueVisible: (modalRevenueVisible) => set({ modalRevenueVisible }),
  setModalExpenseVisible: (modalExpenseVisible) => set({ modalExpenseVisible }),
  setModalSearchVisible: (modalSearchVisible) => set({ modalSearchVisible }),
  setModalExportVisible: (modalExportVisible) => set({ modalExportVisible }),
  setModalEditExpenseVisible: (modalEditExpenseVisible) => set({ modalEditExpenseVisible }),
  setModalEditRevenueVisible: (modalEditRevenueVisible) => set({ modalEditRevenueVisible }),
  
  // Actions pour les formulaires
  setAmount: (amount) => set({ amount }),
  setDescription: (description) => set({ description }),
  setCategory: (category) => set({ category }),
  setExpenseDate: (expenseDate) => set({ expenseDate }),
  setRevenueDate: (revenueDate) => set({ revenueDate }),
  setRevenueCategory: (revenueCategory) => set({ revenueCategory }),
  
  // Actions pour l'édition
  setEditingExpense: (editingExpense) => set({ editingExpense }),
  setEditingRevenue: (editingRevenue) => set({ editingRevenue }),
  
  // Actions pour la recherche et export
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setExportPeriod: (exportPeriod) => set({ exportPeriod }),
  setExportStartDate: (exportStartDate) => set({ exportStartDate }),
  setExportEndDate: (exportEndDate) => set({ exportEndDate }),
  
  // Actions pour les données scannées
  setScannedData: (scannedData) => set({ scannedData }),
  setIsScanning: (isScanning) => set({ isScanning }),
  setProcessedScanData: (processedScanData) => set({ processedScanData }),
  
  // Actions pour le date picker
  setShowCustomDateModal: (showCustomDateModal) => set({ showCustomDateModal }),
  setTempCustomDate: (tempCustomDate) => set({ tempCustomDate }),
  
  // Actions utilitaires
  resetForm: () => set({
    amount: '',
    description: '',
    category: 'FUEL',
    expenseDate: new Date(),
    revenueDate: new Date(),
    revenueCategory: 'COURSE',
    editingExpense: null,
    editingRevenue: null,
    scannedData: null,
    isScanning: false,
    processedScanData: null,
  }),
  
  resetExpenseForm: () => set({
    amount: '',
    description: '',
    category: 'FUEL',
    expenseDate: new Date(),
    editingExpense: null,
    scannedData: null,
    isScanning: false,
    processedScanData: null,
  }),
  
  resetRevenueForm: () => set({
    amount: '',
    description: '',
    revenueDate: new Date(),
    revenueCategory: 'COURSE',
    editingRevenue: null,
  }),
}));

// Selectors pour les calculs dérivés
export const useAccountingSelectors = () => {
  const expenses = useAccountingStore((state) => state.expenses);
  const revenues = useAccountingStore((state) => state.revenues);
  const historyPeriod = useAccountingStore((state) => state.historyPeriod);
  const customStartDate = useAccountingStore((state) => state.customStartDate);
  const customEndDate = useAccountingStore((state) => state.customEndDate);

  // Calculs mémorisés
  const totalRevenues = revenues.reduce((sum, revenue) => sum + (revenue.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.total || 0), 0);
  const netBalance = totalRevenues - totalExpenses;

  const expensesByCategory = expenses.reduce((acc, expense) => {
    const category = expense.categoryId || 'OTHER';
    acc[category] = (acc[category] || 0) + (expense.total || 0);
    return acc;
  }, {} as Record<string, number>);

  return {
    totalRevenues,
    totalExpenses,
    netBalance,
    expensesByCategory,
    filteredExpenses: expenses, // TODO: Appliquer les filtres de date
    filteredRevenues: revenues, // TODO: Appliquer les filtres de date
  };
};
