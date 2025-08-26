// app/main/profile/setting.tsx
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function SettingScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [username, setUsername] = useState<string>('');
  const [loadingName, setLoadingName] = useState<boolean>(true);

  // Read username from AsyncStorage "user" (saved by your login.tsx)
  useEffect(() => {
    let alive = true;

    const loadName = async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        const u = raw ? JSON.parse(raw) : null;
        const name =
          (u?.username || u?.email?.split?.('@')?.[0] || '').toString().trim() ||
          'user';
        if (alive) setUsername(name);
      } catch {
        if (alive) setUsername('user');
      } finally {
        if (alive) setLoadingName(false);
      }
    };

    loadName();
    return () => {
      alive = false;
    };
  }, []);

  const displayHandle =
    username ? (username.startsWith('@') ? username : `@${username}`) : '@user';

  const handleLogout = async () => {
    try {
      // Clear your local “session”
      await AsyncStorage.multiRemove(['user', 'isLoggedIn', 'rememberedEmail']);
      // Send them to login
      router.replace('/login&signup/login');
    } catch (e: any) {
      Alert.alert('Logout error', e?.message || 'Unknown error');
    }
  };

  // Same visual list, but we’ll attach onPress only to Logout
  const settings = [
    {
      key: 'views',
      label: 'Profile Views',
      icon: <Ionicons name="checkmark-circle-outline" size={24} color="#9333EA" />,
      onPress: undefined,
    },
    {
      key: 'likes',
      label: 'Likes',
      icon: <Ionicons name="heart-outline" size={24} color="#9333EA" />,
      onPress: undefined,
    },
    {
      key: 'shares',
      label: 'Shares',
      icon: <Ionicons name="share-social-outline" size={24} color="#9333EA" />,
      onPress: undefined,
    },
    {
      key: 'privacy',
      label: 'Privacy',
      icon: <Ionicons name="shield-checkmark-outline" size={24} color="#9333EA" />,
      onPress: undefined,
    },
    {
      key: 'terms',
      label: 'Terms',
      icon: <MaterialIcons name="description" size={24} color="#9333EA" />,
      onPress: undefined,
    },
    {
      key: 'language',
      label: 'Language',
      icon: <Ionicons name="language-outline" size={24} color="#9333EA" />,
      onPress: undefined,
    },
    {
      key: 'help',
      label: 'Help',
      icon: <Ionicons name="help-circle-outline" size={24} color="#9333EA" />,
      onPress: undefined,
    },
    {
      key: 'logout',
      label: 'Log Out',
      icon: <Ionicons name="log-out-outline" size={24} color="#333" />,
      onPress: handleLogout, // <- wired up
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Back Arrow */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        {/* Profile Header */}
        <View style={styles.headerSection}>
          <View style={styles.avatarPlaceholder} />
          <Text style={styles.name}>{loadingName ? 'Loading…' : displayHandle}</Text>
          <Text style={styles.role}>Influencer</Text>
          <TouchableOpacity style={styles.upgradeButton}>
            <Text style={styles.upgradeText}>Upgrade Now - Go Pro</Text>
          </TouchableOpacity>
        </View>

        {/* Settings List */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          {settings.map(item => {
            const Row = (
              <View style={styles.settingItem}>
                <View style={styles.iconWrapper}>{item.icon}</View>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </View>
            );

            return item.onPress ? (
              <TouchableOpacity key={item.key} onPress={item.onPress} activeOpacity={0.8}>
                {Row}
              </TouchableOpacity>
            ) : (
              <View key={item.key}>{Row}</View>
            );
          })}

          {/* Notifications Toggle (unchanged visuals) */}
          <View style={styles.settingItem}>
            <View style={styles.iconWrapper}>
              <Ionicons name="notifications-outline" size={24} color="#9333EA" />
            </View>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#ccc', true: '#9333EA' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f7' },
  container: { paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20 },

  backButton: { position: 'absolute', top: 20, left: 20, zIndex: 10 },

  headerSection: { alignItems: 'center', marginBottom: 30 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ddd',
    marginBottom: 15,
  },
  name: { fontSize: 20, fontWeight: '600', marginBottom: 4 },
  role: { fontSize: 14, color: '#666', marginBottom: 15 },
  upgradeButton: {
    borderWidth: 1,
    borderColor: '#9333EA',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  upgradeText: { color: '#9333EA', fontWeight: '500' },

  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15, marginLeft: 10 },

  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingLabel: { flex: 1, fontSize: 16, color: '#333' },
});
