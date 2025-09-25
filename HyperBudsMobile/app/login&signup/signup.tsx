// app/login&signup/signup.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const screenOptions = { headerShown: false };

/** Official backend (Render). Override via EXPO_PUBLIC_API_BASE_URL if needed. */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim() ||
  'https://api-hyperbuds-backend.onrender.com/api/v1';

/* ------------------------------ Helpers ------------------------------ */

const safeJson = (t: string) => { try { return t ? JSON.parse(t) : {}; } catch { return {}; } };

const fetchWithTimeout = (url: string, options: RequestInit = {}, ms = 60000) =>
  Promise.race([
    fetch(url, options),
    new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('Request timeout')), ms)),
  ]) as Promise<Response>;

/**
 * IMPORTANT: Do NOT retry POST /auth/register unless the server supports idempotency keys.
 * We'll keep a generic withRetry for non-creating operations.
 */
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
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

const extractRegisterError = (status: number, payload: any) => {
  if (payload?.message) return payload.message;
  if (status === 409) return 'Email already in use.';
  if (status === 400) return 'Invalid signup data.';
  return 'Signup failed. Please try again.';
};

/* ----------------------- Idempotency + Pending Guard ----------------------- */

const PENDING_KEY_PREFIX = 'signup:pending:';

const genIdempotencyKey = () =>
  `hb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/** Save a short-lived pending marker so we can "optimistic proceed" on timeouts. */
async function setPendingSignup(email: string, idKey: string) {
  const key = `${PENDING_KEY_PREFIX}${email.toLowerCase()}`;
  const value = JSON.stringify({ idKey, ts: Date.now() });
  await AsyncStorage.setItem(key, value);
}

async function clearPendingSignup(email: string) {
  const key = `${PENDING_KEY_PREFIX}${email.toLowerCase()}`;
  await AsyncStorage.removeItem(key);
}

async function getPendingSignup(email: string): Promise<{ idKey: string; ts: number } | null> {
  const key = `${PENDING_KEY_PREFIX}${email.toLowerCase()}`;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.ts === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

/* ------------------------------ Component ------------------------------ */

export default function SignupScreen() {
  const router = useRouter();

  // Removed username & phone
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    if (!email.includes('@')) return 'Enter a valid email';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password !== confirm) return 'Passwords do not match';
    return null;
  };

  // Send verification email (safe to retry)
  const sendVerificationEmail = async (address: string) => {
    const res = await withRetry(async () => {
      return await fetchWithTimeout(
        `${API_BASE}/auth/verify-email/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email: address }),
        },
        30000
      );
    }, 2);

    if (!res.ok) {
      const text = await res.text();
      const data = safeJson(text);
      throw new Error(data?.message || `Failed to send verification email (${res.status}).`);
    }
  };

  // Navigate to verify screen
  const goToVerify = (address: string, banner?: string) => {
    router.push({
      pathname: '/login&signup/verifyemail',
      params: { email: address, ...(banner ? { banner } : {}) },
    });
  };

  const handleSignup = async () => {
    const v = validate();
    if (v) { setError(v); return; }

    if (loading) return;

    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const idemKey = genIdempotencyKey();

    try {
      await setPendingSignup(trimmedEmail, idemKey);

      // 1) Register (NO RETRY)
      const regRes = await fetchWithTimeout(
        `${API_BASE}/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Idempotency-Key': idemKey,
            'X-Client-Timestamp': String(Date.now()),
          },
          body: JSON.stringify({ email: trimmedEmail, password }),
        },
        60000
      );

      const regText = await regRes.text();
      const regData = safeJson(regText);

      if (!regRes.ok) {
        if (regRes.status === 409) {
          try {
            await sendVerificationEmail(trimmedEmail);
            goToVerify(
              trimmedEmail,
              'We found an existing signup for this email. Check your inbox for the verification link.'
            );
          } catch (e: any) {
            setError('Email already in use. If you just signed up, check your inbox for a verification link—or try logging in.');
          }
          return;
        }

        setError(extractRegisterError(regRes.status, regData));
        return;
      }

      // 2) Send verification email (best-effort)
      try {
        await sendVerificationEmail(trimmedEmail);
      } catch (e: any) {
        setError(e?.message || 'Could not send verification email right now. You can retry on the next screen.');
      }

      // 3) Go to verify
      goToVerify(trimmedEmail);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (
        msg === 'Request timeout' ||
        msg.includes('Network request failed') ||
        msg.includes('Failed to fetch') ||
        msg.includes('Network')
      ) {
        try {
          const pending = await getPendingSignup(trimmedEmail);
          if (pending && Date.now() - pending.ts < 2 * 60 * 1000) {
            await sendVerificationEmail(trimmedEmail);
            goToVerify(trimmedEmail, 'Your signup may have completed. Check your email for the verification link.');
            return;
          }
        } catch {}
        setError('Request timed out. The server may be cold-starting — please try again.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
      await clearPendingSignup(trimmedEmail);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/signup.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <Text style={styles.title}>Sign Up</Text>

            <View style={styles.formWrapper}>
              {/* Email */}
              <View style={styles.inputField}>
                <Feather name="mail" size={20} color="#aaa" style={styles.inputIcon} />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#aaa"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Password */}
              <View style={styles.inputField}>
                <Feather name="lock" size={20} color="#aaa" style={styles.inputIcon} />
                <TextInput
                  placeholder="Password (min 8 chars)"
                  placeholderTextColor="#aaa"
                  secureTextEntry={!showPassword}
                  style={[styles.input, { paddingRight: 40 }]}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={styles.eyeButton}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#555" />
                </TouchableOpacity>
              </View>

              {/* Confirm */}
              <View style={styles.inputField}>
                <Feather name="lock" size={20} color="#aaa" style={styles.inputIcon} />
                <TextInput
                  placeholder="Confirm Password"
                  placeholderTextColor="#aaa"
                  secureTextEntry={!showConfirm}
                  style={[styles.input, { paddingRight: 40 }]}
                  value={confirm}
                  onChangeText={setConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm((c) => !c)} style={styles.eyeButton}>
                  <Feather name={showConfirm ? 'eye-off' : 'eye'} size={20} color="#555" />
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity style={styles.signupButton} onPress={handleSignup} disabled={loading}>
                <LinearGradient
                  colors={['#3B82F6', '#9333EA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signupText}>Sign Up</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.loginPrompt}>
                Already have an account?{' '}
                <Text style={styles.loginLink} onPress={() => router.replace('/login&signup/login')}>
                  Log In
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

/* ------------------------------- Styles ------------------------------- */

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  title: {
    fontSize: 42,
    fontWeight: '700',
    color: '#9333EA',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 60,
  },

  formWrapper: { marginTop: 6 },

  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
    width: '90%',
    alignSelf: 'center',
    position: 'relative',
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#000' },
  eyeButton: { position: 'absolute', right: 12, padding: 4 },

  signupButton: { borderRadius: 12, overflow: 'hidden', marginBottom: 15, alignSelf: 'center' },
  gradientButton: { paddingVertical: 16, paddingHorizontal: 70, alignItems: 'center', borderRadius: 12 },
  signupText: { color: '#fff', fontSize: 18, fontWeight: '600' },

  loginPrompt: { textAlign: 'center', fontSize: 14, marginBottom: 15 },
  loginLink: { color: '#6A0DAD', fontWeight: '600' },

  error: { color: 'crimson', textAlign: 'center', marginBottom: 12 },
});
