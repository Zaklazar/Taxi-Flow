/**
 * responsive.ts
 * 
 * Utilitaires pour rendre l'application responsive sur tous les appareils
 * (smartphones, phablettes, tablettes)
 */

import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dimensions de référence (iPhone 13 Pro)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/**
 * Type d'appareil basé sur la largeur de l'écran
 */
export enum DeviceType {
  PHONE = 'phone',           // < 600px
  PHABLET = 'phablet',       // 600-767px (iPhone Pro Max, Galaxy S24 Ultra)
  TABLET_SMALL = 'tablet_small', // 768-1023px
  TABLET = 'tablet'          // >= 1024px
}

/**
 * Détecte le type d'appareil
 */
export const getDeviceType = (): DeviceType => {
  if (SCREEN_WIDTH >= 1024) return DeviceType.TABLET;
  if (SCREEN_WIDTH >= 768) return DeviceType.TABLET_SMALL;
  if (SCREEN_WIDTH >= 600) return DeviceType.PHABLET;
  return DeviceType.PHONE;
};

/**
 * Vérifie si l'appareil est une tablette
 */
export const isTablet = (): boolean => {
  const deviceType = getDeviceType();
  return deviceType === DeviceType.TABLET || deviceType === DeviceType.TABLET_SMALL;
};

/**
 * Vérifie si l'appareil est un grand téléphone (phablet)
 */
export const isPhablet = (): boolean => {
  return getDeviceType() === DeviceType.PHABLET;
};

/**
 * Échelle une valeur de manière responsive
 * @param size Taille de base (pour iPhone 13 Pro)
 * @returns Taille ajustée pour l'écran actuel
 */
export const scale = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Échelle verticale
 */
export const verticalScale = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Échelle modérée (moins aggressive)
 * @param size Taille de base
 * @param factor Facteur de modération (0-1, défaut 0.5)
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

/**
 * Taille de police responsive
 */
export const fontSize = {
  xs: moderateScale(10),
  sm: moderateScale(12),
  base: moderateScale(14),
  md: moderateScale(16),
  lg: moderateScale(18),
  xl: moderateScale(20),
  xxl: moderateScale(24),
  xxxl: moderateScale(32),
};

/**
 * Espacements responsive
 */
export const spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  xxl: moderateScale(24),
  xxxl: moderateScale(32),
};

/**
 * Largeurs responsive pour les conteneurs
 */
export const containerWidth = (): number => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case DeviceType.TABLET:
      return Math.min(SCREEN_WIDTH * 0.7, 900); // Max 900px sur tablette
    case DeviceType.TABLET_SMALL:
      return SCREEN_WIDTH * 0.85;
    case DeviceType.PHABLET:
      return SCREEN_WIDTH * 0.92;
    default:
      return SCREEN_WIDTH * 0.95;
  }
};

/**
 * Nombre de colonnes pour les grilles
 */
export const getGridColumns = (): number => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case DeviceType.TABLET:
      return 3;
    case DeviceType.TABLET_SMALL:
      return 2;
    default:
      return 1;
  }
};

/**
 * Padding horizontal adaptatif
 */
export const horizontalPadding = (): number => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case DeviceType.TABLET:
      return spacing.xxxl;
    case DeviceType.TABLET_SMALL:
      return spacing.xxl;
    case DeviceType.PHABLET:
      return spacing.xl;
    default:
      return spacing.lg;
  }
};

/**
 * Taille d'icône responsive
 */
export const iconSize = {
  xs: moderateScale(16),
  sm: moderateScale(20),
  md: moderateScale(24),
  lg: moderateScale(32),
  xl: moderateScale(40),
};

/**
 * Dimensions de l'écran
 */
export const screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: SCREEN_WIDTH < 375,
  isMedium: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 428,
  isLarge: SCREEN_WIDTH >= 428,
  isExtraLarge: SCREEN_WIDTH >= 768,
};

/**
 * Utilitaire pour les valeurs conditionnelles selon la taille d'écran
 */
export const responsive = <T,>(values: {
  phone?: T;
  phablet?: T;
  tablet_small?: T;
  tablet?: T;
  default: T;
}): T => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case DeviceType.TABLET:
      return values.tablet ?? values.tablet_small ?? values.phablet ?? values.phone ?? values.default;
    case DeviceType.TABLET_SMALL:
      return values.tablet_small ?? values.phablet ?? values.phone ?? values.default;
    case DeviceType.PHABLET:
      return values.phablet ?? values.phone ?? values.default;
    default:
      return values.phone ?? values.default;
  }
};
