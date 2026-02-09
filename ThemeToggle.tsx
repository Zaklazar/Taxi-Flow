import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggleTheme, colors } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.cardBackground }]}
      onPress={toggleTheme}
    >
      <MaterialCommunityIcons 
        name={isDark ? 'weather-sunny' : 'weather-night'} 
        size={20} 
        color={colors.text} 
      />
      <Text style={[styles.text, { color: colors.text }]}>
        {isDark ? 'Clair' : 'Sombre'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
