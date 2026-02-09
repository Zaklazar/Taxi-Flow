// --- TYPES POUR LES RONDES DE SÉCURITÉ ---

export type DefectSeverity = 'mineur' | 'majeur';
export type RoundStatus = 'conforme' | 'defaut_mineur' | 'defaut_majeur';

export interface SafetyChecks {
  check_liquide_frein?: boolean;
  check_frein_stationnement?: boolean;
  check_phares_feux?: boolean;
  check_pneus?: boolean;
  check_essuie_glaces?: boolean;
  check_retroviseurs?: boolean;
  check_voyants_tableau?: boolean;
  check_ceintures?: boolean;
  check_lanternon?: boolean;
  check_direction?: boolean;
  check_klaxon?: boolean;
  check_degivrage?: boolean;
  check_fuites?: boolean;
  check_proprete?: boolean;
  check_taximetre?: boolean;
  check_trousse?: boolean;
}

export interface DefectDetail {
  checkName: string;
  severity: DefectSeverity;
  repaired: boolean;
  repairId?: string;
  repairDate?: string;
}

export interface SafetyRound {
  id: string;
  driverId: string;
  vehicleId: string;
  date: string;
  odometre: number;
  statut: RoundStatus;
  checks: SafetyChecks;
  observations?: string;
  defects?: DefectDetail[];
  photos?: string[];
  localisation_gps?: string;
  obd2_codes_erreur?: string[];
  obd2_frein_status?: string;
  obd2_engine_status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSafetyRoundInput {
  driverId: string;
  vehicleId: string;
  odometre: number;
  statut: RoundStatus;
  checks: SafetyChecks;
  observations?: string;
  defects?: DefectDetail[];
  photos?: string[];
  localisation_gps?: string;
  obd2_codes_erreur?: string[];
  obd2_frein_status?: string;
  obd2_engine_status?: string;
}
