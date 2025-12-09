// app/main/_layout.tsx
import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function MainLayout() {
  useEffect(() => {
    console.log('[MAIN/_layout] mounted');
    return () => {
      console.log('[MAIN/_layout] unmounted');
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#9333EA',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee' },
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

      {/* Profile (corrected path to app/profile/profile.tsx) */}
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
