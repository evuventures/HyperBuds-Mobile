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
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const defaultAvatar = require('../../assets/images/avatar.png');

/** Official backend (Render). Override via EXPO_PUBLIC_API_BASE_URL if needed. */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim() ||
  'https://api-hyperbuds-backend.onrender.com/api/v1';

const PAYMENTS_HREF: Href = '/payments/subscription';

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
  avatar?: string;
  coverImage?: string;
  niche?: string[];
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
  rizzScore?: number;
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

const safeJson = (t: string) => {
  try {
    return t ? JSON.parse(t) : {};
  } catch {
    return {};
  }
};

const fetchWithTimeout = (url: string, options: RequestInit = {}, ms = 30000) =>
  Promise.race([
    fetch(url, options),
    new Promise<Response>((_, rej) =>
      setTimeout(() => rej(new Error('Request timeout')), ms)
    ),
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
      const delay =
        (transient ? baseDelayMs * Math.pow(2, attempt - 1) : 300) +
        Math.floor(Math.random() * 200);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function apiFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = 30000
): Promise<Response> {
  const accessToken = await AsyncStorage.getItem('auth.accessToken');
  const headers = new Headers(init.headers as HeadersInit);
  headers.set('Accept', 'application/json');
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (isFormData) {
    headers.delete('Content-Type');
  } else {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const go = () => fetchWithTimeout(`${API_BASE}${path}`, { ...init, headers }, timeoutMs);
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
    const r = await fetchWithTimeout(
      `${API_BASE}/auth/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token: refreshToken }),
      },
      15000
    );
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

export default function ProfileScreen() {
  const router = useRouter();

  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [handle, setHandle] = useState<string>('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [bannerUri, setBannerUri] = useState<string | undefined>(undefined);
  const [bio, setBio] = useState<string>('');
  const [niches, setNiches] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<ProfileModel['socialLinks']>({});
  const [stats, setStats] = useState<ProfileModel['stats'] | undefined>(undefined);
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<string | undefined>(undefined);
  const [rizzScore, setRizzScore] = useState<number>(0);

  const loadProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const rawUser = await AsyncStorage.getItem('user');
      const saved = rawUser ? JSON.parse(rawUser) : null;
      const fallback = (saved?.username ||
        saved?.displayName ||
        saved?.email?.split?.('@')?.[0] ||
        'user') as string;

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
      setHandle(
        p.username
          ? p.username.startsWith('@')
            ? p.username
            : `@${p.username}`
          : `@${fallback}`
      );
      setAvatarUri(cacheBust(p.avatar, updatedAt));
      setBannerUri(cacheBust(p.coverImage, updatedAt));
      setBio(p.bio || '');
      setNiches(Array.isArray(p.niche) ? p.niche : []);
      setSocialLinks(p.socialLinks || {});
      setStats(p.stats);
      setRizzScore(p.rizzScore ?? 0);
      setProfileUpdatedAt(updatedAt);
    } catch (e: any) {
      console.log('Load profile error:', e?.message || e);
      Alert.alert('Could not load profile', e?.message || 'Unknown error');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);
              
              // Call logout API
              const res = await apiFetch('/auth/logout', { method: 'POST' }, 15000);
              
              // Clear local storage regardless of API response
              await AsyncStorage.multiRemove([
                'auth.accessToken',
                'auth.refreshToken',
                'auth.tokenIssuedAt',
                'user',
              ]);

              if (!res.ok) {
                const t = await res.text();
                const d = safeJson(t);
                console.log('Logout API warning:', d?.message || res.status);
              }

              // Navigate to login/welcome screen
              router.replace('/login&signup/login' as any);
            } catch (e: any) {
              console.log('Logout error:', e?.message || e);
              
              // Still clear local storage and redirect even if API fails
              await AsyncStorage.multiRemove([
                'auth.accessToken',
                'auth.refreshToken',
                'auth.tokenIssuedAt',
                'user',
              ]);
              
              router.replace('/login&signup/login' as any);
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleChangeAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please allow photo library access to change your avatar.'
        );
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
      fd.append('file', {
        uri: asset.uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);
      fd.append('type', 'avatar');

      const up = await apiFetch(
        '/profiles/upload-media',
        { method: 'POST', headers: {}, body: fd },
        30000
      );
      const upText = await up.text();
      const upData = safeJson(upText);

      if (!up.ok || !upData?.url) {
        throw new Error(upData?.message || `Upload failed (${up.status})`);
      }

      setAvatarUri(cacheBust(upData.url, Date.now()));
      await loadProfile();
    } catch (e: any) {
      console.log('Avatar update error', e);
      Alert.alert('Could not update avatar', e?.message || 'Unknown error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const displaySocials = useMemo(() => {
    const s = socialLinks || {};
    return Object.entries(s).filter(([, v]) => typeof v === 'string' && v.trim().length > 0);
  }, [socialLinks]);

  const platformPerformance = useMemo(() => {
    const breakdown = stats?.platformBreakdown || {};
    const s = socialLinks || {};
    
    // Get list of connected social platforms (ones with valid links)
    const connectedPlatforms = Object.entries(s)
      .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
      .map(([key]) => key.toLowerCase());
    
    console.log('Connected platforms:', connectedPlatforms);
    console.log('Platform breakdown keys:', Object.keys(breakdown));
    
    const platforms: Array<{
      key: string;
      name: string;
      icon: any;
      followers: number;
      engagement: number;
    }> = [];

    // Only process platforms that are both in breakdown AND connected
    connectedPlatforms.forEach((platformKey) => {
      // Check if we have stats for this platform (case-insensitive)
      const statsKey = Object.keys(breakdown).find(
        key => key.toLowerCase() === platformKey
      );
      
      if (statsKey && SOCIAL_ICONS[platformKey]) {
        const data = breakdown[statsKey];
        platforms.push({
          key: platformKey,
          name: platformKey.toUpperCase(),
          icon: SOCIAL_ICONS[platformKey],
          followers: data.followers || 0,
          engagement: data.engagement || 0,
        });
      }
    });
    
    console.log('Filtered platforms to show:', platforms);

    return platforms;
  }, [stats, socialLinks]);

  const totalFollowers = stats?.totalFollowers ?? 0;
  const avgEng = stats?.avgEngagement ?? 0;
  const nicheCount = niches.length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>HyperBuds</Text>

        <TouchableOpacity
          style={styles.headerMenu}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Card - Left-aligned with Bio */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            {/* Avatar */}
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleChangeAvatar}
              activeOpacity={0.85}
            >
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

            {/* Bio Section */}
            <View style={styles.bioSection}>
              <Text style={styles.bioLabel}>Bio</Text>
              <Text style={styles.bioText} numberOfLines={4}>
                {bio || 'No bio yet. Tell us about yourself!'}
              </Text>
            </View>
          </View>

          {/* Name and Handle - Left aligned */}
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>
              {loadingProfile ? 'Loading…' : displayName || 'User'}
            </Text>
            <Text style={styles.username}>{handle || ''}</Text>

            {/* Meta Info Row */}
            <View style={styles.metaInfoRow}>
              <View style={styles.metaInfoItem}>
                <Feather name="edit" size={16} color="#6B7280" />
                <Text style={styles.metaInfoText}>Joined Oct. 8, 2025</Text>
              </View>
              <View style={styles.metaInfoItem}>
                <Ionicons name="people-outline" size={16} color="#10B981" />
                <Text style={styles.metaInfoPublic}>Public Profile</Text>
              </View>
            </View>

            {/* Location */}
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.locationText}>Ibadan, Oyo, Nigeria</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.getMatchButton} activeOpacity={0.9}>
              <LinearGradient
                colors={['#7C3AED', '#3B82F6']} // purple -> blue gradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.getMatchGradient}
              >
                <Ionicons name="person-add" size={18} color="#fff" />
                <Text style={styles.getMatchText}>Get Match</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => router.push('/profile/editprofile')}
              activeOpacity={0.9}
            >
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid - Updated Design */}
        <View style={styles.statsGrid}>
          {/* Total Followers Card */}
          <View style={styles.statCard}>
            <View style={styles.statIconBadge}>
              <Ionicons name="people" size={20} color="#3B82F6" />
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>+12%</Text>
            </View>
            <Text style={styles.statNumber}>{formatK(totalFollowers)}</Text>
            <Text style={styles.statLabel}>Total Followers</Text>
          </View>

          {/* Engagement Rate Card */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="trending-up" size={20} color="#10B981" />
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>+5%</Text>
            </View>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>
              {Number.isFinite(avgEng) ? `${avgEng.toFixed(1)}%` : '0%'}
            </Text>
            <Text style={styles.statLabel}>Engagement Rate</Text>
          </View>

          {/* Rizz Score Card - Now Pressable */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/profile/rizzscore')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconBadge, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="flash" size={20} color="#A78BFA" />
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>+8%</Text>
            </View>
            <Text style={[styles.statNumber, { color: '#7C3AED' }]}>
              {rizzScore}
            </Text>
            <Text style={styles.statLabel}>Rizz Score</Text>
          </TouchableOpacity>

          {/* Niches Card */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="pricetags" size={20} color="#EF4444" />
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>+12%</Text>
            </View>
            <Text style={[styles.statNumber, { color: '#EF4444' }]}>
              {nicheCount}
            </Text>
            <Text style={styles.statLabel}>Niches</Text>
          </View>
        </View>

        {/* Content Specialization */}
        <Text style={styles.sectionTitle}>Content Specialization</Text>
        <View style={styles.pillWrap}>
          {(niches && niches.length > 0
            ? niches
            : ['#lifestyle', '#tech', '#music', '#gaming']
          ).map((t, i) => (
            <View key={i} style={styles.pill}>
              <Text style={styles.pillText}>{t.startsWith('#') ? t : `#${t}`}</Text>
            </View>
          ))}
        </View>

        {/* Social Media */}
        <Text style={styles.sectionTitle}>Social Media</Text>
        <View style={{ marginBottom: 18 }}>
          {displaySocials.length ? (
            displaySocials.map(([key, value]) => {
              const icon = SOCIAL_ICONS[key] || null;
              const bgColor =
                key === 'instagram'
                  ? '#fdf2f8'
                  : key === 'twitter'
                  ? '#E8F0FF'
                  : key === 'tiktok'
                  ? '#0f172a'
                  : key === 'youtube'
                  ? '#fff0f0'
                  : '#f5f5f5';
              const textColor = key === 'tiktok' ? '#fff' : '#111';

              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.socialRow, { backgroundColor: bgColor }]}
                  onPress={() => openUrl(value)}
                >
                  <View style={styles.socialLeft}>
                    {icon ? (
                      <Image source={icon} style={styles.socialIconImg} />
                    ) : (
                      <Ionicons name="share-social-outline" size={20} />
                    )}
                    <Text style={[styles.socialPlatform, { color: textColor }]}>
                      {key.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.socialRight}>
                    <Text numberOfLines={1} style={[styles.socialLinkText, { color: textColor }]}>
                      {value}
                    </Text>
                    <Ionicons name="open-outline" size={18} color={textColor} />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={{ fontSize: 12, color: '#666' }}>No socials linked</Text>
          )}
        </View>

        {/* Platform Performance */}
        <Text style={styles.sectionTitle}>Platform Performance</Text>
        {platformPerformance.length > 0 ? (
          platformPerformance.map((platform) => (
            <View key={platform.key} style={styles.platformCard}>
              <View style={styles.platformHeader}>
                <Image source={platform.icon} style={styles.platformIcon} />
                <Text style={styles.platformTitle}>{platform.name}</Text>
              </View>
              <View style={styles.platformBody}>
                <View style={styles.platformStat}>
                  <Text style={styles.platformStatNum}>{formatK(platform.followers)}</Text>
                  <Text style={styles.platformStatLabel}>Followers</Text>
                </View>
                <View style={styles.platformStat}>
                  <Text style={styles.platformStatNum}>
                    {Number.isFinite(platform.engagement)
                      ? `${platform.engagement}%`
                      : '0%'}
                  </Text>
                  <Text style={styles.platformStatLabel}>Engagement</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.platformCard}>
            <Text style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>
              Connect social media accounts to see platform performance
            </Text>
          </View>
        )}

        {/* Upgrade */}
        <Link href={PAYMENTS_HREF} asChild>
          <TouchableOpacity style={styles.upgradeButton}>
            <LinearGradient
              colors={['#3B82F6', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeGradient}
            >
              <Feather name="credit-card" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.upgradeText}>Upgrade to Premium</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Link>
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
  safe: { flex: 1, backgroundColor: '#f6f7fb' },
  header: {
    height: 56,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  headerMenu: { position: 'absolute', right: 18 },
  headerBack: { position: 'absolute', left: 18, padding: 6 },
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  
  // Profile Card Design - Left aligned
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  profileTopRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bioSection: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  bioLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  profileInfo: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  metaInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaInfoText: {
    fontSize: 13,
    color: '#6B7280',
  },
  metaInfoPublic: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  getMatchButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  getMatchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  getMatchText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  editProfileButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
  },

  // Updated Stats Grid Design
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 16 * 2 - 12) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: 'relative',
  },
  statIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Sections
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 12, 
    marginTop: 4,
    color: '#111' 
  },
  pillWrap: { flexDirection:'row', flexWrap: 'wrap', marginBottom: 24 },
  pill: {
    backgroundColor: '#eef2ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: { fontSize: 12, fontWeight: '600', color: '#4338ca' },
  
  // Social Media
  socialRow: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  socialLeft: { flexDirection: 'row', alignItems: 'center' },
  socialIconImg: { width: 26, height: 26, marginRight: 10, resizeMode: 'contain' },
  socialPlatform: { fontSize: 12, fontWeight: '700' },
  socialRight: { flexDirection: 'row', alignItems: 'center', maxWidth: width * 0.55 },
  socialLinkText: { fontSize: 12, marginRight: 6 },
  
  // Platform Performance
  platformCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 1,
  },
  platformHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  platformIcon: { width: 22, height: 22, resizeMode: 'contain', marginRight: 8 },
  platformTitle: { fontSize: 13, fontWeight: '800', color: '#1f2937' },
  platformBody: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6 },
  platformStat: { alignItems: 'center', flex: 1 },
  platformStatNum: { fontSize: 18, fontWeight: '700' },
  platformStatLabel: { fontSize: 12, color: '#6b7280' },
  
  // Upgrade Button
  upgradeButton: { marginTop: 6, borderRadius: 10, overflow: 'hidden' },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  upgradeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});