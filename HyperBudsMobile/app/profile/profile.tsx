// app/profile/profile.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, Link, type Href } from 'expo-router';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const defaultAvatar = require('../../assets/images/avatar.png');

/** Official backend (Render). Override via EXPO_PUBLIC_API_BASE_URL if needed. */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim() ||
  'https://api-hyperbuds-backend.onrender.com/api/v1';

// If your payments screen lives in a route group, change this to "/(main)/payments/payment", etc.
const PAYMENTS_HREF: Href = '/payments/subscription';

/* -------------------------------- Types -------------------------------- */

type StatsBreakdown = {
  followers?: number;
  engagement?: number;
};

type ProfileModel = {
  _id: string;
  userId: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatar?: string;          // image URL
  coverImage?: string;      // banner URL
  niche?: string[];         // up to 5
  socialLinks?: {
    tiktok?: string;
    instagram?: string;
    youtube?: string;
    twitch?: string;
    twitter?: string;
    linkedin?: string;
  };
  stats?: {
    totalFollowers?: number;
    avgEngagement?: number;
    platformBreakdown?: { [platform: string]: StatsBreakdown };
  };
  updatedAt?: string;
};

type UsersMeResponse = {
  user: {
    _id: string;
    email: string;
    role: string;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  profile: ProfileModel;
};

const SOCIAL_ICONS: Record<string, any> = {
  instagram: require('../../assets/images/ig.png'),
  tiktok: require('../../assets/images/tiktok.png'),
  youtube: require('../../assets/images/yt.png'),
  twitch: require('../../assets/images/twitch.png'),
  twitter: require('../../assets/images/twitter.png'),
  linkedin: require('../../assets/images/linkedin.png'),
};

/* ------------------------------ Utilities ------------------------------ */

const safeJson = (t: string) => { try { return t ? JSON.parse(t) : {}; } catch { return {}; } };

const fetchWithTimeout = (url: string, options: RequestInit = {}, ms = 30000) =>
  Promise.race([
    fetch(url, options),
    new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('Request timeout')), ms)),
  ]) as Promise<Response>;

async function withRetry<T>(fn: () => Promise<T>, retries = 1, baseDelayMs = 900): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt > retries) throw err;
      const msg = String(err?.message || err);
      const transient =
        msg.includes('timeout') ||
        msg.includes('Network request failed') ||
        msg.includes('Failed to fetch') ||
        msg.includes('Network');
      const delay = (transient ? baseDelayMs * Math.pow(2, attempt - 1) : 300) + Math.floor(Math.random() * 200);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/** Attach Authorization header, auto-refresh on 401 once, then retry. */
async function apiFetch(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const accessToken = await AsyncStorage.getItem('auth.accessToken');

  const headers = new Headers(init.headers as HeadersInit);
  headers.set('Accept', 'application/json');

  // Only set Content-Type when NOT using FormData
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (isFormData) {
    headers.delete('Content-Type');
  } else {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  }

  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const go = () =>
    fetchWithTimeout(`${API_BASE}${path}`, { ...init, headers }, timeoutMs);

  let res = await go();

  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newAccess = await AsyncStorage.getItem('auth.accessToken');
      if (newAccess) headers.set('Authorization', `Bearer ${newAccess}`);
      res = await fetchWithTimeout(`${API_BASE}${path}`, { ...init, headers }, timeoutMs);
    }
  }

  return res;
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const refreshToken = await AsyncStorage.getItem('auth.refreshToken');
    if (!refreshToken) return false;
    const r = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token: refreshToken }),
    }, 15000);
    if (!r.ok) return false;
    const t = await r.text();
    const d = safeJson(t);
    const newAccess: string | undefined = d?.accessToken;
    if (!newAccess) return false;
    await AsyncStorage.setItem('auth.accessToken', newAccess);
    await AsyncStorage.setItem('auth.tokenIssuedAt', String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

async function openUrl(url?: string) {
  if (!url) return;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert('Cannot open link', url);
  } catch {
    Alert.alert('Cannot open link', url);
  }
}

function cacheBust(url?: string, updatedAt?: string | number) {
  if (!url) return undefined;
  const ver = updatedAt ? new Date(updatedAt).getTime() : Date.now();
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${ver}`;
}

/* --------------------------------- UI --------------------------------- */

export default function ProfileScreen() {
  const router = useRouter();

  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

  const [displayName, setDisplayName] = useState<string>('');
  const [handle, setHandle] = useState<string>('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [bannerUri, setBannerUri] = useState<string | undefined>(undefined); // kept for future use
  const [bio, setBio] = useState<string>('');
  const [niches, setNiches] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<ProfileModel['socialLinks']>({});
  const [stats, setStats] = useState<ProfileModel['stats'] | undefined>(undefined);
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<string | undefined>(undefined);

  const loadProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);

      const rawUser = await AsyncStorage.getItem('user');
      const saved = rawUser ? JSON.parse(rawUser) : null;
      const fallback =
        (saved?.username || saved?.displayName || saved?.email?.split?.('@')?.[0] || 'user') as string;

      const res = await withRetry(
        async () => await apiFetch('/users/me', { method: 'GET' }, 30000),
        1,
        900
      );
      if (!res.ok) {
        const t = await res.text();
        const d = safeJson(t);
        throw new Error(d?.message || `Failed to load profile (${res.status})`);
      }
      const text = await res.text();
      const data = safeJson(text) as UsersMeResponse;

      const p = data?.profile || {};
      const updatedAt = p.updatedAt || data?.user?.updatedAt;

      setDisplayName(p.displayName || fallback);
      setHandle(p.username ? (p.username.startsWith('@') ? p.username : `@${p.username}`) : `@${fallback}`);
      setAvatarUri(cacheBust(p.avatar, updatedAt));
      setBannerUri(cacheBust(p.coverImage, updatedAt));
      setBio(p.bio || '');
      setNiches(Array.isArray(p.niche) ? p.niche : []);
      setSocialLinks(p.socialLinks || {});
      setStats(p.stats);
      setProfileUpdatedAt(updatedAt);
    } catch (e: any) {
      console.log('Load profile error:', e?.message || e);
      Alert.alert('Could not load profile', e?.message || 'Unknown error');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Re-load whenever the screen gains focus (returning from Edit)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  // Upload avatar via API (also cache-bust immediately)
  const handleChangeAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to change your avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled) return;

      setUploadingAvatar(true);
      const asset = result.assets[0];

      const fd = new FormData();
      fd.append('file', { uri: asset.uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
      fd.append('type', 'avatar');

      const up = await apiFetch('/profiles/upload-media', {
        method: 'POST',
        headers: {},
        body: fd,
      }, 30000);

      const upText = await up.text();
      const upData = safeJson(upText);
      if (!up.ok || !upData?.url) {
        throw new Error(upData?.message || `Upload failed (${up.status})`);
      }

      // Many backends set profile.avatar automatically on successful upload.
      // If yours doesn’t, uncomment the PUT below:
      // await apiFetch('/profiles/me', { method: 'PUT', body: JSON.stringify({ avatar: upData.url }) });

      // Cache-bust immediately for the local state:
      setAvatarUri(cacheBust(upData.url, Date.now()));

      // Also refresh from server (ensures consistency)
      await loadProfile();
    } catch (e: any) {
      console.log('Avatar update error', e);
      Alert.alert('Could not update avatar', e?.message || 'Unknown error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Build socials list
  const displaySocials = useMemo(() => {
    const s = socialLinks || {};
    return Object.entries(s).filter(([, v]) => typeof v === 'string' && v.trim().length > 0);
  }, [socialLinks]);

  // Show 0 / 0% instead of a dash
  const totalFollowers = stats?.totalFollowers ?? 0;
  const avgEng = stats?.avgEngagement ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/main/explore')}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        {/* Avatar */}
        <TouchableOpacity style={styles.avatar} activeOpacity={0.85} onPress={handleChangeAvatar}>
          <Image
            source={avatarUri ? { uri: avatarUri } : defaultAvatar}
            style={styles.avatarImage}
            resizeMode="cover"
          />
          {(uploadingAvatar || loadingProfile) && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Name & Handle */}
        <Text style={styles.username}>{loadingProfile ? 'Loading…' : displayName || 'User'}</Text>
        <Text style={styles.role}>{handle || ''}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statCount}>{formatK(totalFollowers)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statCount}>{Number.isFinite(avgEng) ? `${avgEng}%` : '0%'}</Text>
            <Text style={styles.statLabel}>Engagement</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statCount}>{niches?.length || 0}</Text>
            <Text style={styles.statLabel}>Niches</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.editButton} onPress={() => router.push('/profile/editprofile')}>
            <LinearGradient colors={['#3B82F6', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.editGradient}>
              <Text style={styles.editText}>Edit Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/profile/settings')}>
            <Ionicons name="settings-outline" size={24} color="#9333EA" />
          </TouchableOpacity>
        </View>

        {/* About Me */}
        <Text style={styles.sectionTitle}>About Me</Text>
        <Text style={styles.bio}>{bio?.trim() ? bio : 'No bio yet'}</Text>

        {/* Socials */}
        <Text style={styles.sectionTitle}>Socials</Text>
        {displaySocials.length ? (
          <View style={styles.socialsGrid}>
            {displaySocials.map(([key, value]) => {
              const icon = SOCIAL_ICONS[key] || null;
              if (!icon) return null;
              return (
                <TouchableOpacity key={key} style={styles.socialIconWrap} onPress={() => openUrl(value)} activeOpacity={0.8}>
                  <Image source={icon} style={styles.socialIconImg} />
                  <Text numberOfLines={1} style={styles.socialHandle}>{value}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>No socials linked</Text>
        )}

        {/* Payments entry */}
        <Link href={PAYMENTS_HREF} asChild>
          <TouchableOpacity style={{ marginTop: 12 }}>
            <LinearGradient
              colors={['#6C63FF', '#A48CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.paymentBtn}
            >
              <Feather name="credit-card" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.paymentBtnText}> Upgrade </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Link>

        {/* Niches */}
        <Text style={styles.sectionTitle}>Niches</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
          {niches && niches.length > 0 ? (
            niches.map((n) => (
              <View key={n} style={styles.tag}>
                <Text style={styles.tagText}>{n}</Text>
              </View>
            ))
          ) : (
            <View style={{ paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, color: '#666' }}>No niches selected</Text>
            </View>
          )}
        </ScrollView>

        {/* Collaboration section removed as requested */}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------- Helpers ------------------------------- */

function formatK(n: number) {
  if (!Number.isFinite(n)) return '0';
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (n < 1_000_000) return Math.round(n / 1000) + 'K';
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}

/* -------------------------------- Styles -------------------------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  // Added extra top padding so the back button never overlaps content
  container: { padding: 20, paddingTop: 28, paddingBottom: 40 },

  backButton: { position: 'absolute', top: 10, left: 10, zIndex: 10 },

  // ↓ Lowered avatar by removing the negative margin and adding a positive top margin
  avatar: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 4, borderColor: '#fff', backgroundColor: '#ddd',
    alignSelf: 'center',
    marginTop: 16,          // was: -60 (this caused clipping at the top)
    marginBottom: 10,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center'
  },

  username: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  role: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 10 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statCount: { fontSize: 16, fontWeight: '600' },
  statLabel: { fontSize: 12, color: '#666' },

  /* Buttons */
  buttonsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  editButton: { flex: 1, marginRight: 8, borderRadius: 10, overflow: 'hidden' },
  editGradient: { paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  editText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  settingsButton: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#9333EA' },

  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  bio: { fontSize: 14, color: '#333', marginBottom: 20 },

  socialsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  socialIconWrap: { width: (width - 40 - 14 * 3) / 4, alignItems: 'center' },
  socialIconImg: { width: 36, height: 36, resizeMode: 'contain', marginBottom: 6 },
  socialHandle: { fontSize: 11, color: '#444', textAlign: 'center' },

  tagRow: { paddingVertical: 10 },
  tag: { backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 6, marginRight: 10 },
  tagText: { fontSize: 12, color: '#333' },

  paymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    
  },
  paymentBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    
  },
});
