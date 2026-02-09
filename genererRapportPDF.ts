import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Depense, Recette } from '../lib/hooks/useDepenses';
import { formaterMois } from '../lib/hooks/useDepenses';

interface RapportData {
  mois: string;
  depenses: Depense[];
  recettes: Recette[];
  totalDepenses: number;
  totalRecettes: number;
  net: number;
}

export async function genererRapportPDF(data: RapportData): Promise<string> {
  const { mois, depenses, recettes, totalDepenses, totalRecettes, net } = data;
  
  // Créer le contenu HTML du PDF
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      color: #333;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background-color: #3498db;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: bold;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .total-row {
      background-color: #ecf0f1;
      font-weight: bold;
      font-size: 16px;
    }
    .positive {
      color: #27ae60;
    }
    .negative {
      color: #e74c3c;
    }
    .summary {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 16px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #bdc3c7;
      text-align: center;
      color: #7f8c8d;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>RAPPORT COMPTABILITÉ - ${formaterMois(mois)}</h1>
  
  <div class="summary">
    <div class="summary-row">
      <span>Total Revenus:</span>
      <span class="positive">$${totalRecettes.toFixed(2)}</span>
    </div>
    <div class="summary-row">
      <span>Total Dépenses:</span>
      <span class="negative">$${totalDepenses.toFixed(2)}</span>
    </div>
    <div class="summary-row" style="font-size: 18px; font-weight: bold; margin-top: 10px; padding-top: 15px; border-top: 2px solid #bdc3c7;">
      <span>NET:</span>
      <span class="${net >= 0 ? 'positive' : 'negative'}">$${net.toFixed(2)}</span>
    </div>
  </div>

  <h2>DÉPENSES (${depenses.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>HT</th>
        <th>TPS (5%)</th>
        <th>TVQ (9.975%)</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${depenses.map(d => `
        <tr>
          <td>${new Date(d.date).toLocaleDateString('fr-CA')}</td>
          <td>${d.description}</td>
          <td>$${d.ht.toFixed(2)}</td>
          <td>$${d.tps.toFixed(2)}</td>
          <td>$${d.tvq.toFixed(2)}</td>
          <td>$${d.total.toFixed(2)}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="2"><strong>TOTAL</strong></td>
        <td><strong>$${depenses.reduce((sum, d) => sum + d.ht, 0).toFixed(2)}</strong></td>
        <td><strong>$${depenses.reduce((sum, d) => sum + d.tps, 0).toFixed(2)}</strong></td>
        <td><strong>$${depenses.reduce((sum, d) => sum + d.tvq, 0).toFixed(2)}</strong></td>
        <td><strong>$${totalDepenses.toFixed(2)}</strong></td>
      </tr>
    </tbody>
  </table>

  ${recettes.length > 0 ? `
    <h2>REVENUS (${recettes.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Montant</th>
        </tr>
      </thead>
      <tbody>
        ${recettes.map(r => `
          <tr>
            <td>${new Date(r.date).toLocaleDateString('fr-CA')}</td>
            <td>${r.description}</td>
            <td>$${r.montant.toFixed(2)}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="2"><strong>TOTAL</strong></td>
          <td><strong>$${totalRecettes.toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>
  ` : ''}

  <div class="footer">
    <p>Généré le ${new Date().toLocaleString('fr-CA')}</p>
    <p>Taxi Québec - Rapport Comptable</p>
  </div>
</body>
</html>
  `;

  // Créer le fichier HTML temporaire
  const htmlUri = `${FileSystem.documentDirectory}rapport-${mois}.html`;
  await FileSystem.writeAsStringAsync(htmlUri, htmlContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Pour React Native, on utilise HTML car react-native-pdf-lib n'est pas optimal
  // L'utilisateur pourra convertir en PDF via partage ou imprimer
  // Alternative: utiliser expo-print pour générer un vrai PDF
  
  return htmlUri;
}

export async function partagerRapport(uri: string, mois: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  
  if (!isAvailable) {
    throw new Error('Le partage n\'est pas disponible sur cet appareil');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'text/html',
    dialogTitle: `Rapport Comptable - ${formaterMois(mois)}`,
    UTI: 'public.html',
  });
}
