import * as React from 'react';
const { createContext, useContext, Fragment } = React;

// Types pour les thèmes
export type Theme = 'light' | 'dark' | 'system';

export interface ColorScheme {
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  card: string;
  text: string;
  textLight: string;
  success: string;
  error: string;
  border: string;
  overlay: string;
}

// Définition des thèmes
export const lightTheme: ColorScheme = {
  primary: '#00D2FF',      // Bleu cyan électrique
  primaryDark: '#007AFF',  // Bleu plus profond
  secondary: '#2A2D34',    // Gris très sombre
  accent: '#FFD700',       // Jaune pour les accents
  background: '#F4F6F9',   // Gris très clair
  card: '#FFFFFF',         // Blanc pur
  text: '#1A1A1A',         // Noir doux
  textLight: '#8E8E93',    // Gris pour sous-titres
  success: '#34C759',      // Vert
  error: '#FF3B30',        // Rouge
  border: '#E1E1E1',       // Bordure légère
  overlay: 'rgba(0, 0, 0, 0.5)', // Overlay pour modals
};

export const darkTheme: ColorScheme = {
  primary: '#00D2FF',      // Bleu cyan électrique (même en dark)
  primaryDark: '#0099CC',  // Bleu plus clair pour dark
  secondary: '#1C1C1E',    // Fond sombre
  accent: '#FFD700',       // Jaune (même accent)
  background: '#000000',   // Noir pur
  card: '#1C1C1E',        // Cartes sombres
  text: '#FFFFFF',         // Blanc pour texte
  textLight: '#8E8E93',    // Gris pour sous-titres
  success: '#30D158',      // Vert plus clair
  error: '#FF453A',        // Rouge plus clair
  border: '#38383A',       // Bordures sombres
  overlay: 'rgba(255, 255, 255, 0.1)', // Overlay inversé
};

// Interface du contexte
interface ThemeContextType {
  theme: Theme;
  colors: ColorScheme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Création du contexte
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Hook personnalisé pour utiliser le thème
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Provider du thème (Version ultra-corrigée pour thème statique)
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Comme le thème est forcé à 'light' et ne peut pas être changé,
  // nous n'avons pas besoin d'état interne (useState) pour 'theme' ou 'isLoading'.
  // Nous définissons directement les valeurs statiques pour le contexte.

  const themeValue: Theme = 'light';
  const colorsValue: ColorScheme = lightTheme;
  const isDarkValue: boolean = false;

  const value: ThemeContextType = {
    theme: themeValue,
    colors: colorsValue,
    isDark: isDarkValue,
    setTheme: (newTheme: Theme) => {
      // Ne fait rien, le thème est forcé à light
    },
    toggleTheme: () => {
      // Ne fait rien, le thème est forcé à light
    },
  };

  // Utilisation de JSX standard pour plus de lisibilité
  return (
    <ThemeContext.Provider key="theme-provider" value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
