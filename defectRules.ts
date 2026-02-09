// --- RÈGLES DE GRAVITÉ DES DÉFAUTS (LOI 17 / SAAQ QUÉBEC) ---
// Définit si un défaut est MAJEUR (interdiction de circuler) ou MINEUR (48h pour réparer)

export const DEFECT_RULES: { [key: string]: 'mineur' | 'majeur' } = {
  // DÉFAUTS MAJEURS - Interdiction de circuler selon loi 17 SAAQ
  check_phares_feux: 'majeur',       // Feux, phares, clignotants
  check_pneus: 'majeur',             // Pneus (pression, usure)
  check_direction: 'majeur',         // Direction (jeu volant)
  check_liquide_frein: 'majeur',     // Freins / liquide
  check_fuites: 'majeur',            // Fuites de liquides
  check_essuie_glaces: 'majeur',     // Essuie-glaces
  check_ceintures: 'majeur',         // Ceintures de sécurité

  // DÉFAUTS MINEURS - Réparation requise sous 48h
  check_retroviseurs: 'mineur',      // Rétroviseurs
  check_frein_stationnement: 'mineur', // Frein à main
  check_klaxon: 'mineur',            // Klaxon
  check_degivrage: 'mineur',         // Chauffage & dégivrage
  check_voyants_tableau: 'mineur',   // Voyants tableau de bord
  check_lanternon: 'mineur',         // Lanternon taxi
  check_taximetre: 'mineur',         // Taximètre
  check_proprete: 'mineur',          // Propreté intérieur
  check_trousse: 'mineur',           // Trousse de premiers soins
};

// Liste complète des vérifications dans l'ordre d'affichage
export const ALL_CHECKS = [
  // Section 1: Extérieur & Feux
  'check_phares_feux',
  'check_pneus',
  'check_retroviseurs',
  'check_essuie_glaces',
  'check_fuites',
  
  // Section 2: Intérieur & Mécanique
  'check_frein_stationnement',
  'check_liquide_frein',
  'check_direction',
  'check_klaxon',
  'check_degivrage',
  'check_voyants_tableau',
  
  // Section 3: Équipement Taxi
  'check_ceintures',
  'check_lanternon',
  'check_taximetre',
  'check_proprete',
  'check_trousse',
];
