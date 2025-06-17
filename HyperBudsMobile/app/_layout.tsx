import { Stack } from 'expo-router';

export default function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // 👈 hides the top navigation bar for all screens
      }}
    />
  );
}
