// app/_layout.tsx

import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false, // hide the top nav bar on all screens
        }}
      />
    </AuthProvider>
  );
}
