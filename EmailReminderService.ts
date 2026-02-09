/**
 * Service de rappels par courriel pour les documents expirés/proches d'expirer
 * 
 * Fonctionnalités :
 * - Envoi automatique de rappels par email
 * - Détection des documents nécessitant une action
 * - Récupération email depuis profil chauffeur
 * - Support pour les 8 types de documents
 */

import { DocumentManager } from './DocumentManager';
import { ExpirationService } from './ExpirationService';
import { ProfileManager } from './ProfileManager';
import { DOCUMENT_CONFIG } from '../types/documents';

export const EmailReminderService = {
  /**
   * Envoyer un rappel par courriel pour les documents nécessitant une action
   */
  sendExpirationReminders: async (): Promise<boolean> => {
    try {
      console.log('📧 Vérification des documents nécessitant un rappel...');

      // 1. Récupérer le profil chauffeur pour obtenir l'email
      const profile = await ProfileManager.getProfile();
      if (!profile || !profile.email) {
        console.warn('⚠️ Aucun email trouvé dans le profil chauffeur');
        return false;
      }

      const email = profile.email;
      const driverName = profile.name || 'Chauffeur';

      // 2. Récupérer la liste des documents nécessitant une action
      const needsAction = await ExpirationService.getDocumentsNeedingAction();

      if (needsAction.length === 0) {
        console.log('✅ Aucun document ne nécessite de rappel');
        return true;
      }

      console.log(`📋 ${needsAction.length} document(s) nécessitent un rappel`);

      // 3. Grouper par statut pour le message
      const expired = needsAction.filter(d => d.status.status === 'expired');
      const urgent = needsAction.filter(d => d.status.status === 'urgent');
      const warning = needsAction.filter(d => d.status.status === 'warning');
      const missing = needsAction.filter(d => d.status.status === 'missing');

      // 4. Construire le contenu de l'email
      const subject = `⚠️ TaxiFlow - Rappel documents professionnels`;
      
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #FBBF24; color: #000; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .section { margin-bottom: 20px; }
            .document-item { 
              background: white; 
              padding: 15px; 
              margin: 10px 0; 
              border-left: 4px solid #EF4444; 
              border-radius: 4px;
            }
            .document-item.urgent { border-left-color: #F59E0B; }
            .document-item.warning { border-left-color: #FBBF24; }
            .document-item.missing { border-left-color: #9CA3AF; }
            .document-name { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
            .document-status { color: #666; font-size: 14px; }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              padding-top: 20px; 
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
            .cta-button {
              display: inline-block;
              background: #FBBF24;
              color: #000;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚕 TaxiFlow</h1>
              <p>Rappel - Documents Professionnels</p>
            </div>
            <div class="content">
              <p>Bonjour <strong>${driverName}</strong>,</p>
              <p>Ce message automatique vous rappelle l'état de vos documents professionnels :</p>
      `;

      // Documents expirés
      if (expired.length > 0) {
        htmlContent += `
          <div class="section">
            <h2 style="color: #EF4444;">❌ Documents EXPIRÉS (${expired.length})</h2>
            <p><strong>Action requise immédiatement !</strong></p>
        `;
        expired.forEach(item => {
          const config = DOCUMENT_CONFIG[item.type as keyof typeof DOCUMENT_CONFIG];
          htmlContent += `
            <div class="document-item">
              <div class="document-name">${config.label}</div>
              <div class="document-status">${item.status.message}</div>
              <div class="document-status" style="margin-top: 5px;">
                📌 ${config.legalReference}
              </div>
            </div>
          `;
        });
        htmlContent += `</div>`;
      }

      // Documents urgents
      if (urgent.length > 0) {
        htmlContent += `
          <div class="section">
            <h2 style="color: #F59E0B;">⚠️ Documents URGENTS (${urgent.length})</h2>
            <p>Expiration dans moins de 7 jours</p>
        `;
        urgent.forEach(item => {
          const config = DOCUMENT_CONFIG[item.type as keyof typeof DOCUMENT_CONFIG];
          htmlContent += `
            <div class="document-item urgent">
              <div class="document-name">${config.label}</div>
              <div class="document-status">${item.status.message}</div>
            </div>
          `;
        });
        htmlContent += `</div>`;
      }

      // Documents en avertissement
      if (warning.length > 0) {
        htmlContent += `
          <div class="section">
            <h2 style="color: #FBBF24;">🔔 Avertissements (${warning.length})</h2>
            <p>À renouveler prochainement</p>
        `;
        warning.forEach(item => {
          const config = DOCUMENT_CONFIG[item.type as keyof typeof DOCUMENT_CONFIG];
          htmlContent += `
            <div class="document-item warning">
              <div class="document-name">${config.label}</div>
              <div class="document-status">${item.status.message}</div>
            </div>
          `;
        });
        htmlContent += `</div>`;
      }

      // Documents manquants
      if (missing.length > 0) {
        htmlContent += `
          <div class="section">
            <h2 style="color: #9CA3AF;">📋 Documents manquants (${missing.length})</h2>
            <p>Documents non scannés</p>
        `;
        missing.forEach(item => {
          const config = DOCUMENT_CONFIG[item.type as keyof typeof DOCUMENT_CONFIG];
          htmlContent += `
            <div class="document-item missing">
              <div class="document-name">${config.label}</div>
              <div class="document-status">Document non scanné - Scanner requis</div>
            </div>
          `;
        });
        htmlContent += `</div>`;
      }

      htmlContent += `
              <div style="text-align: center;">
                <p><strong>⚖️ Rappel légal :</strong></p>
                <p style="color: #666; font-size: 14px;">
                  Selon la loi du Québec, vous devez maintenir tous vos documents à jour. 
                  Un document expiré peut entraîner des amendes ou la suspension de votre permis.
                </p>
              </div>

              <div class="footer">
                <p>Ceci est un message automatique de TaxiFlow</p>
                <p>Pour mettre à jour vos documents, ouvrez l'application TaxiFlow</p>
                <p style="margin-top: 10px;">
                  📱 TaxiFlow - Gestion professionnelle pour chauffeurs de taxi
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // 5. Envoyer l'email (via API ou service externe)
      // NOTE: L'envoi réel nécessite une intégration avec un service d'email
      // Exemples: SendGrid, AWS SES, Mailgun, etc.
      
      console.log('📧 Email de rappel préparé pour:', email);
      console.log('📋 Subject:', subject);
      console.log('✉️ Contenu HTML généré');

      // Pour l'instant, on log seulement (à remplacer par vraie intégration email)
      // Exemple avec fetch vers backend:
      /*
      const response = await fetch('https://votre-api.com/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: subject,
          html: htmlContent
        })
      });
      
      if (!response.ok) {
        throw new Error('Erreur envoi email');
      }
      */

      console.log('✅ Email de rappel préparé avec succès');
      return true;

    } catch (error) {
      console.error('❌ Erreur envoi rappels email:', error);
      return false;
    }
  },

  /**
   * Vérifier si un rappel doit être envoyé (appelé périodiquement)
   */
  checkAndSendReminders: async (): Promise<void> => {
    try {
      const needsAction = await ExpirationService.getDocumentsNeedingAction();
      
      if (needsAction.length > 0) {
        console.log(`📧 ${needsAction.length} document(s) nécessitent un rappel`);
        await EmailReminderService.sendExpirationReminders();
      } else {
        console.log('✅ Tous les documents sont à jour');
      }
    } catch (error) {
      console.error('❌ Erreur vérification rappels:', error);
    }
  }
};
