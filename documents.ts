// Types pour les documents professionnels du chauffeur de taxi

export type DocumentType = 
  | 'permis_taxi'           // Permis Classe 5
  | 'pocket_saaq'           // Numéro de dossier SAAQ
  | 'assurance'             // Assurance véhicule
  | 'certificat_immatriculation' // Certificat d'immatriculation
  | 'attestation_vehicule'  // Attestation véhicule autorisé
  | 'contrat_location'      // Contrat de location véhicule
  | 'inspection_mecanique'  // Inspection mécanique annuelle
  | 'inspection_taximetre'  // Inspection taximètre annuelle
  | 'formation_base'        // Formation de base chauffeurs qualifiés (à vie)
  | 'formation_handicapes'; // Formation avancée transport personnes handicapées (à vie)

export interface DocumentData {
  id: string;                    // ID unique du document
  type: DocumentType;            // Type de document
  documentNumber?: string;       // Numéro du document (permis, pocket, etc.)
  expirationDate: string;        // Date d'expiration (format YYYY-MM-DD)
  issueDate?: string;            // Date d'émission (format YYYY-MM-DD)
  imageUrl?: string;             // URL de l'image scannée (Firebase Storage)
  localImageUri?: string;        // URI locale de l'image (avant upload)
  uploadedAt?: string;           // Date d'upload (ISO string)
  notes?: string;                // Notes additionnelles
  
  // Champs spécifiques selon le type de document
  metadata?: {
    // Permis Taxi
    fullName?: string;
    address?: string;
    
    // Assurance
    insuranceCompany?: string;
    policyNumber?: string;
    
    // Certificat d'immatriculation
    vehiclePlate?: string;
    vin?: string; // Numéro d'identification véhicule
    
    // Attestation véhicule autorisé
    attestationNumber?: string;
    fileNumber?: string; // Numéro de dossier
    
    // Contrat de location
    ownerName?: string;
    ownerEmail?: string;
    monthlyRate?: number;
    
    // Inspections
    inspectionPlace?: string;
    inspectorName?: string;
    nextInspectionDate?: string;
    totalPages?: number;
    
    // OBD2 Scanner
    obd2Codes?: string[];
    obd2Status?: 'conforme' | 'non-conforme' | 'attention' | 'non-scanné';
  };
}

export interface ExpirationStatus {
  status: 'valid' | 'warning' | 'urgent' | 'expired' | 'missing';
  daysRemaining: number;
  color: string;      // Pour l'affichage (#22C55E, #FBBF24, #EF4444)
  icon: string;       // Emoji ou nom d'icône
  message: string;    // Message explicatif
}

export interface DocumentSummary {
  total: number;           // Nombre total de documents requis (8)
  scanned: number;         // Nombre de documents scannés
  valid: number;           // Nombre de documents valides (non expirés)
  warnings: number;        // Nombre de documents proches d'expirer
  urgent: number;          // Nombre de documents urgents (< 7 jours)
  expired: number;         // Nombre de documents expirés
  missing: number;         // Nombre de documents non scannés
  overallStatus: 'ok' | 'attention' | 'critical'; // Statut global
}

// Configuration des documents selon les lois du Québec
export const DOCUMENT_CONFIG = {
  permis_taxi: {
    label: 'Permis Taxi (Classe 5)',
    icon: 'card-account-details',
    warningDays: 60,      // Avertir 60 jours avant expiration
    urgentDays: 30,       // Urgent à 30 jours
    validityPeriod: 1825, // 5 ans (en jours)
    required: true,
    legalReference: 'Code de la sécurité routière, art. 66'
  },
  pocket_saaq: {
    label: 'Pocket SAAQ',
    icon: 'folder-account',
    warningDays: 30,
    urgentDays: 14,
    validityPeriod: 365,  // 1 an (à vérifier selon SAAQ)
    required: true,
    legalReference: 'Règlement du taxi (SAAQ)'
  },
  assurance: {
    label: 'Assurance Véhicule',
    icon: 'shield-car',
    warningDays: 30,
    urgentDays: 14,
    validityPeriod: 365,  // 1 an
    required: true,
    legalReference: 'Loi sur l\'assurance automobile'
  },
  certificat_immatriculation: {
    label: 'Certificat d\'Immatriculation',
    icon: 'card-text',
    warningDays: 30,
    urgentDays: 14,
    validityPeriod: 365,  // 1 an
    required: true,
    legalReference: 'Code de la sécurité routière, art. 31'
  },
  attestation_vehicule: {
    label: 'Attestation Véhicule Autorisé',
    icon: 'file-certificate',
    warningDays: 30,
    urgentDays: 14,
    validityPeriod: 365,  // 1 an
    required: true,
    legalReference: 'Règlement sur le service de transport par taxi'
  },
  contrat_location: {
    label: 'Contrat de Location',
    icon: 'file-document-edit',
    warningDays: 30,
    urgentDays: 7,
    validityPeriod: null, // Varie selon le contrat
    required: false,      // Optionnel (si véhicule loué)
    legalReference: 'Code civil du Québec'
  },
  inspection_mecanique: {
    label: 'Inspection Mécanique',
    icon: 'car-wrench',
    warningDays: 30,
    urgentDays: 7,
    validityPeriod: 365,  // 1 an max (loi SAAQ)
    required: true,
    legalReference: 'Règlement sur les normes de sécurité des véhicules routiers'
  },
  inspection_taximetre: {
    label: 'Inspection Taximètre',
    icon: 'counter',
    warningDays: 30,
    urgentDays: 7,
    validityPeriod: 365,  // 1 an max (Bureau du taxi)
    required: true,
    legalReference: 'Règlement concernant le Bureau du taxi de Montréal'
  },
  formation_base: {
    label: 'Formation de Base Chauffeurs Qualifiés',
    icon: 'school',
    warningDays: 0,       // Pas d'avertissement (à vie)
    urgentDays: 0,        // Pas d'urgence (à vie)
    validityPeriod: null, // À vie
    required: true,
    legalReference: 'Règlement sur le transport par taxi'
  },
  formation_handicapes: {
    label: 'Formation Transport Personnes Handicapées',
    icon: 'human-wheelchair',
    warningDays: 0,       // Pas d'avertissement (à vie)
    urgentDays: 0,        // Pas d'urgence (à vie)
    validityPeriod: null, // À vie
    required: false,      // Optionnel (selon service offert)
    legalReference: 'Règlement sur le transport adapté'
  }
} as const;

// Helpers pour les calculs de dates
export const DateHelpers = {
  // Calcule le nombre de jours entre aujourd'hui et une date
  daysUntil: (dateString: string): number => {
    const targetDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  // Formate une date YYYY-MM-DD en format lisible (DD/MM/YYYY)
  formatDate: (dateString: string): string => {
    if (!dateString) return 'Non défini';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  },

  // Ajoute des jours à une date
  addDays: (dateString: string, days: number): string => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  },

  // Vérifie si une date est dans le passé
  isPast: (dateString: string): boolean => {
    return DateHelpers.daysUntil(dateString) < 0;
  },

  // Retourne la date du jour au format YYYY-MM-DD
  today: (): string => {
    return new Date().toISOString().split('T')[0];
  }
};
