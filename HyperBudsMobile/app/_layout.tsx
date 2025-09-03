// app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';

export default function RootLayout() {
  const pathname = usePathname();

  useEffect(() => {
    console.log('[ROUTE]', pathname);
  }, [pathname]);

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
