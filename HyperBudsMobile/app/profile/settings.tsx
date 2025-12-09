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

// ⭐ NEW: import global theme
import { useTheme } from '../theme/ThemeProvider';

const { width } = Dimensions.get('window');

export default function SettingScreen() {
  const router = useRouter();

  // ⭐ REPLACEMENT: use global theme instead of local state
  const { isDark, toggleTheme, colors } = useTheme();

  // ========================
  // USERNAME LOAD
  // ========================
  const [username, setUsername] = useState<string>('');
  const [loadingName, setLoadingName] = useState<boolean>(true);

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
      await AsyncStorage.multiRemove(['user', 'isLoggedIn', 'rememberedEmail']);
      router.replace('/login&signup/login');
    } catch (e: any) {
      Alert.alert('Logout error', e?.message || 'Unknown error');
    }
  };

  // ========================
  // SETTINGS LIST
  // ========================
  const settings = [
    {
      key: 'views',
      label: 'Profile Views',
      icon: <Ionicons name="checkmark-circle-outline" size={24} color="#9333EA" />,
    },
    {
      key: 'likes',
      label: 'Likes',
      icon: <Ionicons name="heart-outline" size={24} color="#9333EA" />,
    },
    {
      key: 'shares',
      label: 'Shares',
      icon: <Ionicons name="share-social-outline" size={24} color="#9333EA" />,
    },
    {
      key: 'privacy',
      label: 'Privacy',
      icon: <Ionicons name="shield-checkmark-outline" size={24} color="#9333EA" />,
    },
    {
      key: 'terms',
      label: 'Terms',
      icon: <MaterialIcons name="description" size={24} color="#9333EA" />,
    },
    {
      key: 'language',
      label: 'Language',
      icon: <Ionicons name="language-outline" size={24} color="#9333EA" />,
    },
    {
      key: 'help',
      label: 'Help',
      icon: <Ionicons name="help-circle-outline" size={24} color="#9333EA" />,
    },
    {
      key: 'logout',
      label: 'Log Out',
      icon: <Ionicons name="log-out-outline" size={24} color={colors.text} />,
      onPress: handleLogout,
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Back Arrow */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Profile Header */}
        <View style={styles.headerSection}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.iconBg }]} />
          
          <Text style={[styles.name, { color: colors.text }]}>
            {loadingName ? 'Loading…' : displayHandle}
          </Text>

          <Text style={[styles.role, { color: colors.subtext }]}>Influencer</Text>

          <TouchableOpacity
            style={[
              styles.upgradeButton,
              { borderColor: "#9333EA" },
            ]}
          >
            <Text style={[styles.upgradeText]}>Upgrade Now - Go Pro</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Card */}
        <View style={[styles.settingsSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>

          {/* ⭐ DARK MODE TOGGLE (minimal change) */}
          <View style={styles.settingItem}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.iconBg }]}>
              <Ionicons name="moon-outline" size={24} color="#9333EA" />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>

            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#888', true: '#9333EA' }}
              thumbColor="#fff"
            />
          </View>

          {/* Other items unchanged */}
          {settings.map(item => {
            const Row = (
              <View style={styles.settingItem}>
                <View style={[styles.iconWrapper, { backgroundColor: colors.iconBg }]}>
                  {item.icon}
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  {item.label}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
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

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20 },

  backButton: { position: 'absolute', top: 20, left: 20, zIndex: 10 },

  headerSection: { alignItems: 'center', marginBottom: 30 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  name: { fontSize: 20, fontWeight: '600', marginBottom: 4 },
  role: { fontSize: 14, marginBottom: 15 },
  upgradeButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  upgradeText: { color: '#9333EA', fontWeight: '500' },

  settingsSection: {
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingLabel: { flex: 1, fontSize: 16 },
});
