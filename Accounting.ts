/**
 * TYPES FIRESTORE - COMPTABILITÉ
 * 
 * Structure des données stockées dans Firebase Firestore
 * Ces types garantissent la cohérence des données
 */

import {
    ExpenseCategoryId,
    IncomeCategoryId,
    PaymentMethod,
    TransactionStatus
} from '../constants/Accounting';

// ============================================
// TYPES DE BASE
// ============================================

/**
 * Timestamp Firebase
 */
export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
}

/**
 * Métadonnées communes à toutes les transactions
 */
export interface TransactionMetadata {
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  createdBy: string;  // ID du chauffeur
  deviceId?: string;   // ID de l'appareil (optionnel)
  syncStatus?: 'synced' | 'pending' | 'error';
}

// ============================================
// DÉPENSE (EXPENSE)
// ============================================

/**
 * Structure d'une dépense dans Firestore
 * 
 * IMPORTANT : 
 * - categoryId stocke la CLÉ (ex: "FUEL") pas la traduction
 * - merchant, description sont des textes libres
 * - Les montants sont en CAD (dollars canadiens)
 */
export interface Expense extends TransactionMetadata {
  id: string;                          // ID unique Firestore
  categoryId: ExpenseCategoryId;       // CLÉ de catégorie (ex: "FUEL")
  merchant: string;                    // Nom du marchand (ex: "Shell")
  description?: string;                // Description optionnelle
  
  // Montants (CAD)
  amountExclTax: number;               // Montant hors taxes
  tps: number;                         // TPS (5%)
  tvq: number;                         // TVQ (9.975%)
  total: number;                       // Total TTC
  
  // Date et statut
  date: FirebaseTimestamp;             // Date de la transaction
  status: TransactionStatus;           // pending | completed | cancelled
  paymentMethod?: PaymentMethod;       // Méthode de paiement (optionnel)
  
  // Pièce jointe (optionnel)
  receiptUrl?: string;                 // URL de la photo du reçu (Firebase Storage)
  receiptStoragePath?: string;         // Chemin dans Storage
  
  // Géolocalisation (optionnel)
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  
  // Source de la saisie
  source: 'manual' | 'scanner' | 'import';  // Comment la dépense a été créée
  
  // Récurrence (optionnel)
  isRecurring?: boolean;               // Dépense récurrente
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly';  // Fréquence
  nextRecurringDate?: FirebaseTimestamp;  // Prochaine date de récurrence
  
  // Notes
  notes?: string;                      // Notes additionnelles
}

/**
 * Type pour la création d'une nouvelle dépense (sans ID ni metadata)
 */
export type CreateExpenseInput = Omit<
  Expense, 
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status'
> & {
  status?: TransactionStatus;
};

// ============================================
// REVENU (INCOME)
// ============================================

/**
 * Structure d'un revenu dans Firestore
 */
export interface Income extends TransactionMetadata {
  id: string;                          // ID unique Firestore
  categoryId: IncomeCategoryId;        // CLÉ de catégorie (ex: "COURSE")
  description?: string;                // Description optionnelle
  
  // Montant (CAD)
  amount: number;                      // Montant total
  
  // Date et statut
  date: FirebaseTimestamp;             // Date de la transaction
  status: TransactionStatus;           // pending | completed | cancelled
  
  // Détails de la course (si applicable)
  tripDetails?: {
    origin?: string;                   // Adresse départ
    destination?: string;              // Adresse arrivée
    distance?: number;                 // Distance en km
    duration?: number;                 // Durée en minutes
    paymentMethod?: PaymentMethod;
  };
  
  // Géolocalisation (optionnel)
  location?: {
    latitude: number;
    longitude: number;
  };
  
  // Source de la saisie
  source: 'manual' | 'scanner' | 'import';
  
  // Notes
  notes?: string;
}

/**
 * Type pour la création d'un nouveau revenu
 */
export type CreateIncomeInput = Omit<
  Income, 
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status'
> & {
  status?: TransactionStatus;
  paymentMethod?: PaymentMethod; // ✅ AJOUT: paymentMethod optionnel utilisant le type PaymentMethod
};

// ============================================
// BILAN / RAPPORT
// ============================================

/**
 * Bilan comptable calculé sur une période
 */
export interface AccountingSummary {
  period: {
    start: Date;
    end: Date;
  };
  
  // Totaux
  totalIncome: number;                 // Total des revenus
  totalExpenses: number;               // Total des dépenses
  netBalance: number;                  // Solde net (revenus - dépenses)
  
  // Détails par catégorie
  incomeByCategory: Record<IncomeCategoryId, number>;
  expensesByCategory: Record<ExpenseCategoryId, number>;
  
  // Taxes
  totalTps: number;                    // Total TPS récupérable
  totalTvq: number;                    // Total TVQ récupérable
  
  // Compteurs
  incomeCount: number;                 // Nombre de revenus
  expenseCount: number;                // Nombre de dépenses
}

// ============================================
// EXPORT EXCEL
// ============================================

/**
 * Structure d'une ligne pour l'export Excel
 */
export interface ExcelExportRow {
  date: string;                        // Date formatée
  type: 'REVENU' | 'DÉPENSE';         // Type de transaction
  category: string;                    // Catégorie EXCEL (ex: "CARBURANT")
  description: string;                 // Description
  merchant?: string;                   // Marchand (dépenses uniquement)
  amountExclTax?: number;              // Montant HT (dépenses)
  tps?: number;                        // TPS
  tvq?: number;                        // TVQ
  total: number;                       // Total
  notes?: string;                      // Notes
}

// ============================================
// REQUÊTES / FILTRES
// ============================================

/**
 * Filtres pour les requêtes de transactions
 */
export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  categoryIds?: (ExpenseCategoryId | IncomeCategoryId)[];
  status?: TransactionStatus;
  source?: 'manual' | 'scanner' | 'import';
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Options de tri
 */
export interface TransactionSortOptions {
  field: 'date' | 'amount' | 'createdAt';
  order: 'asc' | 'desc';
}

/**
 * Paramètres de pagination
 */
export interface PaginationOptions {
  limit: number;
  offset: number;
}
