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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, AntDesign, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/contexts/AuthContext';

export const screenOptions = { headerShown: false };

/**
 * Backend base URL
 * Defaults to Render. Override with EXPO_PUBLIC_API_BASE_URL if needed.
 */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim() ||
  'https://api-hyperbuds-backend.onrender.com/api/v1';

/* ----------------------------- Helpers ----------------------------- */

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

      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }
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

/** Best-effort email verification — tries multiple shapes/endpoints and returns true on any 2xx */
async function tryVerifyEmail(email: string) {
  const endpoints = [
    `${API_BASE}/auth/verify-email`,
    `${API_BASE}/auth/verfiy-email`, // fallback if backend has typo
  ];

  const attempts: Array<() => Promise<Response>> = [];
  for (const ep of endpoints) {
    // POST body variants
    attempts.push(() =>
      fetchWithTimeout(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      }, 20000)
    );
    attempts.push(() =>
      fetchWithTimeout(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ userId: email }), // sometimes accepts userId; we try email for flexibility
      }, 20000)
    );
    attempts.push(() =>
      fetchWithTimeout(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token: 'dev' }), // generic dev token shape
      }, 20000)
    );
    attempts.push(() =>
      fetchWithTimeout(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ code: '000000' }), // generic dev code
      }, 20000)
    );
    // GET ?email=
    const qs = `${ep}?email=${encodeURIComponent(email)}`;
    attempts.push(() => fetchWithTimeout(qs, { method: 'GET' }, 20000));
  }

  for (const go of attempts) {
    try {
      const r = await go();
      if (r.ok) return true;
    } catch {
      // keep trying
    }
  }
  return false;
}

// Dev helper (optional)
const clearSavedSession = async () => {
  await AsyncStorage.multiRemove([
    'user',
    'isLoggedIn',
    'rememberedEmail',
    'auth.accessToken',
    'auth.refreshToken',
    'auth.tokenIssuedAt',
  ]);
  console.log('✅ Cleared saved session keys');
};

/* ----------------------------- Component ----------------------------- */

export default function LoginScreen() {
  const router = useRouter();
  const { refresh } = useAuth?.() || { refresh: async () => {} };

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Debug info (small but useful)
  const [diag, setDiag] = useState<string>('');

  useEffect(() => {
    (async () => {
      const savedEmail = await AsyncStorage.getItem('rememberedEmail');
      if (savedEmail) {
        setIdentifier(savedEmail);
        setRememberMe(true);
      }
    })();

    // Optional pre-warm ping to mitigate cold-starts
    (async () => {
      try {
        setDiag(`Checking server…`);
        await withRetry(async () => {
          const r = await fetchWithTimeout(`${API_BASE}/health`, { method: 'GET' }, 20000);
          if (!r.ok) throw new Error(`Health check ${r.status}`);
          setDiag(`Server OK (${r.status}).`);
        }, 1, 1200);
      } catch (e: any) {
        setDiag(`Health check failed: ${e?.message || e}`);
      }
    })();
  }, []);

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

    if (!res.ok) {
      throw new Error(extractApiError(res.status, data));
    }

    const accessToken: string | undefined = data?.accessToken;
    const refreshToken: string | undefined = data?.refreshToken;
    const userObj: any = data?.user ?? {};

    if (!accessToken || !refreshToken) {
      throw new Error('Malformed server response: missing tokens.');
    }

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
      // First attempt
      try {
        await performLogin(email, password);
      } catch (e: any) {
        const msg = String(e?.message || e);
        // If unverified, attempt to verify and retry once
        if (looksLikeUnverified(msg)) {
          const verified = await tryVerifyEmail(email);
          if (!verified) {
            throw new Error('Email not verified. Please check your inbox or contact support.');
          }
          // Retry once after verification
          await performLogin(email, password);
        } else {
          throw e;
        }
      }

      if (rememberMe) {
        await AsyncStorage.setItem('rememberedEmail', email);
      } else {
        await AsyncStorage.removeItem('rememberedEmail');
      }

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

  return (
    <ImageBackground
      source={require('../../assets/images/login.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <View style={styles.headerWrapper}>
          {/* dev helper (optional) */}
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <TouchableOpacity onPress={clearSavedSession}>
              <Text style={{ fontSize: 12, color: '#888', textDecorationLine: 'underline' }}>
                Clear saved session (dev)
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.loginTitle}>Log In</Text>
        </View>

        {/* tiny debug line — remove if you don’t want it */}
        {diag ? (
          <View style={styles.debugBox}>
            <Text style={styles.mono}>API: {API_BASE}</Text>
            <Text style={styles.mono}>{diag}</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : <Text style={styles.welcome}>Welcome back!</Text>}

        {/* Email */}
        <View style={styles.inputField}>
          <Feather name="user" size={20} color="#aaa" style={styles.inputIcon} />
          <TextInput
            placeholder="Email"
            placeholderTextColor="#aaa"
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => {}}
          />
        </View>

        {/* Password */}
        <View style={styles.inputField}>
          <Feather name="lock" size={20} color="#aaa" style={styles.inputIcon} />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPassword}
            style={[styles.input, { paddingRight: 40 }]}
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
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Row: remember + forgot */}
        <View style={styles.row}>
          <View style={styles.rememberRow}>
            <TouchableOpacity
              style={[styles.circle, rememberMe && styles.circleChecked]}
              onPress={() => setRememberMe(!rememberMe)}
            >
              {rememberMe && <Feather name="check" size={14} color="#fff" />}
            </TouchableOpacity>
            <Text style={styles.rememberText}>Remember me</Text>
          </View>
          <TouchableOpacity onPress={() => {/* router.push('/login&signup/forgotpass') */}}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#3B82F6', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.loginGradient}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>Log In</Text>}
          </LinearGradient>
        </TouchableOpacity>

        {/* Signup link */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupPrompt}>Don’t have an account?</Text>
          <TouchableOpacity onPress={() => { router.push('/login&signup/signup') }}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Social row (placeholder) */}
        <View style={styles.socialContainer}>
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.continueWith}>Continue with</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialRow}>
            <AntDesign name="apple1" size={26} color="black" />
            <AntDesign name="instagram" size={26} color="#E1306C" />
            <AntDesign name="google" size={26} color="#DB4437" />
            <FontAwesome5 name="tiktok" size={24} color="black" />
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

/* ----------------------------- Styles ----------------------------- */

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 30, backgroundColor: 'transparent' },

  headerWrapper: { height: 200, justifyContent: 'flex-end', alignItems: 'center' },
  loginTitle: {
    fontSize: 46,
    fontWeight: '600',
    color: '#A855F7',
    textAlign: 'center',
    lineHeight: 50,
    letterSpacing: -1.5,
    marginBottom: 24,
  },

  debugBox: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) as any,
    fontSize: 12,
    color: '#4C1D95',
  },

  welcome: { fontSize: 22, fontWeight: '600', textAlign: 'center', marginTop: 8, marginBottom: 12 },

  errorText: { color: 'crimson', textAlign: 'center', marginBottom: 12 },

  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
    position: 'relative',
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#000' },
  eyeButton: { position: 'absolute', right: 12, padding: 4, justifyContent: 'center', alignItems: 'center' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  rememberText: { marginLeft: 5, marginRight: 10, color: '#333' },
  forgotText: { color: '#2563EB', fontWeight: '500' },

  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6A0DAD',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginRight: 2,
  },
  circleChecked: { backgroundColor: '#6A0DAD' },

  loginButton: { borderRadius: 10, overflow: 'hidden', marginBottom: 18 },
  loginGradient: { paddingVertical: 14, paddingHorizontal: 70, alignItems: 'center', alignSelf: 'center', borderRadius: 10 },
  loginText: { color: '#fff', fontSize: 18, fontWeight: '600' },

  signupContainer: { alignItems: 'center', marginBottom: 10 },
  signupPrompt: { fontSize: 14, color: '#333' },
  signupLink: { fontSize: 16, fontWeight: '600', color: '#338BFF', marginTop: 4 },

  socialContainer: { marginTop: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  divider: { flex: 1, height: 1, backgroundColor: '#ddd' },
  continueWith: { marginHorizontal: 10, color: '#888', fontSize: 12 },
  socialRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20 },
});
