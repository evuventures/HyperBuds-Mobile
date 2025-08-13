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
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth as firebaseAuth } from '../../src/firebase';

const { width } = Dimensions.get('window');

// Optional backend base URL; set EXPO_PUBLIC_API_BASE_URL in env for API load
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

type MeResponse = {
  id: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
};

export default function SettingScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Username from API (with fallback to Firebase)
  const [username, setUsername] = useState<string>('');
  const [loadingName, setLoadingName] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;

    const loadName = async () => {
      try {
        const user = firebaseAuth.currentUser;
        if (!user) throw new Error('Not signed in');

        const fbFallback = user.displayName || user.email?.split('@')[0] || 'user';

        if (API_BASE) {
          const idToken = await user.getIdToken();
          const res = await fetch(`${API_BASE}/users/me`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${idToken}`,
              Accept: 'application/json',
            },
          });
          const text = await res.text();
          const isJson = text.trim().startsWith('{');
          const data: MeResponse = isJson ? JSON.parse(text) : {};

          if (!alive) return;
          setUsername((data.username || '').trim() || fbFallback);
        } else {
          if (!alive) return;
          setUsername(fbFallback);
        }
      } catch {
        const user = firebaseAuth.currentUser;
        if (!alive) return;
        if (user) {
          const fbFallback = user.displayName || user.email?.split('@')[0] || 'user';
          setUsername(fbFallback);
        }
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

  const settings = [
    { key: 'views', label: 'Profile Views', icon: <Ionicons name="checkmark-circle-outline" size={24} color="#9333EA" /> },
    { key: 'likes', label: 'Likes', icon: <Ionicons name="heart-outline" size={24} color="#9333EA" /> },
    { key: 'shares', label: 'Shares', icon: <Ionicons name="share-social-outline" size={24} color="#9333EA" /> },
    { key: 'privacy', label: 'Privacy', icon: <Ionicons name="shield-checkmark-outline" size={24} color="#9333EA" /> },
    { key: 'terms', label: 'Terms', icon: <MaterialIcons name="description" size={24} color="#9333EA" /> },
    { key: 'language', label: 'Language', icon: <Ionicons name="language-outline" size={24} color="#9333EA" /> },
    { key: 'help', label: 'Help', icon: <Ionicons name="help-circle-outline" size={24} color="#9333EA" /> },
    { key: 'logout', label: 'Log Out', icon: <Ionicons name="log-out-outline" size={24} color="#333" /> },
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
          {settings.map(item => (
            <View key={item.key} style={styles.settingItem}>
              <View style={styles.iconWrapper}>{item.icon}</View>
              <Text style={styles.settingLabel}>{item.label}</Text>
              {(item.key === 'views' ||
                item.key === 'likes' ||
                item.key === 'shares' ||
                item.key === 'privacy' ||
                item.key === 'terms' ||
                item.key === 'language' ||
                item.key === 'help' ||
                item.key === 'logout') && (
                <Ionicons name="chevron-forward" size={20} color="#999" />
              )}
            </View>
          ))}

          {/* Notifications Toggle */}
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
