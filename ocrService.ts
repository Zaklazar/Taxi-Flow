import { API_URL } from '../config/api';

interface OCRResult {
  totalTTC: number;
  tps: number;
  tvq: number;
  date: string;
  fournisseur: string;
  categorie: string;
}

export const analyzeReceipt = async (imageUri: string): Promise<OCRResult> => {
  try {
    // Debug: Vérifier que l'URI de l'image est valide
    console.log('URI de l\'image - Code: OCR001');
    
    // Création du formulaire
    const formData = new FormData();
    
    // IMPORTANT: React Native a besoin de ces 3 champs (uri, name, type)
    formData.append('file', {
      uri: imageUri,       // L'adresse de l'image compressée
      name: 'upload.jpg',  // Un nom arbitraire
      type: 'image/jpeg'   // Le type mime
    } as any);             // 'as any' pour éviter les erreurs de typage TS strict

    // Créer un AbortController pour le timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes

    console.log('🌐 Envoi à l\'API - Code: OCR002');

    // Appeler l'endpoint OCR du backend avec timeout
    const response = await fetch(`${API_URL}/analyze-receipt`, {
      method: 'POST',
      body: formData,
      // NE PAS METTRE de header 'Content-Type': 'multipart/form-data' manuellement !
      // Laisse le fetch le générer automatiquement avec le 'boundary'.
      signal: controller.signal,
    });

    // Nettoyer le timeout
    clearTimeout(timeoutId);

    console.log('📡 Réponse HTTP reçue - Code: OCR003 - Status:', response.status);

    if (!response.ok) {
      console.error('❌ Erreur HTTP:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Détail erreur:', errorText);
      throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Résultat OCR brut:', result);
    
    // Valider et nettoyer les données
    const ocrResult: OCRResult = {
      totalTTC: parseFloat(result.montant_total) || 0,
      tps: parseFloat(result.tps) || 0,
      tvq: parseFloat(result.tvq) || 0,
      date: result.date || new Date().toISOString().split('T')[0],
      fournisseur: result.marchand || 'Fournisseur inconnu',
      categorie: result.categorie || 'Autre',
    };

    // Logique de secours : si on a le total mais pas les taxes
    if (ocrResult.totalTTC > 0 && (ocrResult.tps === 0 || ocrResult.tvq === 0)) {
      const tpsRate = 0.05;
      const tvqRate = 0.09975;
      const totalRate = 1 + tpsRate + tvqRate;
      
      const ht = ocrResult.totalTTC / totalRate;
      ocrResult.tps = parseFloat((ht * tpsRate).toFixed(2));
      ocrResult.tvq = parseFloat((ht * tvqRate).toFixed(2));
    }

    console.log('✅ Résultat OCR traité - Code: OCR004');
    return ocrResult;
  } catch (error: any) {
    console.error('❌ Erreur OCR complète - Code: OCR005');
    
    // Gérer les erreurs spécifiques
    if (error.name === 'AbortError') {
      throw new Error('Timeout: L\'analyse OCR a pris trop de temps (30 secondes)');
    } else if (error.message && error.message.includes('Network request failed')) {
      throw new Error('Erreur réseau: Vérifiez votre connexion internet et que le serveur est accessible à ' + API_URL);
    } else {
      throw error;
    }
  }
};
