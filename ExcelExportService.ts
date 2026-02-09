/**
 * ExcelExportService.ts
 * 
 * Service d'export des données comptables vers Excel.
 * Compatible avec le format Excel existant de l'utilisateur.
 * 
 * Architecture :
 * - Mapping des IDs Firestore (ex: "FUEL") vers colonnes Excel (ex: "CARBURANT")
 * - Génération de rapports mensuels/annuels
 * - Format compatible avec les formules Excel existantes
 * - Support des taxes TPS/TVQ québécoises
 * 
 * @example
 * // Générer un rapport mensuel
 * const excelData = await generateMonthlyReport('chauffeur-123', 2025, 1);
 * // excelData contient les lignes formatées pour Excel
 */

import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/Accounting';
import { ExcelExportRow, Expense, Income } from '../types/Accounting';

/**
 * Convertit une dépense Firestore en ligne Excel
 * 
 * @param expense - Dépense Firestore
 * @returns Ligne formatée pour Excel
 */
export const expenseToExcelRow = (expense: Expense): ExcelExportRow => {
  const date = new Date((expense.date as any).seconds ? (expense.date as any).seconds * 1000 : expense.date);
  
  return {
    date: date.toISOString().split('T')[0], // Format YYYY-MM-DD
    type: 'DÉPENSE',
    category: EXPENSE_CATEGORIES[expense.categoryId], // Mapping ID -> Nom Excel
    description: expense.merchant,
    amountExclTax: expense.amountExclTax,
    tps: expense.tps,
    tvq: expense.tvq,
    total: expense.total,
    notes: expense.notes || ''
  };
};

/**
 * Convertit un revenu Firestore en ligne Excel
 * 
 * @param income - Revenu Firestore
 * @returns Ligne formatée pour Excel
 */
export const incomeToExcelRow = (income: Income): ExcelExportRow => {
  const date = new Date((income.date as any).seconds ? (income.date as any).seconds * 1000 : income.date);
  
  return {
    date: date.toISOString().split('T')[0],
    type: 'REVENU',
    category: INCOME_CATEGORIES[income.categoryId], // Mapping ID -> Nom Excel
    description: income.description || 'Course',
    amountExclTax: income.amount,
    tps: 0, // Les revenus n'ont pas de taxes TPS/TVQ
    tvq: 0,
    total: income.amount,
    notes: income.notes || ''
  };
};

/**
 * Génère un rapport mensuel complet (revenus + dépenses)
 * 
 * @param expenses - Données de dépenses déjà chargées
 * @param revenues - Données de revenus déjà chargées
 * @param year - Année (ex: 2025)
 * @param month - Mois (1-12)
 * @returns Array de lignes Excel triées par date
 */
export const generateMonthlyReport = (
  expenses: Expense[],
  revenues: Income[],
  year: number,
  month: number
): ExcelExportRow[] => {
  // Filtrer les données pour le mois spécifié
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const filteredExpenses = expenses.filter(e => {
    const date = new Date((e.date as any).seconds ? (e.date as any).seconds * 1000 : e.date);
    return date >= startDate && date <= endDate;
  });

  const filteredIncomes = revenues.filter(r => {
    const date = new Date((r.date as any).seconds ? (r.date as any).seconds * 1000 : r.date);
    return date >= startDate && date <= endDate;
  });

  // Convertir en lignes Excel
  const expenseRows = filteredExpenses.map(expenseToExcelRow);
  const incomeRows = filteredIncomes.map(incomeToExcelRow);

  // Combiner et trier par date
  const allRows = [...expenseRows, ...incomeRows];
  allRows.sort((a, b) => a.date.localeCompare(b.date));

  return allRows;
};

/**
 * Génère un rapport annuel complet
 * 
 * @param expenses - Données de dépenses déjà chargées
 * @param revenues - Données de revenus déjà chargées
 * @param year - Année (ex: 2025)
 * @returns Array de lignes Excel triées par date
 */
export const generateAnnualReport = (
  expenses: Expense[],
  revenues: Income[],
  year: number
): ExcelExportRow[] => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  const filteredExpenses = expenses.filter(e => {
    const date = new Date((e.date as any).seconds ? (e.date as any).seconds * 1000 : e.date);
    return date >= startDate && date <= endDate;
  });

  const filteredIncomes = revenues.filter(r => {
    const date = new Date((r.date as any).seconds ? (r.date as any).seconds * 1000 : r.date);
    return date >= startDate && date <= endDate;
  });

  const expenseRows = filteredExpenses.map(expenseToExcelRow);
  const incomeRows = filteredIncomes.map(incomeToExcelRow);

  const allRows = [...expenseRows, ...incomeRows];
  allRows.sort((a, b) => a.date.localeCompare(b.date));

  return allRows;
};

/**
 * Génère un rapport personnalisé pour une période donnée
 * 
 * @param expenses - Données de dépenses déjà chargées
 * @param revenues - Données de revenus déjà chargées
 * @param startDate - Date de début
 * @param endDate - Date de fin
 * @returns Array de lignes Excel triées par date
 */
export const generateCustomReport = (
  expenses: Expense[],
  revenues: Income[],
  startDate: Date,
  endDate: Date
): ExcelExportRow[] => {
  const filteredExpenses = expenses.filter(e => {
    const date = new Date((e.date as any).seconds ? (e.date as any).seconds * 1000 : e.date);
    return date >= startDate && date <= endDate;
  });

  const filteredIncomes = revenues.filter(r => {
    const date = new Date((r.date as any).seconds ? (r.date as any).seconds * 1000 : r.date);
    return date >= startDate && date <= endDate;
  });

  const expenseRows = filteredExpenses.map(expenseToExcelRow);
  const incomeRows = filteredIncomes.map(incomeToExcelRow);

  const allRows = [...expenseRows, ...incomeRows];
  allRows.sort((a, b) => a.date.localeCompare(b.date));

  return allRows;
};

/**
 * Formate les données pour export CSV (compatible Excel)
 * 
 * @param rows - Lignes de données
 * @param locale - Langue ('fr' ou 'en')
 * @returns String CSV avec en-têtes
 */
export const formatAsCSV = (rows: ExcelExportRow[], locale: 'fr' | 'en' = 'fr'): string => {
  const headers = locale === 'fr' 
    ? ['Date', 'Type', 'Catégorie', 'Description', 'Montant HT', 'TPS', 'TVQ', 'Total', 'Paiement', 'Notes', 'Reçu']
    : ['Date', 'Type', 'Category', 'Description', 'Amount Excl. Tax', 'GST', 'QST', 'Total', 'Payment', 'Notes', 'Receipt'];

  const csvRows = [headers.join(',')];

  rows.forEach(row => {
    const values = [
      row.date,
      row.type,
      row.category,
      `"${row.description.replace(/"/g, '""')}"`, // Échapper les guillemets
      (row.amountExclTax || 0).toFixed(2),
      (row.tps || 0).toFixed(2),
      (row.tvq || 0).toFixed(2),
      row.total.toFixed(2),
      '',
      `"${(row.notes || '').replace(/"/g, '""')}"`,
      ''
    ];
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
};

/**
 * Génère un résumé comptable pour une période
 * 
 * @param rows - Lignes de données
 * @returns Résumé avec totaux par catégorie
 */
export const generateSummary = (rows: ExcelExportRow[]) => {
  const summary = {
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    expensesByCategory: {} as Record<string, number>,
    incomesByCategory: {} as Record<string, number>,
    tpsPaid: 0,
    tvqPaid: 0
  };

  rows.forEach(row => {
    if (row.type === 'REVENU') {
      summary.totalIncome += row.total;
      if (!summary.incomesByCategory[row.category]) {
        summary.incomesByCategory[row.category] = 0;
      }
      summary.incomesByCategory[row.category] += row.total;
    } else if (row.type === 'DÉPENSE') {
      summary.totalExpenses += row.total;
      summary.tpsPaid += row.tps;
      summary.tvqPaid += row.tvq;
      if (!summary.expensesByCategory[row.category]) {
        summary.expensesByCategory[row.category] = 0;
      }
      summary.expensesByCategory[row.category] += row.total;
    }
  });

  summary.netProfit = summary.totalIncome - summary.totalExpenses;

  return summary;
};

/**
 * Génère un rapport Excel formaté avec résumé
 * 
 * @param expenses - Données de dépenses déjà chargées
 * @param revenues - Données de revenus déjà chargées
 * @param year - Année
 * @param month - Mois (optionnel, si absent = rapport annuel)
 * @param locale - Langue
 * @returns String CSV avec résumé en en-tête
 */
export const generateFullReport = (
  expenses: Expense[],
  revenues: Income[],
  year: number,
  month?: number,
  locale: 'fr' | 'en' = 'fr'
): string => {
  const rows = month 
    ? generateMonthlyReport(expenses, revenues, year, month)
    : generateAnnualReport(expenses, revenues, year);

  const summary = generateSummary(rows);

  const periodLabel = month
    ? locale === 'fr' ? `${month}/${year}` : `${month}/${year}`
    : year.toString();

  const summaryLines = locale === 'fr' ? [
    `RAPPORT COMPTABLE - ${periodLabel}`,
    '',
    `Total Revenus:,${summary.totalIncome.toFixed(2)} $`,
    `Total Dépenses:,${summary.totalExpenses.toFixed(2)} $`,
    `Profit Net:,${summary.netProfit.toFixed(2)} $`,
    '',
    `TPS Payée:,${summary.tpsPaid.toFixed(2)} $`,
    `TVQ Payée:,${summary.tvqPaid.toFixed(2)} $`,
    '',
    'DÉTAILS PAR CATÉGORIE - REVENUS:',
    ...Object.entries(summary.incomesByCategory).map(([cat, total]) => `${cat}:,${total.toFixed(2)} $`),
    '',
    'DÉTAILS PAR CATÉGORIE - DÉPENSES:',
    ...Object.entries(summary.expensesByCategory).map(([cat, total]) => `${cat}:,${total.toFixed(2)} $`),
    '',
    ''
  ] : [
    `ACCOUNTING REPORT - ${periodLabel}`,
    '',
    `Total Income:,${summary.totalIncome.toFixed(2)} $`,
    `Total Expenses:,${summary.totalExpenses.toFixed(2)} $`,
    `Net Profit:,${summary.netProfit.toFixed(2)} $`,
    '',
    `GST Paid:,${summary.tpsPaid.toFixed(2)} $`,
    `QST Paid:,${summary.tvqPaid.toFixed(2)} $`,
    '',
    'BREAKDOWN BY CATEGORY - INCOME:',
    ...Object.entries(summary.incomesByCategory).map(([cat, total]) => `${cat}:,${total.toFixed(2)} $`),
    '',
    'BREAKDOWN BY CATEGORY - EXPENSES:',
    ...Object.entries(summary.expensesByCategory).map(([cat, total]) => `${cat}:,${total.toFixed(2)} $`),
    '',
    ''
  ];

  const csvData = formatAsCSV(rows, locale);

  return summaryLines.join('\n') + '\n' + csvData;
};
