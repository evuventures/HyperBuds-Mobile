// app/login&signup/signup.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const screenOptions = { headerShown: false };

/** Official backend (Render). Override via EXPO_PUBLIC_API_BASE_URL if needed. */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim() ||
  'https://api-hyperbuds-backend.onrender.com/api/v1';

/* ------------------------------ Helpers (unchanged) ------------------------------ */
const safeJson = (t: string) => {
  try {
    return t ? JSON.parse(t) : {};
  } catch {
    return {};
  }
};

const fetchWithTimeout = (url: string, options: RequestInit = {}, ms = 60000) =>
  Promise.race([
    fetch(url, options),
    new Promise<Response>((_, rej) =>
      setTimeout(() => rej(new Error('Request timeout')), ms)
    ),
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
        (transient ? baseDelayMs * Math.pow(2, attempt - 1) : 300) +
        Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

const extractRegisterError = (status: number, payload: any) => {
  if (payload?.message) return payload.message;
  if (status === 409) return 'Email already in use.';
  if (status === 400) return 'Invalid signup data.';
  return 'Signup failed. Please try again.';
};

/* ----------------------- Idempotency + Pending Guard (unchanged) ----------------------- */
const PENDING_KEY_PREFIX = 'signup:pending:';
const genIdempotencyKey = () =>
  `hb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

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

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // confirm and showConfirm removed (field commented out)
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);

  const validate = () => {
    if (!email.includes('@')) return 'Enter a valid email';
    if (password.length < 8) return 'Password must be at least 8 characters';
    // Removed confirm-password match check so confirm is no longer required
    if (!agree) return 'You must agree to the Terms of Service';
    return null;
  };

  // Send verification email (safe to retry)
  const sendVerificationEmail = async (address: string) => {
    const res = await withRetry(async () => {
      return await fetchWithTimeout(
        `${API_BASE}/auth/verify-email/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
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
      params: {
        email: address,
        ...(banner ? { banner } : {}),
      },
    });
  };

  const handleSignup = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
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
            setError(
              'Email already in use. If you just signed up, check your inbox for a verification link—or try logging in.'
            );
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
        setError(
          e?.message || 'Could not send verification email right now. You can retry on the next screen.'
        );
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
            goToVerify(
              trimmedEmail,
              'Your signup may have completed. Check your email for the verification link.'
            );
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
    <LinearGradient colors={['#FFFFFF', '#F7FAFF']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.screenWrap}>
              {/* Back Button */}
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Feather name="arrow-left" size={24} color="#111827" />
              </TouchableOpacity>

              {/* Emoji Logo - now at the very top */}
              <View style={styles.logoContainer}>
                <View style={styles.emojiBox}>
                  <Text style={styles.emojiText}>👏</Text>
                </View>
              </View>

              {/* Gradient-masked title */}
              <MaskedView
                maskElement={
                  <Text style={[styles.title, { backgroundColor: 'transparent' }]}>Sign Up</Text>
                }
              >
                <LinearGradient
                  colors={['#A855F7', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ width: '100%', height: 44 }}
                />
              </MaskedView>

              <Text style={styles.subtitle}>You are welcome back</Text>

              <View style={styles.socialRow}>
                <TouchableOpacity style={[styles.socialBtn, styles.shadowedBox]} activeOpacity={0.85}>
                  <View style={styles.socialInner}>
                    <FontAwesome5 name="facebook-f" size={18} color="#1877F2" />
                    <Text style={styles.socialText}>Facebook</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.socialBtn, styles.shadowedBox]} activeOpacity={0.85}>
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

              <View style={[styles.inputField, styles.shadowedBox]}>
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#D3D3D3"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>

              <View style={[styles.inputField, styles.shadowedBox]}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="##D3D3D3"
                  secureTextEntry={!showPassword}
                  style={[styles.input, { paddingRight: 44 }]}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((p) => !p)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/*
                Confirm Password field commented out per request.
                If you want to re-enable, remove the comment block and re-add confirm/showConfirm state.
              */}
              {/*
              <View style={[styles.inputField, styles.shadowedBox]}>
                <TextInput
                  placeholder="Confirm Password"
                  placeholderTextColor="#A0A0A0"
                  secureTextEntry={!showConfirm}
                  style={[styles.input, { paddingRight: 44 }]}
                  value={confirm}
                  onChangeText={setConfirm}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSignup}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm((c) => !c)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name={showConfirm ? 'eye-off' : 'eye'} size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
              */}

              {/* Terms row */}
              <View style={styles.termsRow}>
                <TouchableOpacity
                  style={[styles.checkbox, agree && styles.checkboxChecked]}
                  onPress={() => setAgree((a) => !a)}
                >
                  {agree ? <Feather name="check" size={14} color="#fff" /> : null}
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  I'm agree to The <Text style={styles.linkText}>Terms of Service</Text> and{' '}
                  <Text style={styles.linkText}>Privacy Policy</Text>
                </Text>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={styles.signupBtn}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#A855F7', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.signupGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.signupText}>Create Account</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.loginRow}>
                <Text style={styles.haveAccount}>Do you have account?</Text>
                <TouchableOpacity
                  onPress={() => {
                    router.push('/login&signup/login');
                  }}
                >
                  <Text style={styles.loginLink}> Log In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  screenWrap: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 60 : 80,
    backgroundColor: 'transparent',
    paddingBottom: 24,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 0 : 40,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 0,
  },
  emojiBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
    marginTop: -20,
  },
  emojiText: {
    fontSize: 48,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    height: 44,
  },
  subtitle: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 10,
    marginBottom: 20,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 12,
  },
  socialBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    marginHorizontal: 6,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  socialInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialText: {
    marginLeft: 10,
    fontWeight: '600',
    color: '#111827',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  orText: {
    marginHorizontal: 8,
    color: '#9CA3AF',
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 14,
    backgroundColor: '#F7FAFF',
  },
  shadowedBox: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 10,
    elevation: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#A855F7',
    borderColor: '#A855F7',
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  linkText: {
    color: '#6D28D9',
    fontWeight: '600',
  },
  errorText: {
    color: 'crimson',
    textAlign: 'center',
    marginVertical: 6,
  },
  signupBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  signupGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  signupText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
    alignItems: 'center',
  },
  haveAccount: {
    color: '#6B7280',
  },
  loginLink: {
    color: '#6D28D9',
    fontWeight: '700',
  },
});
