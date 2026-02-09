import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, SafeAreaView } from 'react-native';

interface NavItem {
  name: string;
  route: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
}

const navItems: NavItem[] = [
  {
    name: 'home',
    route: '/accueil',
    icon: 'home',
    label: 'Accueil',
  },
  {
    name: 'historique',
    route: '/Historique',
    icon: 'history',
    label: 'Historique',
  },
  {
    name: 'profile',
    route: '/home', // Ou créer un écran Profile si nécessaire
    icon: 'account',
    label: 'Profil',
  },
];

export default function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (route: string) => {
    if (route === '/accueil') {
      return pathname === '/accueil' || pathname === '/index' || pathname === '/';
    }
    return pathname === route || pathname?.startsWith(route);
  };

  const getIconColor = (route: string) => {
    return isActive(route) ? '#FF6B35' : '#B0B0B0';
  };

  const getLabelColor = (route: string) => {
    return isActive(route) ? '#FF6B35' : '#B0B0B0';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {navItems.map((item) => {
          const active = isActive(item.route);
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={24}
                color={getIconColor(item.route)}
              />
              <Text style={[styles.navLabel, { color: getLabelColor(item.route) }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    zIndex: 1000,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    minHeight: 60,
    marginHorizontal: 4,
  },
  navItemActive: {
    backgroundColor: '#FFF5F0',
    borderWidth: 1,
    borderColor: '#FFE5D9',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.3,
  },
});
