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
import { Feather, AntDesign, FontAwesome5 } from '@expo/vector-icons';

export const screenOptions = { headerShown: false };

/** Official backend (Render). Override via EXPO_PUBLIC_API_BASE_URL if needed. */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim() ||
  'https://api-hyperbuds-backend.onrender.com/api/v1';

/* ------------------------------ Helpers ------------------------------ */

const safeJson = (t: string) => { try { return t ? JSON.parse(t) : {}; } catch { return {}; } };

const fetchWithTimeout = (url: string, options: RequestInit = {}, ms = 30000) =>
  Promise.race([
    fetch(url, options),
    new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('Request timeout')), ms)),
  ]) as Promise<Response>;

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 1000): Promise<T> {
  let attempt = 0;
  // total attempts = retries + 1
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

const extractRegisterError = (status: number, payload: any) => {
  if (payload?.message) return payload.message;
  if (status === 409) return 'Email already in use.';
  if (status === 400) return 'Invalid signup data.';
  return 'Signup failed. Please try again.';
};

/* ------------------------------ Component ------------------------------ */

export default function SignupScreen() {
  const router = useRouter();

  const [username, setUsername] = useState(''); // local-only (not sent to API yet)
  const [phone, setPhone] = useState('');       // local-only
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    if (!username.trim()) return 'Username is required';
    if (!email.includes('@')) return 'Enter a valid email';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password !== confirm) return 'Passwords do not match';
    return null;
  };

  // Calls the endpoint you confirmed works to send the verification email
  const sendVerificationEmail = async (address: string) => {
    const res = await withRetry(async () => {
      return await fetchWithTimeout(`${API_BASE}/auth/verify-email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: address }),
      }, 30000);
    });

    // It might return 200/204/etc. We don't need the body for navigation.
    if (!res.ok) {
      const text = await res.text();
      const data = safeJson(text);
      // Don’t block navigation, but surface the error on this screen.
      throw new Error(data?.message || `Failed to send verification email (${res.status}).`);
    }
  };

  const handleSignup = async () => {
    const v = validate();
    if (v) { setError(v); return; }

    setLoading(true);
    setError(null);

    try {
      // 1) Register
      const regRes = await withRetry(async () => {
        return await fetchWithTimeout(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        }, 30000);
      });

      const regText = await regRes.text();
      const regData = safeJson(regText);

      if (!regRes.ok) {
        setError(extractRegisterError(regRes.status, regData));
        setLoading(false);
        return;
      }

      // 2) Immediately send verification email
      try {
        await sendVerificationEmail(email.trim());
      } catch (e: any) {
        // Non-fatal: still proceed to verify screen where user can retry
        setError(e?.message || 'Could not send verification email right now. You can retry on the next screen.');
      }

      // 3) Go to verify screen and pass along the email (Expo Router params)
      router.push({
        pathname: '/login&signup/verifyemail',
        params: { email: email.trim() },
      });
    } catch (err: any) {
      const msg = String(err?.message || err);
      setError(
        msg === 'Request timeout'
          ? 'Request timed out. The server may be cold-starting — please try again.'
          : msg
      );
    } finally {
      setLoading(false);
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
              {/* Username (local) */}
              <View style={styles.inputField}>
                <Feather name="user" size={20} color="#aaa" style={styles.inputIcon} />
                <TextInput
                  placeholder="Username"
                  placeholderTextColor="#aaa"
                  autoCapitalize="none"
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              {/* Phone (local) */}
              <View style={styles.inputField}>
                <Feather name="phone" size={20} color="#aaa" style={styles.inputIcon} />
                <TextInput
                  placeholder="Phone Number"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                  style={styles.input}
                  value={phone}
                  onChangeText={(val) => setPhone(val.replace(/[^0-9]/g, ''))}
                />
              </View>

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
    marginBottom: 16,
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

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingHorizontal: 30 },
  divider: { flex: 1, height: 1, backgroundColor: '#ddd' },
  continueWith: { marginHorizontal: 10, color: '#888', fontSize: 12 },

  socialRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 30 },

  error: { color: 'crimson', textAlign: 'center', marginBottom: 12 },
});
