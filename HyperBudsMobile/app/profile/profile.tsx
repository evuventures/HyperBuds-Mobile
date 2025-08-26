// app/registration/buildprofile.tsx  (your "profile" screen)
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { auth as firebaseAuth } from '../../src/firebase';
import { updateProfile } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const { width } = Dimensions.get('window');

// Local fallback avatar
const defaultAvatar = require('../../assets/images/avatar.png');

// Prefer env var; fallback to local dev server
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.0.119:3000';

type ProfileResponse = {
  id?: string;
  username?: string;
  email?: string;
  avatar?: string;      // local backend field
  avatarUrl?: string;   // some backends use this
  bio?: string;
  niches?: string[];
  purposes?: string[];
  collabs?: string[];
  socials?: Record<string, string>;
};

export default function BuildProfile() {
  const router = useRouter();

  const [username, setUsername] = useState<string>('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

  // Profile data from your API
  const [bio, setBio] = useState<string>('');
  const [niches, setNiches] = useState<string[]>([]);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [collabs, setCollabs] = useState<string[]>([]);
  const [socials, setSocials] = useState<Record<string, string>>({});

  // Load profile (username + avatar + bio + niches …) from API / Firebase
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const user = firebaseAuth.currentUser;
        if (!user) throw new Error('Not signed in');

        const nameFallback = user.displayName || user.email?.split('@')[0] || 'user';

        // Try API: GET /profiles/me (no auth on your local dev server)
        try {
          const res = await fetch(`${API_BASE}/profiles/me`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });

          if (res.ok) {
            const data: ProfileResponse = await res.json();

            if (!isMounted) return;
            setUsername((data.username || '').trim() || nameFallback);
            setAvatarUri(data.avatarUrl || data.avatar || user.photoURL || undefined);
            setBio(data.bio || '');
            setNiches(Array.isArray(data.niches) ? data.niches : []);
            setPurposes(Array.isArray(data.purposes) ? data.purposes : []);
            setCollabs(Array.isArray(data.collabs) ? data.collabs : []);
            setSocials(data.socials || {});
            return;
          }
        } catch {
          // swallow and fall back
        }

        // Fallback: Firebase only
        if (!isMounted) return;
        setUsername(nameFallback);
        setAvatarUri(user.photoURL || undefined);
        setBio('');
        setNiches([]);
      } catch {
        // Silent fail → show whatever Firebase has
        const user = firebaseAuth.currentUser;
        if (user && isMounted) {
          const nameFallback = user.displayName || user.email?.split('@')[0] || 'user';
          setUsername(nameFallback);
          setAvatarUri(user.photoURL || undefined);
        }
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

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

      const asset = result.assets[0];
      const user = firebaseAuth.currentUser;
      if (!user) throw new Error('Not signed in');

      setUploadingAvatar(true);

      // Upload to Firebase Storage
      const storage = getStorage(firebaseAuth.app);
      const storageRef = ref(storage, `avatars/${user.uid}.jpg`);
      const resp = await fetch(asset.uri);
      const blob = await resp.blob();
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      // Update Firebase Auth photoURL for immediate display
      await updateProfile(user, { photoURL: url });
      setAvatarUri(url);

      // Also persist to your backend profile (supports either "avatar" or "avatarUrl")
      try {
        await fetch(`${API_BASE}/profiles/me`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: url, avatarUrl: url }),
        });
      } catch {
        // non-fatal in dev
      }
    } catch (e: any) {
      console.log('Avatar update error', e);
      Alert.alert('Could not update avatar', e?.message || 'Unknown error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleText = username
    ? username.startsWith('@')
      ? username
      : `@${username}`
    : 'Username';

  // ⬇️ Only show socials that aren’t blank
  const displaySocials = Object.entries(socials || {}).filter(
    ([, v]) => typeof v === 'string' && v.trim().length > 0
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Banner Placeholder (unchanged) */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerPlaceholder} />
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Avatar (unchanged) */}
        <TouchableOpacity style={styles.avatar} activeOpacity={0.85} onPress={handleChangeAvatar}>
          <Image
            source={avatarUri ? { uri: avatarUri } : defaultAvatar}
            style={styles.avatarImage}
            resizeMode="cover"
          />
          {uploadingAvatar && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Username & Role (unchanged) */}
        <Text style={styles.username}>{loadingProfile ? 'Loading…' : handleText}</Text>
        <Text style={styles.role}>Influencer & Market Strategist</Text>

        {/* Stats Row (unchanged) */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statCount}>12K</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statCount}>24</Text>
            <Text style={styles.statLabel}>Collaborations</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statCount}>200</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Buttons (unchanged) */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              console.log('Navigating to /registration/buildprofile');
              router.push('/registration/buildprofile');
            }}
          >
            <LinearGradient
              colors={['#3B82F6', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.editGradient}
            >
              <Text style={styles.editText}>Build Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton}>
            <LinearGradient
              colors={['#3B82F6', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.editGradient}
            >
              <Text style={styles.editText}>Edit Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/profile/settings')}
          >
            <Ionicons name="settings-outline" size={24} color="#9333EA" />
          </TouchableOpacity>
        </View>

        {/* About Me (bio from API) */}
        <Text style={styles.sectionTitle}>About Me</Text>
        <Text style={styles.bio}>{bio?.trim() ? bio : 'No bio yet'}</Text>

        {/* Collaboration Card (unchanged) */}
        <Text style={styles.sectionTitle}>Collaboration</Text>
        <View style={styles.card}>
          <View style={styles.cardImagePlaceholder} />
          <Text style={styles.cardTitle}>Andy & Sam Podcast: Time to Learn the Art of Makeup</Text>
          <Text style={styles.cardSubtitle}>Lorem ipsum dolor sit amet, consectetur adipiscing elit...</Text>
          <View style={styles.postFooter}>
            <View style={styles.authorRow}>
              <View style={styles.avatarSmall} />
              <View style={styles.avatarSmall} />
              <View className="authorTextWrapper" style={styles.authorTextWrapper}>
                <Text style={styles.postAuthor}>Tom & Mon</Text>
                <Text style={styles.postSubauthor}>Podcast | Podcast</Text>
              </View>
            </View>
            <View style={styles.statsRowSmall}>
              <View style={styles.viewersPill}>
                <Text style={styles.viewersCountSmall}>12K</Text>
                <Text style={styles.viewersLabelSmall}>Viewers</Text>
              </View>
              <Ionicons name="flame" size={16} color="red" />
              <Text style={styles.statTextSmall}>5K</Text>
              <Ionicons name="share-social" size={16} color="green" />
              <Text style={styles.statTextSmall}>400</Text>
            </View>
          </View>
        </View>

        {/* Niches Tags (API niches) */}
        <Text style={styles.sectionTitle}>Niches</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagRow}
        >
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

        {/* TEMP: Other info section at the very bottom */}
        <Text style={styles.sectionTitle}>More From Your Profile (temp)</Text>
        <Text style={styles.bio}>
          <Text style={{ fontWeight: '600' }}>Purposes:</Text>{' '}
          {purposes?.length ? purposes.join(', ') : 'None'}
        </Text>
        <Text style={styles.bio}>
          <Text style={{ fontWeight: '600' }}>Collabs:</Text>{' '}
          {collabs?.length ? collabs.join(', ') : 'None'}
        </Text>
        <Text style={styles.bio}>
          <Text style={{ fontWeight: '600' }}>Socials:</Text>{' '}
          {displaySocials.length
            ? displaySocials.map(([k, v]) => `${k}: ${v}`).join('  •  ')
            : 'None'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 40 },

  bannerContainer: { width: width - 40, height: 180, borderRadius: 20, overflow: 'hidden', marginBottom: -70, alignSelf: 'center' },
  bannerPlaceholder: { flex: 1, backgroundColor: '#ddd' },
  backButton: { position: 'absolute', top: 10, left: 10 },

  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#fff', backgroundColor: '#ddd', alignSelf: 'center', marginTop: -60, marginBottom: 10, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },

  username: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  role: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 10 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statCount: { fontSize: 16, fontWeight: '600' },
  statLabel: { fontSize: 12, color: '#666' },

  buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  editButton: { flex: 1, marginHorizontal: 5, borderRadius: 10, overflow: 'hidden' },
  editGradient: { paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  editText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  settingsButton: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#9333EA' },

  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },

  bio: { fontSize: 14, color: '#333', marginBottom: 20 },

  card: { backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden', marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  cardImagePlaceholder: { width: '100%', height: 180, backgroundColor: '#ddd' },
  cardTitle: { fontSize: 16, fontWeight: '600', margin: 10 },
  cardSubtitle: { fontSize: 12, color: '#666', marginHorizontal: 10, marginBottom: 10 },

  postFooter: { paddingHorizontal: 10, paddingBottom: 10 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd', marginRight: -10, borderWidth: 2, borderColor: '#9333EA' },
  authorTextWrapper: { marginLeft: 10 },
  postAuthor: { fontSize: 14, fontWeight: '600' },
  postSubauthor: { fontSize: 12, color: '#666' },

  statsRowSmall: { flexDirection: 'row', alignItems: 'center' },
  viewersPill: { flexDirection: 'row', backgroundColor: '#000', borderRadius: 20, padding: 6, marginRight: 10 },
  viewersCountSmall: { color: '#fff', fontSize: 12, fontWeight: '600', marginRight: 4 },
  viewersLabelSmall: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statTextSmall: { fontSize: 12, marginHorizontal: 4 },

  tagRow: { paddingVertical: 10 },
  tag: { backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 6, marginRight: 10 },
  tagText: { fontSize: 12, color: '#333' },
});
