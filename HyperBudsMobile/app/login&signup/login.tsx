// app/login&signup/login.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/contexts/AuthContext';

// ✅ OAuth imports
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';

WebBrowser.maybeCompleteAuthSession();

export const screenOptions = { headerShown: false };

const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim() ||
  'https://api-hyperbuds-backend.onrender.com/api/v1';

const safeJson = (text: string) => {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
};

const fetchWithTimeout = (url: string, options: RequestInit = {}, ms = 30000) =>
  Promise.race([
    fetch(url, options),
    new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('Request timeout')), ms)),
  ]) as Promise<Response>;

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  baseDelayMs = 1200
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt > retries) throw err;
      const msg = String(err?.message || err);
      const shouldBackoff =
        msg.includes('timeout') ||
        msg.includes('Network request failed') ||
        msg.includes('Failed to fetch') ||
        msg.includes('Network');
      const delay =
        (shouldBackoff ? baseDelayMs * Math.pow(2, attempt - 1) : 0) +
        Math.floor(Math.random() * 300);
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    }
  }
}

const extractApiError = (status: number, payload: any) => {
  if (payload?.message) return payload.message;
  if (status === 401) return 'Invalid email or password.';
  if (status === 429) return 'Too many attempts. Please try again later.';
  return 'Login failed. Please try again.';
};

const looksLikeUnverified = (msg: string) => {
  const m = (msg || '').toLowerCase();
  return (
    m.includes('verify') ||
    m.includes('not verified') ||
    m.includes('unverified') ||
    m.includes('email is not verified')
  );
};

async function tryVerifyEmail(email: string) {
  const endpoints = [
    `${API_BASE}/auth/verify-email`,
    `${API_BASE}/auth/verfiy-email`,
  ];
  for (const ep of endpoints) {
    try {
      const r = await fetchWithTimeout(
        ep,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email }),
        },
        20000
      );
      if (r.ok) return true;
    } catch {}
  }
  return false;
}

export default function LoginScreen() {
  const router = useRouter();
  const { refresh } = useAuth?.() || { refresh: async () => {} };

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  });

  const [fbRequest, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: 'YOUR_FACEBOOK_APP_ID',
  });

  useEffect(() => {
    (async () => {
      const savedEmail = await AsyncStorage.getItem('rememberedEmail');
      if (savedEmail) {
        setIdentifier(savedEmail);
        setRememberMe(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (googleResponse?.type === 'success' && googleResponse.authentication?.accessToken) {
      handleGoogleLogin(googleResponse.authentication.accessToken);
    }
  }, [googleResponse]);

  useEffect(() => {
    if (fbResponse?.type === 'success' && fbResponse.authentication?.accessToken) {
      handleFacebookLogin(fbResponse.authentication.accessToken);
    }
  }, [fbResponse]);

  const handleGoogleLogin = async (accessToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken }),
      });
      if (!res.ok) throw new Error('Google sign-in failed');
      const data = await res.json();
      await AsyncStorage.multiSet([
        ['auth.accessToken', data.accessToken],
        ['auth.refreshToken', data.refreshToken],
        ['user', JSON.stringify(data.user)],
        ['isLoggedIn', 'true'],
      ]);
      await (refresh?.() ?? Promise.resolve());
      router.replace('/main/explore');
    } catch (e: any) {
      setError(e.message || 'Google login failed');
    }
  };

  const handleFacebookLogin = async (accessToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken }),
      });
      if (!res.ok) throw new Error('Facebook sign-in failed');
      const data = await res.json();
      await AsyncStorage.multiSet([
        ['auth.accessToken', data.accessToken],
        ['auth.refreshToken', data.refreshToken],
        ['user', JSON.stringify(data.user)],
        ['isLoggedIn', 'true'],
      ]);
      await (refresh?.() ?? Promise.resolve());
      router.replace('/main/explore');
    } catch (e: any) {
      setError(e.message || 'Facebook login failed');
    }
  };

  const performLogin = async (email: string, pwd: string) => {
    const res = await withRetry(async () => {
      return await fetchWithTimeout(
        `${API_BASE}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email, password: pwd }),
        },
        30000
      );
    }, 2, 1500);

    const text = await res.text();
    const data = safeJson(text);

    if (!res.ok) throw new Error(extractApiError(res.status, data));

    const accessToken = data?.accessToken;
    const refreshToken = data?.refreshToken;
    const userObj = data?.user ?? {};

    if (!accessToken || !refreshToken) throw new Error('Malformed server response: missing tokens.');

    await AsyncStorage.multiSet([
      ['auth.accessToken', accessToken],
      ['auth.refreshToken', refreshToken],
      ['auth.tokenIssuedAt', String(Date.now())],
      ['user', JSON.stringify(userObj)],
      ['isLoggedIn', 'true'],
    ]);

    return { user: userObj };
  };

  const onSubmit = async () => {
    if (!identifier || !password) {
      setError('Please enter email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    const email = identifier.trim();

    try {
      try {
        await performLogin(email, password);
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (looksLikeUnverified(msg)) {
          const verified = await tryVerifyEmail(email);
          if (!verified) throw new Error('Email not verified. Please check your inbox or contact support.');
          await performLogin(email, password);
        } else {
          throw e;
        }
      }

      if (rememberMe) await AsyncStorage.setItem('rememberedEmail', email);
      else await AsyncStorage.removeItem('rememberedEmail');

      await (refresh?.() ?? Promise.resolve());
      setLoading(false);
      router.replace('/main/explore');
    } catch (err: any) {
      const msg = String(err?.message || err);
      setError(
        msg === 'Request timeout'
          ? 'Request timed out. The server may be cold-starting — please try again.'
          : msg
      );
      setLoading(false);
    }
  };

  const quickLogin = async () => {
    setError(null);
    setLoading(true);
    const email = 'pipowek227@ncien.com';
    const pwd = 'tester123';
    try {
      await performLogin(email, pwd);
      await AsyncStorage.setItem('rememberedEmail', email);
      await (refresh?.() ?? Promise.resolve());
      setLoading(false);
      router.replace('/main/explore');
    } catch (err: any) {
      const msg = String(err?.message || err);
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/login.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.screenWrap}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>

          <MaskedView
            maskElement={<Text style={[styles.title, { backgroundColor: 'transparent' }]}>Log in</Text>}
          >
            <LinearGradient
              colors={['#A855F7', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: '100%', height: 44 }}
            />
          </MaskedView>

          <Text style={styles.subtitle}>Welcome Back!</Text>

          {/* ✅ SOCIAL LOGIN BUTTONS */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={[styles.socialBtn, styles.shadowedBox]}
              activeOpacity={0.85}
              disabled={!fbRequest}
              onPress={() => fbPromptAsync()}
            >
              <View style={styles.socialInner}>
                <FontAwesome5 name="facebook-f" size={18} color="#1877F2" />
                <Text style={styles.socialText}>Facebook</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialBtn, styles.shadowedBox]}
              activeOpacity={0.85}
              disabled={!googleRequest}
              onPress={() => promptGoogleAsync()}
            >
              <View style={styles.socialInner}>
                <FontAwesome5 name="google" size={18} color="#DB4437" />
                <Text style={styles.socialText}>Google</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>Or</Text>
            <View style={styles.orLine} />
          </View>

          {/* Email + Password fields */}
          <View style={[styles.inputField, styles.shadowedBox]}>
            <TextInput
              placeholder="Email"
              placeholderTextColor="#D3D3D3"
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          <View style={[styles.inputField, styles.shadowedBox]}>
            <TextInput
              placeholder="Password"
              placeholderTextColor="#D3D3D3"
              secureTextEntry={!showPassword}
              style={[styles.input, { paddingRight: 44 }]}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((p) => !p)}
              style={styles.eyeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.forgotRow}>
            <TouchableOpacity onPress={() => router.push('/login&signup/forgotpass')}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.signinBtn}
            onPress={onSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#A855F7', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signinGradient}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signinText}>Log in</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.smallActions}>
            <TouchableOpacity
              style={styles.quickLoginSmall}
              onPress={quickLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.quickLoginSmallText}>Dev</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.noAccount}>You don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/login&signup/signup')}>
              <Text style={styles.signupLink}> Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { ...StyleSheet.absoluteFillObject },
  safe: { flex: 1, backgroundColor: 'transparent' },
  screenWrap: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 120 : 160, // ⬆️ raised top padding to lower everything slightly
    backgroundColor: 'transparent',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 0 : 40,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  title: { fontSize: 34, fontWeight: '800', textAlign: 'center', marginBottom: 6, height: 44 },
  subtitle: { textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginTop: 10, marginBottom: 40 },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 50, // ⬆️ increased from 25 to lower buttons
    marginBottom: 20,
  },
  socialBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    marginHorizontal: 6,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  socialInner: { flexDirection: 'row', alignItems: 'center' },
  socialText: { marginLeft: 10, fontWeight: '600', color: '#111827' },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  orLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  orText: { marginHorizontal: 8, color: '#9CA3AF' },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: '#F7FAFF',
  },
  shadowedBox: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 10,
    elevation: 6,
  },
  input: { flex: 1, fontSize: 16, color: '#6B7280', fontWeight: '500' },
  forgotRow: { alignItems: 'flex-end', marginBottom: 6 },
  forgotText: { color: '#2563EB', fontWeight: '600' },
  errorText: { color: 'crimson', textAlign: 'center', marginVertical: 6 },
  signinBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  signinGradient: { paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
  signinText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  smallActions: { alignItems: 'flex-start', marginTop: 8 },
  quickLoginSmall: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  quickLoginSmallText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 14, alignItems: 'center' },
  noAccount: { color: '#6B7280' },
  signupLink: { color: '#6D28D9', fontWeight: '700' },
  eyeButton: {
    position: 'absolute',
    right: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
