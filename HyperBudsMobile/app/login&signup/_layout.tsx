// app/login&signup/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

export default function LoginFlowLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,   // hide headers in the login/signup flow
      }}
    />
  );
}
