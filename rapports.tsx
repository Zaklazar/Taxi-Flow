import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../src/hooks/useAuth';
import { getExpenses } from '../src/services/ExpenseService';
import { getIncomes } from '../src/services/IncomeService';
import type { Expense, Income } from '../src/types/Accounting';
import { Timestamp } from 'firebase/firestore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type ReportPeriod = 'jour' | 'mois' | '3mois' | 'annee';

interface PeriodSummary {
  totalRevenues: number;
  totalExpenses: number;
  netBalance: number;
  tpsTotal: number;
  tvqTotal: number;
  expensesByCategory: Record<string, number>;
}

export default function RapportsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('mois');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenues, setRevenues] = useState<Income[]>([]);

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod, user]);

  /**
   * Obtenir la plage de dates selon la période
   */
  const getDateRange = (period: ReportPeriod) => {
    const now = new Date();
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case 'jour':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'mois':
        startDate.setDate(1); // Premier jour du mois
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '3mois':
        startDate.setMonth(now.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'annee':
        startDate.setMonth(0); // Janvier
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    return { startDate, endDate };
  };

  /**
   * Charger les données du rapport
   */
  const loadReportData = async () => {
    if (!user) {
      console.warn('⚠️ Utilisateur non connecté');
      return;
    }

    try {
      setLoading(true);

      const { startDate, endDate } = getDateRange(selectedPeriod);

      console.log(`📊 Chargement rapport ${selectedPeriod}:`, {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });

      // Charger dépenses ET revenus en parallèle
      const [expensesData, revenuesData] = await Promise.all([
        getExpenses(
          user.uid,
          { startDate, endDate },
          { field: 'date', order: 'desc' }
        ),
        getIncomes(
          user.uid,
          { startDate, endDate },
          { field: 'date', order: 'desc' }
        )
      ]);

      setExpenses(expensesData);
      setRevenues(revenuesData);

      // Calculer totaux
      const totalRevenues = revenuesData.reduce((sum, rev) => sum + rev.amount, 0);
      const totalExpenses = expensesData.reduce((sum, exp) => sum + exp.total, 0);
      const tpsTotal = expensesData.reduce((sum, exp) => sum + (exp.tps || 0), 0);
      const tvqTotal = expensesData.reduce((sum, exp) => sum + (exp.tvq || 0), 0);

      // Grouper dépenses par catégorie
      const expensesByCategory: Record<string, number> = {};
      expensesData.forEach(exp => {
        const category = exp.categoryId || 'OTHER';
        expensesByCategory[category] = (expensesByCategory[category] || 0) + exp.total;
      });

      setSummary({
        totalRevenues,
        totalExpenses,
        netBalance: totalRevenues - totalExpenses,
        tpsTotal,
        tvqTotal,
        expensesByCategory
      });

      console.log(`✅ Rapport chargé: ${expensesData.length} dépenses, ${revenuesData.length} revenus`);

    } catch (error) {
      console.error('❌ Erreur chargement rapport:', error);
      Alert.alert(t('common.error'), 'Impossible de charger le rapport');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Générer le nom de période pour affichage
   */
  const getPeriodLabel = () => {
    const { startDate, endDate } = getDateRange(selectedPeriod);
    const formatDate = (date: Date) => date.toLocaleDateString('fr-CA');

    switch (selectedPeriod) {
      case 'jour':
        return formatDate(startDate);
      case 'mois':
        return startDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      case '3mois':
        return `${formatDate(startDate)} au ${formatDate(endDate)}`;
      case 'annee':
        return startDate.getFullYear().toString();
      default:
        return '';
    }
  };

  /**
   * Générer le HTML du rapport PDF
   */
  const generateReportHTML = () => {
    if (!summary || !user) return '';

    const periodLabel = getPeriodLabel();
    const userName = user.displayName || user.email || 'Chauffeur';

    // Catégories détaillées
    const categoryRows = Object.entries(summary.expensesByCategory)
      .map(([category, amount]) => {
        const categoryName = t(`expenseCategories.${category}`) || category;
        return `
          <tr>
            <td>${categoryName}</td>
            <td style="text-align: right; font-weight: bold;">${amount.toFixed(2)} $</td>
          </tr>
        `;
      })
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rapport Comptable - ${periodLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #1a237e;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #1a237e;
      font-size: 28px;
      margin-bottom: 5px;
    }
    .header p {
      color: #666;
      font-size: 14px;
    }
    .info-box {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .info-label {
      font-weight: bold;
      color: #555;
    }
    .info-value {
      color: #222;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
      margin: 20px 0;
    }
    .summary-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-card.positive {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
      color: white;
    }
    .summary-card.negative {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
    }
    .summary-card.neutral {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
    }
    .summary-title {
      font-size: 12px;
      text-transform: uppercase;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    .summary-amount {
      font-size: 24px;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin: 20px 0;
    }
    thead {
      background: #1a237e;
      color: white;
    }
    th {
      padding: 15px;
      text-align: left;
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
    }
    td {
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #ddd;
      color: #666;
      font-size: 11px;
    }
    .footer strong {
      color: #1a237e;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 RAPPORT COMPTABLE</h1>
    <p>Période: ${periodLabel}</p>
  </div>

  <div class="info-box">
    <div class="info-row">
      <span class="info-label">Chauffeur:</span>
      <span class="info-value">${userName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date de génération:</span>
      <span class="info-value">${new Date().toLocaleString('fr-FR')}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Période sélectionnée:</span>
      <span class="info-value">${selectedPeriod === 'jour' ? 'Journée' : selectedPeriod === 'mois' ? 'Mois' : selectedPeriod === '3mois' ? '3 Mois' : 'Année'}</span>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card positive">
      <div class="summary-title">💰 Revenus</div>
      <div class="summary-amount">${summary.totalRevenues.toFixed(2)} $</div>
    </div>
    <div class="summary-card negative">
      <div class="summary-title">💸 Dépenses</div>
      <div class="summary-amount">${summary.totalExpenses.toFixed(2)} $</div>
    </div>
    <div class="summary-card neutral">
      <div class="summary-title">📈 Solde Net</div>
      <div class="summary-amount">${summary.netBalance.toFixed(2)} $</div>
    </div>
  </div>

  <h2 style="margin-top: 30px; color: #1a237e; font-size: 18px;">📋 Dépenses par Catégorie</h2>
  <table>
    <thead>
      <tr>
        <th>Catégorie</th>
        <th style="text-align: right;">Montant</th>
      </tr>
    </thead>
    <tbody>
      ${categoryRows}
      <tr style="background: #f8f9fa; font-weight: bold;">
        <td>TOTAL TPS à payer (5%)</td>
        <td style="text-align: right;">${summary.tpsTotal.toFixed(2)} $</td>
      </tr>
      <tr style="background: #f8f9fa; font-weight: bold;">
        <td>TOTAL TVQ à payer (9.975%)</td>
        <td style="text-align: right;">${summary.tvqTotal.toFixed(2)} $</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>Document généré automatiquement par <strong>TaxiFlow Pro</strong></p>
    <p>Rapport officiel pour usage comptable et déclaration fiscale</p>
  </div>
</body>
</html>
    `;
  };

  /**
   * Exporter le rapport en PDF
   */
  const handleExportPDF = async () => {
    if (!summary) {
      Alert.alert(t('common.error'), 'Aucune donnée à exporter');
      return;
    }

    try {
      setLoading(true);
      console.log('📄 Génération PDF...');

      const html = generateReportHTML();
      
      // Générer le PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      console.log('✅ PDF généré:', uri);

      // Partager le PDF
      if (await Sharing.isAvailableAsync()) {
        const periodLabel = getPeriodLabel().replace(/\//g, '-');
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Rapport_${periodLabel}.pdf`
        });
        console.log('✅ PDF partagé');
      } else {
        Alert.alert(
          '✅ PDF généré',
          `Le rapport a été généré: ${uri}`,
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('❌ Erreur export PDF:', error);
      Alert.alert(t('common.error'), t('errors.pdfGenerationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>📊 {t('accounting.detailedReports')}</Text>
        </View>

        {/* Sélection période */}
        <View style={styles.periodSelector}>
          {(['jour', 'mois', '3mois', 'annee'] as ReportPeriod[]).map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodText,
                selectedPeriod === period && styles.periodTextActive
              ]}>
                {period === 'jour' ? 'Jour' : period === 'mois' ? 'Mois' : period === '3mois' ? '3 Mois' : 'Année'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Période affichée */}
        <View style={styles.periodLabel}>
          <Text style={styles.periodLabelText}>{getPeriodLabel()}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Chargement du rapport...</Text>
          </View>
        ) : summary ? (
          <>
            {/* Résumé financier */}
            <View style={styles.summaryContainer}>
              <View style={[styles.summaryCard, styles.revenueCard]}>
                <Text style={styles.summaryLabel}>💰 {t('accounting.revenues')}</Text>
                <Text style={styles.summaryValue}>{summary.totalRevenues.toFixed(2)} $</Text>
              </View>

              <View style={[styles.summaryCard, styles.expenseCard]}>
                <Text style={styles.summaryLabel}>💸 {t('accounting.expenses')}</Text>
                <Text style={styles.summaryValue}>{summary.totalExpenses.toFixed(2)} $</Text>
              </View>

              <View style={[styles.summaryCard, styles.netCard]}>
                <Text style={styles.summaryLabel}>📈 NET</Text>
                <Text style={[
                  styles.summaryValue,
                  summary.netBalance < 0 && { color: '#ff4444' }
                ]}>
                  {summary.netBalance.toFixed(2)} $
                </Text>
              </View>
            </View>

            {/* Taxes */}
            <View style={styles.taxContainer}>
              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>TPS à payer (5%)</Text>
                <Text style={styles.taxValue}>{summary.tpsTotal.toFixed(2)} $</Text>
              </View>
              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>TVQ à payer (9.975%)</Text>
                <Text style={styles.taxValue}>{summary.tvqTotal.toFixed(2)} $</Text>
              </View>
            </View>

            {/* Dépenses par catégorie */}
            {Object.keys(summary.expensesByCategory).length > 0 && (
              <View style={styles.categoryContainer}>
                <Text style={styles.sectionTitle}>📋 Dépenses par Catégorie</Text>
                {Object.entries(summary.expensesByCategory).map(([category, amount]) => (
                  <View key={category} style={styles.categoryRow}>
                    <Text style={styles.categoryName}>
                      {t(`expenseCategories.${category}`) || category}
                    </Text>
                    <Text style={styles.categoryAmount}>{amount.toFixed(2)} $</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Bouton export PDF */}
            <TouchableOpacity style={styles.exportButton} onPress={handleExportPDF}>
              <Text style={styles.exportButtonText}>📄 Générer Rapport PDF</Text>
            </TouchableOpacity>

            {/* Statistiques */}
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Nombre de revenus:</Text>
                <Text style={styles.statValue}>{revenues.length}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Nombre de dépenses:</Text>
                <Text style={styles.statValue}>{expenses.length}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune donnée pour cette période</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollView: {
    flex: 1,
    paddingTop: 50
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  backButton: {
    marginBottom: 10
  },
  backText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center'
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    marginBottom: 15
  },
  periodButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  periodButtonActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700'
  },
  periodText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600'
  },
  periodTextActive: {
    color: '#0f0c29'
  },
  periodLabel: {
    alignItems: 'center',
    marginBottom: 20
  },
  periodLabelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700'
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 50
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14
  },
  summaryContainer: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  revenueCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4caf50'
  },
  expenseCard: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderColor: '#f44336'
  },
  netCard: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderColor: '#2196f3'
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.9
  },
  summaryValue: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: 'bold'
  },
  taxContainer: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)'
  },
  taxLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  taxValue: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold'
  },
  categoryContainer: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  categoryName: {
    color: '#fff',
    fontSize: 14
  },
  categoryAmount: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold'
  },
  exportButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFD700',
    borderRadius: 15,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8
  },
  exportButtonText: {
    color: '#0f0c29',
    fontSize: 18,
    fontWeight: 'bold'
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  statLabel: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8
  },
  statValue: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold'
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.6
  }
});
