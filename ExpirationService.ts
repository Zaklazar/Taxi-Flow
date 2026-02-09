import { DocumentData, ExpirationStatus, DocumentSummary, DOCUMENT_CONFIG, DateHelpers } from '../types/documents';
import { DocumentManager } from './DocumentManager';

export const ExpirationService = {
  
  // ========================================
  // ANALYSE D'EXPIRATION
  // ========================================

  // Analyser le statut d'expiration d'un document
  getExpirationStatus: (document: DocumentData | null): ExpirationStatus => {
    // Document manquant
    if (!document || !document.expirationDate) {
      return {
        status: 'missing',
        daysRemaining: 0,
        color: '#6B7280',
        icon: '⚪',
        message: 'Non scanné'
      };
    }

    const daysRemaining = DateHelpers.daysUntil(document.expirationDate);
    const config = DOCUMENT_CONFIG[document.type];

    // Document expiré
    if (daysRemaining < 0) {
      return {
        status: 'expired',
        daysRemaining,
        color: '#EF4444',
        icon: '🔴',
        message: `Expiré depuis ${Math.abs(daysRemaining)} jours`
      };
    }

    // Urgent (< 7 jours ou selon config)
    if (daysRemaining <= (config?.urgentDays || 7)) {
      return {
        status: 'urgent',
        daysRemaining,
        color: '#F59E0B',
        icon: '🔴',
        message: `URGENT: ${daysRemaining} jours restants`
      };
    }

    // Attention (< 30 jours ou selon config)
    if (daysRemaining <= (config?.warningDays || 30)) {
      return {
        status: 'warning',
        daysRemaining,
        color: '#FBBF24',
        icon: '🟡',
        message: `⏰ ${daysRemaining} jours restants`
      };
    }

    // Valide
    return {
      status: 'valid',
      daysRemaining,
      color: '#22C55E',
      icon: '🟢',
      message: `✅ Valide (exp. ${DateHelpers.formatDate(document.expirationDate)})`
    };
  },

  // ========================================
  // RÉSUMÉ GLOBAL
  // ========================================

  // Générer un résumé de tous les documents
  getDocumentsSummary: async (userId?: string): Promise<DocumentSummary> => {
    try {
      const documents = await DocumentManager.getDocuments(userId);
      const requiredTypes = [
        'permis_taxi', 
        'pocket_saaq', 
        'assurance',
        'certificat_immatriculation',
        'attestation_vehicule',
        'inspection_mecanique', 
        'inspection_taximetre',
        'contrat_location'
      ];
      
      let valid = 0;
      let warnings = 0;
      let urgent = 0;
      let expired = 0;
      let missing = 0;

      // Analyser chaque document requis
      for (const type of requiredTypes) {
        const doc = documents.find(d => d.type === type) || null;
        const status = ExpirationService.getExpirationStatus(doc);

        switch (status.status) {
          case 'valid':
            valid++;
            break;
          case 'warning':
            warnings++;
            break;
          case 'urgent':
            urgent++;
            break;
          case 'expired':
            expired++;
            break;
          case 'missing':
            missing++;
            break;
        }
      }

      // Déterminer le statut global
      let overallStatus: 'ok' | 'attention' | 'critical' = 'ok';
      if (expired > 0 || urgent > 0 || missing > 0) {
        overallStatus = 'critical';
      } else if (warnings > 0) {
        overallStatus = 'attention';
      }

      return {
        total: requiredTypes.length,
        scanned: requiredTypes.length - missing,
        valid,
        warnings,
        urgent,
        expired,
        missing,
        overallStatus
      };
    } catch (error) {
      console.error('❌ Erreur génération résumé documents:', error);
      return {
        total: 8,
        scanned: 0,
        valid: 0,
        warnings: 0,
        urgent: 0,
        expired: 0,
        missing: 8,
        overallStatus: 'critical'
      };
    }
  },

  // ========================================
  // ALERTES ET RAPPELS
  // ========================================

  // Obtenir la liste des documents nécessitant une action
  getDocumentsNeedingAction: async (userId?: string): Promise<{
    document: DocumentData | null;
    status: ExpirationStatus;
    type: string;
  }[]> => {
    try {
      const documents = await DocumentManager.getDocuments(userId);
      const requiredTypes = [
        'permis_taxi', 
        'pocket_saaq', 
        'assurance',
        'certificat_immatriculation',
        'attestation_vehicule',
        'inspection_mecanique', 
        'inspection_taximetre',
        'contrat_location'
      ];
      
      const needsAction: {
        document: DocumentData | null;
        status: ExpirationStatus;
        type: string;
      }[] = [];

      for (const type of requiredTypes) {
        const doc = documents.find(d => d.type === type) || null;
        const status = ExpirationService.getExpirationStatus(doc);

        // Ajouter si manquant, expiré, urgent ou en avertissement
        if (['missing', 'expired', 'urgent', 'warning'].includes(status.status)) {
          needsAction.push({
            document: doc,
            status,
            type
          });
        }
      }

      // Trier par priorité (expirés > urgents > avertissements > manquants)
      needsAction.sort((a, b) => {
        const priorityOrder = { 'expired': 0, 'urgent': 1, 'warning': 2, 'missing': 3 };
        return priorityOrder[a.status.status] - priorityOrder[b.status.status];
      });

      return needsAction;
    } catch (error) {
      console.error('❌ Erreur récupération documents nécessitant action:', error);
      return [];
    }
  },

  // Générer un message d'alerte pour l'utilisateur
  getAlertMessage: async (userId?: string): Promise<string | null> => {
    try {
      const summary = await ExpirationService.getDocumentsSummary(userId);

      if (summary.expired > 0) {
        return `⚠️ URGENT: ${summary.expired} document(s) expiré(s) ! Veuillez les renouveler immédiatement.`;
      }

      if (summary.urgent > 0) {
        return `🔴 Attention: ${summary.urgent} document(s) expire(nt) dans moins de 7 jours !`;
      }

      if (summary.missing > 0) {
        return `📄 ${summary.missing} document(s) non scanné(s). Complétez votre profil.`;
      }

      if (summary.warnings > 0) {
        return `🟡 ${summary.warnings} document(s) à renouveler bientôt.`;
      }

      return null; // Tout est OK
    } catch (error) {
      console.error('❌ Erreur génération message alerte:', error);
      return null;
    }
  },

  // ========================================
  // HELPERS
  // ========================================

  // Calculer la prochaine date d'expiration suggérée
  suggestNextExpirationDate: (type: string, currentDate: string): string => {
    const config = DOCUMENT_CONFIG[type as keyof typeof DOCUMENT_CONFIG];
    
    if (!config || !config.validityPeriod) {
      // Par défaut: 1 an
      return DateHelpers.addDays(currentDate, 365);
    }

    return DateHelpers.addDays(currentDate, config.validityPeriod);
  },

  // Vérifier si un document doit être renouvelé selon la loi québécoise
  shouldRenewNow: (document: DocumentData | null): boolean => {
    if (!document) return true;
    
    const status = ExpirationService.getExpirationStatus(document);
    return ['expired', 'urgent'].includes(status.status);
  },

  // Obtenir les références légales d'un document
  getLegalReference: (type: string): string => {
    const config = DOCUMENT_CONFIG[type as keyof typeof DOCUMENT_CONFIG];
    return config?.legalReference || 'Non spécifié';
  },

  // Formater un message de rappel personnalisé
  formatReminderMessage: (document: DocumentData): string => {
    const status = ExpirationService.getExpirationStatus(document);
    const config = DOCUMENT_CONFIG[document.type];
    const label = config?.label || document.type;

    switch (status.status) {
      case 'expired':
        return `🔴 EXPIRÉ: Votre ${label} a expiré. Renouvelez-le immédiatement pour éviter des amendes.`;
      
      case 'urgent':
        return `⚠️ URGENT: Votre ${label} expire dans ${status.daysRemaining} jour(s). Prenez rendez-vous dès maintenant.`;
      
      case 'warning':
        return `🟡 Rappel: Votre ${label} expire le ${DateHelpers.formatDate(document.expirationDate)} (${status.daysRemaining} jours). Planifiez son renouvellement.`;
      
      case 'valid':
        return `✅ Votre ${label} est valide jusqu'au ${DateHelpers.formatDate(document.expirationDate)}.`;
      
      default:
        return `ℹ️ Veuillez scanner votre ${label}.`;
    }
  }
};
