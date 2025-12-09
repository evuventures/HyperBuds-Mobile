// app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
import { ThemeProvider } from './theme/ThemeProvider';

export default function RootLayout() {
  const pathname = usePathname();

  useEffect(() => {
    console.log('[ROUTE]', pathname);
  }, [pathname]);

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
