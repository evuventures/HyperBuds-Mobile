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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const screenOptions = { headerShown: false };

/** Official backend (Render). Override via EXPO_PUBLIC_API_BASE_URL if needed. */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim() ||
  'https://api-hyperbuds-backend.onrender.com/api/v1';

const safeJson = (t: string) => { try { return t ? JSON.parse(t) : {}; } catch { return {}; } };

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
      const delay = (transient ? baseDelayMs * Math.pow(2, attempt - 1) : 300) + Math.floor(Math.random() * 250);
      await new Promise(r => setTimeout(r, delay));
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
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string>('');

  // Pull pendingSignup.* from storage if not provided
  useEffect(() => {
    (async () => {
      try {
        if (!email) {
          const storedEmail = await AsyncStorage.getItem('pendingSignup.email');
          if (storedEmail) setEmail(storedEmail);
        }
        const e = await AsyncStorage.getItem('pendingSignup.email');
        if (e) setHint(maskEmail(e));
      } catch {}
    })();
  }, []);

  const maskEmail = (addr?: string | null) => {
    if (!addr || !addr.includes('@')) return addr || '';
    const [name, domain] = addr.split('@');
    const maskedName =
      name.length <= 2 ? name[0] + '*' : name[0] + '*'.repeat(Math.max(1, name.length - 2)) + name[name.length - 1];
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
        return await fetchWithTimeout(`${API_BASE}/auth/verify-email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email }),
        }, 30000);
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
      // Get the pending credentials saved at signup
      const storedEmail = email || (await AsyncStorage.getItem('pendingSignup.email'));
      const storedPassword = await AsyncStorage.getItem('pendingSignup.password');

      if (!storedEmail || !storedPassword) {
        throw new Error('We’re missing your signup credentials. Please log in manually.');
      }

      // Try to log in — if email is verified, this should now succeed
      const res = await withRetry(async () => {
        return await fetchWithTimeout(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email: storedEmail.trim(), password: storedPassword }),
        }, 30000);
      });

      const text = await res.text();
      const data = safeJson(text);
      if (!res.ok) {
        const msg = extractLoginError(res.status, data);
        // Keep UX clear: most common cause is "not verified yet"
        if (/verify/i.test(msg)) {
          throw new Error('It looks like your email is not verified yet. Please tap the link in the email, then press Continue here.');
        }
        throw new Error(msg);
      }

      const accessToken: string | undefined = data?.accessToken;
      const refreshToken: string | undefined = data?.refreshToken;
      const userObj: any = data?.user ?? {};
      if (!accessToken || !refreshToken) throw new Error('Malformed server response (missing tokens).');

      // Store session
      await AsyncStorage.multiSet([
        ['auth.accessToken', accessToken],
        ['auth.refreshToken', refreshToken],
        ['auth.tokenIssuedAt', String(Date.now())],
        ['user', JSON.stringify(userObj)],
        ['isLoggedIn', 'true'],
      ]);

      // Cleanup pending creds
      await AsyncStorage.multiRemove(['pendingSignup.email', 'pendingSignup.password']);

      // Go to onboarding
      router.replace('/registration/onboarding');
    } catch (e: any) {
      setError(e?.message || 'Could not confirm verification yet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background decorations */}
      <Image source={require('../../assets/images/circle1.png')} style={styles.leftcircleimage} />
      <Image source={require('../../assets/images/codeverifybottom.png')} style={styles.bottompoly} />
      <Image source={require('../../assets/images/codeverifyright.png')} style={styles.rightpoly} />

      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>Verify your{'\n'}email</Text>

      <Text style={styles.subtitle}>
        We’ve sent a verification link to{'\n'}
        <Text style={styles.emailStrong}>{hint || maskEmail(email)}</Text>
        {'\n\n'}
        Please open your email app, tap the link to verify, then return here and press Continue.
      </Text>

      {/* Continue */}
      <TouchableOpacity style={styles.primaryButton} onPress={continueAfterVerify} disabled={loading}>
        <LinearGradient colors={['#3B82F6', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Continue</Text>}
        </LinearGradient>
      </TouchableOpacity>

      {/* Resend */}
      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn’t get the email?</Text>
        <TouchableOpacity onPress={resendEmail} disabled={resending} style={{ paddingVertical: 6 }}>
          {resending ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.resendLink}>Resend verification email</Text>
          )}
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 24 },
  back: { position: 'absolute', top: Platform.select({ ios: 30, android: 16 }), left: 20 },
  title: {
    marginTop: 90,
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 48,
    color: '#A259FF',
    textAlign: 'center',
    letterSpacing: -1.0,
  },
  subtitle: { marginTop: 16, fontSize: 16, color: '#333', textAlign: 'center' },
  emailStrong: { fontWeight: '700', color: '#111' },

  primaryButton: { borderRadius: 12, overflow: 'hidden', marginTop: 24 },
  primaryGradient: { paddingVertical: 14, paddingHorizontal: 70, alignItems: 'center', borderRadius: 12 },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '600' },

  resendContainer: { marginTop: 18, alignItems: 'center' },
  resendText: { color: '#666', marginBottom: 4 },
  resendLink: { textDecorationLine: 'underline', fontWeight: '600', color: '#000' },

  error: { marginTop: 14, color: 'crimson', textAlign: 'center' },

  /* Decorative assets */
  leftcircleimage: { position: 'absolute', top: 0, left: -50, width: 250, height: 250, resizeMode: 'contain', zIndex: -1 },
  bottompoly: { position: 'absolute', bottom: -30, left: 80, width: 125, height: 125, resizeMode: 'contain', zIndex: -1 },
  rightpoly: { position: 'absolute', top: 250, right: -30, width: 100, height: 100, resizeMode: 'contain', zIndex: -1 },
});
