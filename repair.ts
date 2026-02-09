// --- TYPES POUR LES RÉPARATIONS ---

export interface Repair {
  id: string;
  roundId: string;           // ID de la ronde concernée
  driverId: string;          // ID du chauffeur
  checkName: string;         // Nom du défaut réparé (ex: check_proprete)
  repairDate: string;        // Date de la réparation
  description: string;       // Description de la réparation
  garageName?: string;       // Nom du garage (optionnel si location)
  invoicePhotoUrl?: string;  // URL de la photo facture (si propriétaire)
  isRental: boolean;         // true si véhicule de location
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateRepairInput {
  roundId: string;
  driverId: string;
  checkName: string;
  repairDate: string;
  description: string;
  garageName?: string;
  invoicePhotoUrl?: string;
  isRental: boolean;
}
