/**
 * exportExcelPro.ts
 * 
 * Service d'export Excel professionnel SAAQ-compliant
 */

import * as XLSX from 'xlsx';
import { Expense, Income } from '../types/Accounting';
import { TAX_RATES, formatCurrency } from '../config/taxes';
import { Timestamp } from 'firebase/firestore';

export type ExportPeriod = 'day' | '1month' | '3months' | '6months' | '12months' | 'custom';

export interface ExportOptions {
  period: ExportPeriod;
  customStart?: Date;
  customEnd?: Date;
  driverName?: string;
  driverLicense?: string;
}

export interface ExportData {
  expenses: Expense[];
  incomes: Income[];
}

/**
 * Obtenir la plage de dates selon la période sélectionnée
 */
export function getDateRangeForPeriod(period: ExportPeriod, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  
  switch (period) {
    case 'day':
      // Aujourd'hui uniquement
      break;
      
    case '1month':
      start.setMonth(start.getMonth() - 1);
      break;
      
    case '3months':
      start.setMonth(start.getMonth() - 3);
      break;
      
    case '6months':
      start.setMonth(start.getMonth() - 6);
      break;
      
    case '12months':
      start.setFullYear(start.getFullYear() - 1);
      break;
      
    case 'custom':
      if (customStart && customEnd) {
        return {
          start: new Date(customStart.setHours(0, 0, 0, 0)),
          end: new Date(customEnd.setHours(23, 59, 59, 999))
        };
      }
      break;
  }
  
  return { start, end };
}

/**
 * Formater une date pour l'affichage
 */
function formatDate(date: Date | Timestamp): string {
  let d: Date;
  
  if (date instanceof Timestamp) {
    d = date.toDate();
  } else if (date && typeof date === 'object' && 'seconds' in date) {
    d = new Date(date.seconds * 1000);
  } else {
    d = new Date(date);
  }
  
  return d.toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Obtenir le libellé de la catégorie de dépense
 */
function getExpenseCategoryLabel(categoryId: string): string {
  const categories: Record<string, string> = {
    'carburant': 'Carburant',
    'entretien': 'Entretien & Réparation',
    'assurance': 'Assurance',
    'permis_taxi': 'Permis & Licences',
    'repas': 'Repas',
    'stationnement': 'Stationnement',
    'peages': 'Péages',
    'location_vehicule': 'Location véhicule',
    'telephonie': 'Téléphonie',
    'nettoyage': 'Nettoyage véhicule',
    'fournitures': 'Fournitures',
    'autre': 'Autre'
  };
  
  return categories[categoryId] || categoryId;
}

/**
 * Calculer les agrégats par catégorie
 */
function calculateExpensesByCategory(expenses: Expense[]): Record<string, { total: number; percentage: number }> {
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.total, 0);
  const byCategory: Record<string, number> = {};
  
  expenses.forEach(exp => {
    const category = exp.categoryId || 'autre';
    byCategory[category] = (byCategory[category] || 0) + exp.total;
  });
  
  const result: Record<string, { total: number; percentage: number }> = {};
  Object.entries(byCategory).forEach(([category, total]) => {
    result[category] = {
      total,
      percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0
    };
  });
  
  return result;
}

/**
 * Générer le fichier Excel professionnel
 */
export function generateProExcel(data: ExportData, options: ExportOptions): string {
  const { expenses, incomes } = data;
  const { period, customStart, customEnd, driverName, driverLicense } = options;
  
  const dateRange = getDateRangeForPeriod(period, customStart, customEnd);
  
  // Calculer les totaux
  const totalExpensesHT = expenses.reduce((sum, exp) => sum + exp.amountExclTax, 0);
  const totalTPS = expenses.reduce((sum, exp) => sum + exp.tps, 0);
  const totalTVQ = expenses.reduce((sum, exp) => sum + exp.tvq, 0);
  const totalExpensesTTC = expenses.reduce((sum, exp) => sum + exp.total, 0);
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const netBalance = totalIncome - totalExpensesTTC;
  
  // Agrégats par catégorie
  const expensesByCategory = calculateExpensesByCategory(expenses);
  
  // === FEUILLE 1: JOURNAL DÉTAILLÉ ===
  const journalData: any[][] = [];
  
  // HEADER (lignes 1-4)
  journalData.push(['RAPPORT COMPTABLE TAXIFLOW']);
  journalData.push([`Chauffeur: ${driverName || 'N/A'} | Permis: ${driverLicense || 'N/A'}`]);
  journalData.push([`Période: ${formatDate(dateRange.start)} au ${formatDate(dateRange.end)}`]);
  journalData.push(['Approuvé pour SAAQ / Comptable']);
  journalData.push([]); // Ligne vide
  
  // COLONNES (ligne 6)
  journalData.push([
    'Date',
    'Type',
    'Catégorie',
    'Fournisseur/Description',
    'Montant HT',
    `TPS ${(TAX_RATES.TPS * 100).toFixed(2)}%`,
    `TVQ ${(TAX_RATES.TVQ * 100).toFixed(3)}%`,
    'Total TTC',
    '% du Total'
  ]);
  
  // DÉPENSES
  expenses.forEach(exp => {
    const percentageOfTotal = totalExpensesTTC > 0 ? (exp.total / totalExpensesTTC) * 100 : 0;
    journalData.push([
      formatDate(exp.date),
      'Dépense',
      getExpenseCategoryLabel(exp.categoryId),
      exp.merchant || 'N/A',
      parseFloat(exp.amountExclTax.toFixed(2)),
      parseFloat(exp.tps.toFixed(2)),
      parseFloat(exp.tvq.toFixed(2)),
      parseFloat(exp.total.toFixed(2)),
      parseFloat(percentageOfTotal.toFixed(2)) + '%'
    ]);
  });
  
  journalData.push([]); // Ligne vide
  
  // REVENUS
  incomes.forEach(inc => {
    const percentageOfTotal = totalIncome > 0 ? (inc.amount / totalIncome) * 100 : 0;
    journalData.push([
      formatDate(inc.date),
      'Revenu',
      'Course taxi',
      inc.description || 'Course',
      0,
      0,
      0,
      parseFloat(inc.amount.toFixed(2)),
      parseFloat(percentageOfTotal.toFixed(2)) + '%'
    ]);
  });
  
  journalData.push([]); // Ligne vide
  journalData.push([]); // Ligne vide
  
  // TOTAUX
  journalData.push(['TOTAUX DÉPENSES', '', '', '', 
    parseFloat(totalExpensesHT.toFixed(2)),
    parseFloat(totalTPS.toFixed(2)),
    parseFloat(totalTVQ.toFixed(2)),
    parseFloat(totalExpensesTTC.toFixed(2)),
    '100%'
  ]);
  
  journalData.push(['TOTAL REVENUS', '', '', '', '', '', '', parseFloat(totalIncome.toFixed(2)), '']);
  journalData.push(['SOLDE NET', '', '', '', '', '', '', parseFloat(netBalance.toFixed(2)), '']);
  
  journalData.push([]); // Ligne vide
  
  // TPS/TVQ DÉDUCTIBLES
  journalData.push(['TPS DÉDUCTIBLE', '', '', '', '', parseFloat(totalTPS.toFixed(2)), '', '', '']);
  journalData.push(['TVQ DÉDUCTIBLE', '', '', '', '', '', parseFloat(totalTVQ.toFixed(2)), '', '']);
  
  journalData.push([]); // Ligne vide
  journalData.push([]); // Ligne vide
  
  // FOOTER
  journalData.push([`Généré par TaxiFlow le ${new Date().toLocaleDateString('fr-CA')} à ${new Date().toLocaleTimeString('fr-CA')}`]);
  journalData.push(['Signature du chauffeur: _______________________']);
  
  // === FEUILLE 2: SYNTHÈSE PAR CATÉGORIE ===
  const syntheseData: any[][] = [];
  
  syntheseData.push(['SYNTHÈSE PAR CATÉGORIE']);
  syntheseData.push([`Période: ${formatDate(dateRange.start)} au ${formatDate(dateRange.end)}`]);
  syntheseData.push([]);
  syntheseData.push(['Catégorie', 'Total', '% du Total']);
  
  Object.entries(expensesByCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([category, data]) => {
      syntheseData.push([
        getExpenseCategoryLabel(category),
        parseFloat(data.total.toFixed(2)),
        parseFloat(data.percentage.toFixed(2)) + '%'
      ]);
    });
  
  syntheseData.push([]);
  syntheseData.push(['TOTAL', parseFloat(totalExpensesTTC.toFixed(2)), '100%']);
  
  // === FEUILLE 3: RÉSUMÉ FISCAL ===
  const fiscalData: any[][] = [];
  
  fiscalData.push(['RÉSUMÉ FISCAL - SAAQ']);
  fiscalData.push([`Période: ${formatDate(dateRange.start)} au ${formatDate(dateRange.end)}`]);
  fiscalData.push([]);
  fiscalData.push(['Description', 'Montant']);
  fiscalData.push([]);
  fiscalData.push(['REVENUS']);
  fiscalData.push(['Total des courses', parseFloat(totalIncome.toFixed(2))]);
  fiscalData.push([]);
  fiscalData.push(['DÉPENSES']);
  fiscalData.push(['Total HT', parseFloat(totalExpensesHT.toFixed(2))]);
  fiscalData.push([`TPS (${(TAX_RATES.TPS * 100).toFixed(2)}%)`, parseFloat(totalTPS.toFixed(2))]);
  fiscalData.push([`TVQ (${(TAX_RATES.TVQ * 100).toFixed(3)}%)`, parseFloat(totalTVQ.toFixed(2))]);
  fiscalData.push(['Total TTC', parseFloat(totalExpensesTTC.toFixed(2))]);
  fiscalData.push([]);
  fiscalData.push(['TAXES DÉDUCTIBLES']);
  fiscalData.push(['TPS à récupérer', parseFloat(totalTPS.toFixed(2))]);
  fiscalData.push(['TVQ à récupérer', parseFloat(totalTVQ.toFixed(2))]);
  fiscalData.push(['Total taxes déductibles', parseFloat((totalTPS + totalTVQ).toFixed(2))]);
  fiscalData.push([]);
  fiscalData.push(['RÉSULTAT']);
  fiscalData.push(['Solde net (avant taxes)', parseFloat(netBalance.toFixed(2))]);
  fiscalData.push(['Taxes à récupérer', parseFloat((totalTPS + totalTVQ).toFixed(2))]);
  fiscalData.push(['Résultat après déductions', parseFloat((netBalance + totalTPS + totalTVQ).toFixed(2))]);
  
  // Créer le workbook
  const wb = XLSX.utils.book_new();
  
  const wsJournal = XLSX.utils.aoa_to_sheet(journalData);
  const wsSynthese = XLSX.utils.aoa_to_sheet(syntheseData);
  const wsFiscal = XLSX.utils.aoa_to_sheet(fiscalData);
  
  XLSX.utils.book_append_sheet(wb, wsJournal, 'Journal Détaillé');
  XLSX.utils.book_append_sheet(wb, wsSynthese, 'Synthèse Catégories');
  XLSX.utils.book_append_sheet(wb, wsFiscal, 'Résumé Fiscal');
  
  // Générer en base64
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  
  return wbout;
}
