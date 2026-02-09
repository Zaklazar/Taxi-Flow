/**
 * SERVICE DE GESTION DES DÉPENSES
 * 
 * Ce service gère toutes les opérations CRUD pour les dépenses dans Firestore
 * Architecture bilingue : On stocke les IDs de catégories, pas les traductions
 * 
 * Règles importantes :
 * 1. Firestore stocke UNIQUEMENT les IDs (ex: "FUEL")
 * 2. L'affichage utilise i18next : t('expenseCategories.FUEL')
 * 3. L'export Excel utilise EXPENSE_CATEGORIES[id] pour compatibilité
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';

import { db, COLLECTIONS } from './firebaseConfig';
import type {
  Expense,
  CreateExpenseInput,
  TransactionFilters,
  TransactionSortOptions,
  PaginationOptions
} from '../types/Accounting';
import { TRANSACTION_STATUS } from '../constants/Accounting';

// ============================================
// CRÉATION
// ============================================

/**
 * Ajouter une nouvelle dépense
 * 
 * @param expenseData - Données de la dépense (sans ID)
 * @param driverId - ID du chauffeur (utilisateur actuel)
 * @returns ID de la dépense créée
 * 
 * @example
 * const expenseId = await addExpense({
 *   categoryId: 'FUEL',        // CLÉ, pas la traduction !
 *   merchant: 'Shell',
 *   amountExclTax: 45.00,
 *   tps: 2.25,
 *   tvq: 4.49,
 *   total: 51.74,
 *   date: Timestamp.now(),
 *   source: 'manual'
 * }, 'chauffeur-123');
 */
export const addExpense = async (
  expenseData: CreateExpenseInput,
  driverId: string
): Promise<string> => {
  try {
    const now = Timestamp.now();
    
    // Préparer le document complet
    const expenseDoc: any = {
      ...expenseData,
      driverId,  // ✅ CORRECTION: Ajouter driverId pour requêtes
      status: expenseData.status || TRANSACTION_STATUS.COMPLETED,
      createdAt: now,
      updatedAt: now,
      createdBy: driverId,  // Garder aussi createdBy pour compatibilité
      syncStatus: 'synced'
    };
    
    console.log('💾 Document à enregistrer:', expenseDoc);
    
    // Ajouter à Firestore
    const docRef = await addDoc(collection(db, COLLECTIONS.EXPENSES), expenseDoc);
    
    console.log('✅ Dépense ajoutée:', docRef.id);
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Erreur ajout dépense:', error);
    throw new Error('Impossible d\'ajouter la dépense');
  }
};

// ============================================
// LECTURE
// ============================================

/**
 * Récupérer une dépense par ID
 */
export const getExpenseById = async (expenseId: string): Promise<Expense | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.EXPENSES, expenseId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Expense;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erreur récupération dépense:', error);
    throw new Error('Impossible de récupérer la dépense');
  }
};

/**
 * Récupérer toutes les dépenses d'un chauffeur
 * 
 * @param driverId - ID du chauffeur
 * @param filters - Filtres optionnels (dates, catégories, etc.)
 * @param sortOptions - Options de tri
 * @param pagination - Options de pagination
 */
export const getExpenses = async (
  driverId: string,
  filters?: TransactionFilters,
  sortOptions?: TransactionSortOptions,
  pagination?: PaginationOptions
): Promise<Expense[]> => {
  try {
    const constraints: QueryConstraint[] = [
      where('driverId', '==', driverId) // ✅ CORRECTION: utiliser 'driverId' au lieu de 'createdBy'
    ];
    
    // Filtres de dates
    if (filters?.startDate) {
      constraints.push(where('date', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters?.endDate) {
      constraints.push(where('date', '<=', Timestamp.fromDate(filters.endDate)));
    }
    
    // Filtre de catégories
    if (filters?.categoryIds && filters.categoryIds.length > 0) {
      constraints.push(where('categoryId', 'in', filters.categoryIds));
    }
    
    // Filtre de statut
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status));
    }
    
    // Tri
    const sortField = sortOptions?.field || 'date';
    const sortOrder = sortOptions?.order || 'desc';
    constraints.push(orderBy(sortField, sortOrder));
    
    // Pagination
    if (pagination?.limit) {
      constraints.push(firestoreLimit(pagination.limit));
    }
    
    // Exécuter la requête
    const q = query(collection(db, COLLECTIONS.EXPENSES), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const expenses: Expense[] = [];
    querySnapshot.forEach((doc) => {
      expenses.push({
        id: doc.id,
        ...doc.data()
      } as Expense);
    });
    
    console.log(`✅ ${expenses.length} dépenses récupérées`);
    return expenses;
    
  } catch (error) {
    console.error('❌ Erreur récupération dépenses:', error);
    throw new Error('Impossible de récupérer les dépenses');
  }
};

/**
 * Récupérer les dépenses d'une période spécifique
 * 
 * @example
 * // Dépenses du mois en cours
 * const expenses = await getExpensesByPeriod(
 *   'chauffeur-123',
 *   startOfMonth(new Date()),
 *   endOfMonth(new Date())
 * );
 */
export const getExpensesByPeriod = async (
  driverId: string,
  startDate: Date,
  endDate: Date
): Promise<Expense[]> => {
  return getExpenses(driverId, { startDate, endDate });
};

/**
 * Récupérer les dépenses récentes (10 dernières par date de facturation)
 */
export const getRecentExpenses = async (driverId: string, limit: number = 10): Promise<Expense[]> => {
  return getExpenses(
    driverId,
    undefined,
    { field: 'date', order: 'desc' }, // ✅ CORRECTION : Trier par date facture, pas createdAt
    { limit, offset: 0 }
  );
};

// ============================================
// MISE À JOUR
// ============================================

/**
 * Mettre à jour une dépense
 * 
 * @param expenseId - ID de la dépense
 * @param updates - Champs à mettre à jour
 */
export const updateExpense = async (
  expenseId: string,
  updates: Partial<Omit<Expense, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.EXPENSES, expenseId);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
      syncStatus: 'synced'
    });
    
    console.log('✅ Dépense mise à jour:', expenseId);
  } catch (error) {
    console.error('❌ Erreur mise à jour dépense:', error);
    throw new Error('Impossible de mettre à jour la dépense');
  }
};

// ============================================
// SUPPRESSION
// ============================================

/**
 * Supprimer une dépense
 * 
 * @param expenseId - ID de la dépense
 */
export const deleteExpense = async (expenseId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.EXPENSES, expenseId);
    await deleteDoc(docRef);
    
    console.log('✅ Dépense supprimée:', expenseId);
  } catch (error) {
    console.error('❌ Erreur suppression dépense:', error);
    throw new Error('Impossible de supprimer la dépense');
  }
};

/**
 * Supprimer plusieurs dépenses
 * (Soft delete recommandé en production)
 */
export const deleteMultipleExpenses = async (expenseIds: string[]): Promise<void> => {
  try {
    const deletePromises = expenseIds.map(id => deleteExpense(id));
    await Promise.all(deletePromises);
    
    console.log(`✅ ${expenseIds.length} dépenses supprimées`);
  } catch (error) {
    console.error('❌ Erreur suppression multiple:', error);
    throw new Error('Impossible de supprimer les dépenses');
  }
};

// ============================================
// STATISTIQUES
// ============================================

/**
 * Calculer le total des dépenses sur une période
 */
export const getTotalExpenses = async (
  driverId: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> => {
  const expenses = await getExpenses(driverId, { startDate, endDate });
  return expenses.reduce((sum, expense) => sum + expense.total, 0);
};

/**
 * Calculer les dépenses par catégorie
 */
export const getExpensesByCategory = async (
  driverId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Record<string, number>> => {
  const expenses = await getExpenses(driverId, { startDate, endDate });
  
  const byCategory: Record<string, number> = {};
  
  expenses.forEach(expense => {
    if (!byCategory[expense.categoryId]) {
      byCategory[expense.categoryId] = 0;
    }
    byCategory[expense.categoryId] += expense.total;
  });
  
  return byCategory;
};

/**
 * Calculer le total des taxes récupérables
 */
export const getTotalTaxes = async (
  driverId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ tps: number; tvq: number; total: number }> => {
  const expenses = await getExpenses(driverId, { startDate, endDate });
  
  const tps = expenses.reduce((sum, expense) => sum + expense.tps, 0);
  const tvq = expenses.reduce((sum, expense) => sum + expense.tvq, 0);
  
  return {
    tps: parseFloat(tps.toFixed(2)),
    tvq: parseFloat(tvq.toFixed(2)),
    total: parseFloat((tps + tvq).toFixed(2))
  };
};

// ============================================
// VALIDATION
// ============================================

/**
 * Valider les données d'une dépense avant sauvegarde
 */
export const validateExpenseData = (data: CreateExpenseInput): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Catégorie requise
  if (!data.categoryId) {
    errors.push('Catégorie requise');
  }
  
  // Marchand requis
  if (!data.merchant || data.merchant.trim().length === 0) {
    errors.push('Marchand requis');
  }
  
  // Montants positifs
  if (data.total <= 0) {
    errors.push('Le montant doit être positif');
  }
  
  // Date valide
  if (!data.date) {
    errors.push('Date requise');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};
