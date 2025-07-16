// app/main/profile/setting.tsx
import React, { useState } from 'react';

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

const { width } = Dimensions.get('window');

export default function SettingScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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
          <Text style={styles.name}>Sam H. Carter</Text>
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
              {item.key === 'views' || item.key === 'likes' || item.key === 'shares' ? (
                <Ionicons name="chevron-forward" size={20} color="#999" />
              ) : item.key === 'logout' ? (
                <Ionicons name="chevron-forward" size={20} color="#999" />
              ) : item.key === 'privacy' || item.key === 'terms' || item.key === 'language' || item.key === 'help' ? (
                <Ionicons name="chevron-forward" size={20} color="#999" />
              ) : null}
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