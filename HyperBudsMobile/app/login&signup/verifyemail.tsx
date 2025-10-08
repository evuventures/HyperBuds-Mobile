// app/login&signup/verifyemail.tsx
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const screenOptions = { headerShown: false };

const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim() ||
  'https://api-hyperbuds-backend.onrender.com/api/v1';

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
    new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('Request timeout')), ms)),
  ]) as Promise<Response>;

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 1000): Promise<T> {
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
        (transient ? baseDelayMs * Math.pow(2, attempt - 1) : 300) + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

const extractLoginError = (status: number, payload: any) => {
  if (payload?.message) return payload.message;
  if (status === 401) return 'Invalid credentials or email not verified yet.';
  return 'Login failed.';
};

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState<string>(params?.email || '');
  const [hint, setHint] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasStoredPassword, setHasStoredPassword] = useState<boolean>(true);
  const [fallbackPw, setFallbackPw] = useState<string>('');
  const [showPw, setShowPw] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        let e = email;
        if (!e) {
          const storedEmail = await AsyncStorage.getItem('pendingSignup.email');
          if (storedEmail) e = storedEmail;
          if (storedEmail) setEmail(storedEmail);
        }
        if (e) setHint(maskEmail(e));

        const storedPassword = await AsyncStorage.getItem('pendingSignup.password');
        setHasStoredPassword(!!storedPassword);
      } catch {
        setHasStoredPassword(false);
      }
    })();
  }, []);

  const maskEmail = (addr?: string | null) => {
    if (!addr || !addr.includes('@')) return addr || '';
    const [name, domain] = addr.split('@');
    const maskedName =
      name.length <= 2
        ? name[0] + '*'
        : name[0] + '*'.repeat(Math.max(1, name.length - 2)) + name[name.length - 1];
    return `${maskedName}@${domain}`;
  };

  const resendEmail = async () => {
    if (!email) {
      Alert.alert('Missing email', 'We do not have your email on file. Please go back and sign up again.');
      return;
    }
    setResending(true);
    setError(null);
    try {
      const r = await withRetry(async () => {
        return await fetchWithTimeout(
          `${API_BASE}/auth/verify-email/send`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ email }),
          },
          30000
        );
      });
      if (!r.ok) {
        const t = await r.text();
        const d = safeJson(t);
        throw new Error(d?.message || `Failed to send verification email (${r.status}).`);
      }
      Alert.alert('Email sent', 'We’ve sent another verification email. Please check your inbox.');
    } catch (e: any) {
      setError(e?.message || 'Could not resend verification email.');
    } finally {
      setResending(false);
    }
  };

  const continueAfterVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const storedEmail =
        email?.trim() || (await AsyncStorage.getItem('pendingSignup.email')) || '';
      const storedPassword = await AsyncStorage.getItem('pendingSignup.password');
      const passwordToUse = storedPassword || fallbackPw;

      if (!storedEmail || !passwordToUse) {
        throw new Error(
          'We’re missing your signup credentials. Please enter your password below or log in manually.'
        );
      }

      const res = await withRetry(async () => {
        return await fetchWithTimeout(
          `${API_BASE}/auth/login`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ email: storedEmail.trim(), password: passwordToUse }),
          },
          30000
        );
      });

      const text = await res.text();
      const data = safeJson(text);
      if (!res.ok) {
        const msg = extractLoginError(res.status, data);
        if (/verify/i.test(msg)) {
          throw new Error(
            'It looks like your email is not verified yet. Please tap the link in the email, then press Continue here.'
          );
        }
        throw new Error(msg);
      }

      const accessToken: string | undefined = data?.accessToken;
      const refreshToken: string | undefined = data?.refreshToken;
      const userObj: any = data?.user ?? {};
      if (!accessToken || !refreshToken) throw new Error('Malformed server response (missing tokens).');

      await AsyncStorage.multiSet([
        ['auth.accessToken', accessToken],
        ['auth.refreshToken', refreshToken],
        ['auth.tokenIssuedAt', String(Date.now())],
        ['user', JSON.stringify(userObj)],
        ['isLoggedIn', 'true'],
      ]);

      await AsyncStorage.multiRemove(['pendingSignup.email', 'pendingSignup.password']);
      router.replace('/registration/onboarding');
    } catch (e: any) {
      setError(e?.message || 'Could not confirm verification yet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative background */}
      <Image source={require('../../assets/images/circle1.png')} style={styles.leftcircleimage} />
      <Image source={require('../../assets/images/codeverifybottom.png')} style={styles.bottompoly} />
      <Image source={require('../../assets/images/codeverifyright.png')} style={styles.rightpoly} />

      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      {/* Main scrollable content with unified side margins */}
      <ScrollView
        contentContainerStyle={styles.contentWrapper}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Verify your email</Text>

        <Text style={styles.subtitle}>
          We’ve sent a verification link to{'\n'}
          <Text style={styles.emailStrong}>{hint || maskEmail(email)}</Text>
          {'\n\n'}
          Please open your email app, tap the link to verify, then return here and press Continue.
        </Text>

        {!hasStoredPassword && (
          <View style={{ width: '100%', marginTop: 12 }}>
            <Text style={{ marginBottom: 6, color: '#111', fontWeight: '600' }}>
              Enter your password to continue
            </Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={fallbackPw}
                onChangeText={setFallbackPw}
                secureTextEntry={!showPw}
                placeholder="Password"
                placeholderTextColor="#999"
                autoCapitalize="none"
                style={styles.passwordInput}
              />
              <TouchableOpacity
                onPress={() => setShowPw((s) => !s)}
                style={styles.eyeBtn}
                accessibilityRole="button"
              >
                <Ionicons name={showPw ? 'eye-off' : 'eye'} size={20} color="#555" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={continueAfterVerify}
          disabled={loading}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#8B5CF6', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryGradient}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Continue</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn’t get the email?</Text>
          <TouchableOpacity onPress={resendEmail} disabled={resending} style={{ paddingVertical: 6 }}>
            {resending ? <ActivityIndicator /> : <Text style={styles.resendLink}>Resend verification email</Text>}
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  back: { position: 'absolute', top: Platform.select({ ios: 30, android: 16 }), left: 24 },

  contentWrapper: {
    paddingHorizontal: 15, // ⬅️ increased side margins for all content
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 60,
  },

  title: {
    fontSize: 28, // bigger title
    fontWeight: '800',
    color: '#6D28D9',
    textAlign: 'center',
    marginBottom: 14,
  },
  subtitle: { fontSize: 15, color: '#333', textAlign: 'center', lineHeight: 22, marginBottom: 10 },
  emailStrong: { fontWeight: '700', color: '#111' },

  primaryButton: {
    marginTop: 24,
    width: '100%',
    borderRadius: 12,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  primaryGradient: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  resendContainer: { marginTop: 20, alignItems: 'center' },
  resendText: { color: '#666', marginBottom: 4 },
  resendLink: { textDecorationLine: 'underline', fontWeight: '600', color: '#111' },

  error: { marginTop: 14, color: 'crimson', textAlign: 'center' },

  leftcircleimage: {
    position: 'absolute',
    top: 0,
    left: -50,
    width: 250,
    height: 250,
    resizeMode: 'contain',
    zIndex: -1,
  },
  bottompoly: {
    position: 'absolute',
    bottom: -30,
    left: 80,
    width: 125,
    height: 125,
    resizeMode: 'contain',
    zIndex: -1,
  },
  rightpoly: {
    position: 'absolute',
    top: 250,
    right: -30,
    width: 100,
    height: 100,
    resizeMode: 'contain',
    zIndex: -1,
  },

  passwordRow: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
  },
  eyeBtn: {
    padding: 8,
  },
});
