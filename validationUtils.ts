/**
 * Utilitaires de validation et d'assainissement des données
 * Conformité OWASP pour React Native/Expo
 */

import { Alert } from 'react-native';

/**
 * Interface pour les résultats de validation
 */
interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

/**
 * Assainit une chaîne de caractères en supprimant les espaces inutiles
 * et les caractères dangereux pour prévenir les injections XSS
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim() // Supprime les espaces au début et à la fin
    .replace(/\s+/g, ' ') // Normalise les espaces multiples
    .replace(/[<>]/g, '') // Supprime les caractères < et > dangereux
    .replace(/javascript:/gi, '') // Supprime les protocoles javascript
    .replace(/on\w+=/gi, '') // Supprime les gestionnaires d'événements
    .substring(0, 255); // Limite la longueur
};

/**
 * Valide le format d'un nom complet
 * Accepte seulement les lettres, espaces, tirets et apostrophes
 */
export const validateName = (name: string): ValidationResult => {
  const sanitized = sanitizeInput(name);
  
  if (!sanitized || sanitized.length < 2) {
    return {
      isValid: false,
      error: 'Le nom doit contenir au moins 2 caractères',
      sanitizedValue: sanitized
    };
  }
  
  if (sanitized.length > 50) {
    return {
      isValid: false,
      error: 'Le nom ne peut pas dépasser 50 caractères',
      sanitizedValue: sanitized
    };
  }
  
  // Accepte lettres, espaces, tirets, apostrophes (noms composés)
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  if (!nameRegex.test(sanitized)) {
    return {
      isValid: false,
      error: 'Le nom contient des caractères non autorisés',
      sanitizedValue: sanitized
    };
  }
  
  return {
    isValid: true,
    sanitizedValue: sanitized
  };
};

/**
 * Valide le format d'un permis de conduire Québec (Classe 5)
 * Format: 1 lettre + 12 chiffres (ex: L123456789101)
 */
export const validateLicense = (license: string): ValidationResult => {
  const sanitized = sanitizeInput(license).toUpperCase().replace(/\s/g, '');
  
  if (!sanitized) {
    return {
      isValid: false,
      error: 'Le numéro de permis est requis',
      sanitizedValue: sanitized
    };
  }
  
  // Format Québec: 1 lettre suivie de 12 chiffres
  const licenseRegex = /^[A-Z][0-9]{12}$/;
  if (!licenseRegex.test(sanitized)) {
    return {
      isValid: false,
      error: 'Format invalide. Format attendu: 1 lettre + 12 chiffres (ex: L123456789101)',
      sanitizedValue: sanitized
    };
  }
  
  return {
    isValid: true,
    sanitizedValue: sanitized
  };
};

/**
 * Valide le format d'une plaque d'immatriculation Québec
 * Formats acceptés:
 * - Commerciale: 3 lettres + 4 chiffres (ex: FTN1234)
 * - Standard: 6 caractères alphanumériques (ex: W72ZCF)
 */
export const validatePlate = (plate: string): ValidationResult => {
  const sanitized = sanitizeInput(plate).toUpperCase().replace(/\s/g, '');
  
  if (!sanitized) {
    return {
      isValid: false,
      error: 'La plaque d\'immatriculation est requise',
      sanitizedValue: sanitized
    };
  }
  
  // Format commercial: 3 lettres + 4 chiffres (FTN1234)
  const commercialRegex = /^[A-Z]{3}[0-9]{4}$/;
  // Format standard: 6 caractères (W72ZCF)
  const standardRegex = /^[A-Z0-9]{6}$/;
  
  if (!commercialRegex.test(sanitized) && !standardRegex.test(sanitized)) {
    return {
      isValid: false,
      error: 'Format invalide. Format commercial: 3 lettres + 4 chiffres (ex: FTN1234) ou Standard: 6 caractères (ex: W72ZCF)',
      sanitizedValue: sanitized
    };
  }
  
  return {
    isValid: true,
    sanitizedValue: sanitized
  };
};

/**
 * Valide le format d'un email
 */
export const validateEmail = (email: string): ValidationResult => {
  const sanitized = sanitizeInput(email).toLowerCase();
  
  if (!sanitized) {
    return {
      isValid: true, // Email optionnel
      sanitizedValue: sanitized
    };
  }
  
  // Regex standard pour validation email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return {
      isValid: false,
      error: 'Format d\'email invalide',
      sanitizedValue: sanitized
    };
  }
  
  return {
    isValid: true,
    sanitizedValue: sanitized
  };
};

/**
 * Valide le numéro de pocket SAAQ
 * Format: Exactement 6 chiffres (ex: 123456)
 */
export const validatePocketNumber = (pocket: string): ValidationResult => {
  const sanitized = sanitizeInput(pocket).replace(/\s/g, '');
  
  if (!sanitized) {
    return {
      isValid: true, // Pocket optionnel
      sanitizedValue: sanitized
    };
  }
  
  // Exactement 6 chiffres
  const pocketRegex = /^[0-9]{6}$/;
  if (!pocketRegex.test(sanitized)) {
    return {
      isValid: false,
      error: 'Le numéro de pocket doit contenir exactement 6 chiffres (ex: 123456)',
      sanitizedValue: sanitized
    };
  }
  
  return {
    isValid: true,
    sanitizedValue: sanitized
  };
};

/**
 * Valide le nom d'une compagnie d'assurance
 */
export const validateInsurance = (insurance: string): ValidationResult => {
  const sanitized = sanitizeInput(insurance);
  
  if (!sanitized) {
    return {
      isValid: true, // Assurance optionnelle
      sanitizedValue: sanitized
    };
  }
  
  if (sanitized.length < 2) {
    return {
      isValid: false,
      error: 'Le nom de l\'assureur doit contenir au moins 2 caractères',
      sanitizedValue: sanitized
    };
  }
  
  if (sanitized.length > 50) {
    return {
      isValid: false,
      error: 'Le nom de l\'assureur ne peut pas dépasser 50 caractères',
      sanitizedValue: sanitized
    };
  }
  
  // Accepte lettres, chiffres, espaces, tirets, apostrophes, et (&)
  const insuranceRegex = /^[a-zA-Z0-9À-ÿ\s'&()-]+$/;
  if (!insuranceRegex.test(sanitized)) {
    return {
      isValid: false,
      error: 'Le nom contient des caractères non autorisés',
      sanitizedValue: sanitized
    };
  }
  
  return {
    isValid: true,
    sanitizedValue: sanitized
  };
};

/**
 * Affiche une alerte de sécurité à l'utilisateur
 */
export const showSecurityAlert = (title: string, message: string) => {
  Alert.alert(title, message, [
    { text: 'OK', style: 'default' }
  ]);
};

/**
 * Valide tous les champs du profil chauffeur
 */
export const validateProfileData = (profile: {
  name: string;
  licenseNumber: string;
  vehiclePlate: string;
  pocketNumber?: string;
  insurance?: string;
  email?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
}): { isValid: boolean; errors: string[]; sanitizedProfile: any } => {
  const errors: string[] = [];
  const sanitizedProfile: any = {};

  // Validation du nom (requis)
  const nameResult = validateName(profile.name);
  if (!nameResult.isValid) {
    errors.push(nameResult.error!);
  } else {
    sanitizedProfile.name = nameResult.sanitizedValue;
  }

  // Validation du permis (requis)
  const licenseResult = validateLicense(profile.licenseNumber);
  if (!licenseResult.isValid) {
    errors.push(licenseResult.error!);
  } else {
    sanitizedProfile.licenseNumber = licenseResult.sanitizedValue;
  }

  // Validation de la plaque (requise)
  const plateResult = validatePlate(profile.vehiclePlate);
  if (!plateResult.isValid) {
    errors.push(plateResult.error!);
  } else {
    sanitizedProfile.vehiclePlate = plateResult.sanitizedValue;
  }

  // Validations optionnelles
  const pocketResult = validatePocketNumber(profile.pocketNumber || '');
  if (pocketResult.isValid) {
    sanitizedProfile.pocketNumber = pocketResult.sanitizedValue;
  } else if (pocketResult.error) {
    errors.push(pocketResult.error);
  }

  const insuranceResult = validateInsurance(profile.insurance || '');
  if (insuranceResult.isValid) {
    sanitizedProfile.insurance = insuranceResult.sanitizedValue;
  } else if (insuranceResult.error) {
    errors.push(insuranceResult.error);
  }

  const emailResult = validateEmail(profile.email || '');
  if (emailResult.isValid) {
    sanitizedProfile.email = emailResult.sanitizedValue;
  } else if (emailResult.error) {
    errors.push(emailResult.error);
  }

  // Ajout des informations du véhicule (optionnelles)
  const vehicleMakeSanitized = sanitizeInput(profile.vehicleMake || '');
  if (vehicleMakeSanitized) {
    sanitizedProfile.vehicleMake = vehicleMakeSanitized;
  }
  
  const vehicleModelSanitized = sanitizeInput(profile.vehicleModel || '');
  if (vehicleModelSanitized) {
    sanitizedProfile.vehicleModel = vehicleModelSanitized;
  }
  
  const yearSanitized = sanitizeInput(profile.vehicleYear || '');
  if (yearSanitized) {
    // Validation basique de l'année (4 chiffres, entre 1900 et année actuelle + 1)
    const yearNum = parseInt(yearSanitized);
    const currentYear = new Date().getFullYear();
    if (!/^\d{4}$/.test(yearSanitized)) {
      errors.push("L'année doit être composée de 4 chiffres");
    } else if (yearNum < 1900 || yearNum > currentYear + 1) {
      errors.push(`L'année doit être entre 1900 et ${currentYear + 1}`);
    } else {
      sanitizedProfile.vehicleYear = yearSanitized;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedProfile
  };
};
