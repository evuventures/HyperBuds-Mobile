// app/main/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MainLayout() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    console.log('[MAIN/_layout] mounted');

    const loadTheme = async () => {
      const value = await AsyncStorage.getItem('app.darkMode');
      setDarkMode(value === 'true');
    };

    loadTheme();

    return () => {
      console.log('[MAIN/_layout] unmounted');
    };
  }, []);

  const tabColors = {
    active: darkMode ? '#A855F7' : '#9333EA',
    inactive: darkMode ? '#777' : '#999',
    bg: darkMode ? '#000' : '#fff',
    border: darkMode ? '#222' : '#eee',
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tabColors.active,
        tabBarInactiveTintColor: tabColors.inactive,
        tabBarStyle: { backgroundColor: tabColors.bg, borderTopColor: tabColors.border },
      }}
    >
      {/* Explore */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Profile (correct path to app/profile/profile.tsx) */}
      <Tabs.Screen
        name="../profile/profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hide auto-generated Search route */}
      <Tabs.Screen name="search" options={{ href: null }} />

      {/* Matchmaker */}
      <Tabs.Screen
        name="matchmaker/how-it-works"
        options={{
          title: 'Matchmaker',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden matchmaker pages */}
      <Tabs.Screen name="matchmaker/index" options={{ href: null }} />
      <Tabs.Screen name="matchmaker/aimatchmaker" options={{ href: null }} />
      <Tabs.Screen name="matchmaker/success" options={{ href: null }} />

      {/* Messages */}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="message-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
