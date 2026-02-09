import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, Theme } from '../contexts/ThemeContext';

interface ThemeSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ visible, onClose }) => {
  const { theme, setTheme, colors } = useTheme();

  const themeOptions: { value: Theme; label: string; icon: any }[] = [
    { value: 'light', label: 'Clair', icon: 'weather-sunny' as any },
    { value: 'dark', label: 'Sombre', icon: 'weather-night' as any },
    { value: 'system', label: 'Système', icon: 'cog' as any },
  ];

  const handleThemeSelect = (selectedTheme: Theme) => {
    setTheme(selectedTheme);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Choisir le thème
          </Text>
          
          <View style={styles.themeOptions}>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.themeOption,
                  { 
                    backgroundColor: theme === option.value ? colors.primary : colors.background,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => handleThemeSelect(option.value)}
              >
                <MaterialCommunityIcons 
                  name={option.icon} 
                  size={24} 
                  color={theme === option.value ? '#FFFFFF' : colors.text} 
                />
                <Text style={[
                  styles.themeOptionText,
                  { color: theme === option.value ? '#FFFFFF' : colors.text }
                ]}>
                  {option.label}
                </Text>
                {theme === option.value && (
                  <MaterialCommunityIcons 
                    name="check" 
                    size={20} 
                    color="#FFFFFF" 
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.background }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: colors.text }]}>
              Fermer
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  themeOptions: {
    gap: 12,
    marginBottom: 20,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  themeOptionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  closeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ThemeSelector;
