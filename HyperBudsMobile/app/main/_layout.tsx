// app/main/_layout.tsx
import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function MainLayout() {
  // Loud mount/unmount logs to verify whether the Tabs layout is loading
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
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      {/* ✅ Matchmaker tab now points to how-it-works */}
      <Tabs.Screen
        name="matchmaker/how-it-works"
        options={{
          title: 'Matchmaker',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      {/* 🚫 Hide the other matchmaker pages so they don't become tabs */}
      <Tabs.Screen name="matchmaker/index" options={{ href: null }} />
      <Tabs.Screen name="matchmaker/aimatchmaker" options={{ href: null }} />
      <Tabs.Screen name="matchmaker/success" options={{ href: null }} />

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
