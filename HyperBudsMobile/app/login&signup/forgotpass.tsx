// app/login&signup/forgotpass.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

/** Backend base URL (same convention as your other screens) */
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

const fetchWithTimeout = (url: string, options: RequestInit = {}, ms = 25000) =>
  Promise.race([
    fetch(url, options),
    new Promise<Response>((_, rej) =>
      setTimeout(() => rej(new Error('Request timeout')), ms)
    ),
  ]) as Promise<Response>;

/* ----------------------------- Component ----------------------------- */
export default function ForgotPass() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleSend = async () => {
    setErr(null);
    setInfo(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setErr('Please enter your email.');
      return;
    }
    // very light email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErr('Please enter a valid email address.');
      return;
    }

    setSending(true);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ email: trimmed }),
        },
        25000
      );

      const text = await res.text();
      const data = safeJson(text);

      if (!res.ok) {
        // API error format: { message, details?, stack? }
        const msg =
          data?.message ||
          (res.status === 404
            ? 'We could not find an account with that email.'
            : 'Could not send reset email. Please try again.');
        setErr(msg);
        // Optional toast
        Alert.alert('Reset failed', msg);
        setSending(false);
        return;
      }

      // Success UX
      const successMsg =
        'If an account exists for that email, you will receive password reset instructions shortly.';
      setInfo(successMsg);
      Alert.alert('Email sent', successMsg, [
        { text: 'OK', onPress: () => router.back() },
      ]);
      setSending(false);
    } catch (e: any) {
      const msg =
        e?.message === 'Request timeout'
          ? 'Request timed out — please check your connection and try again.'
          : 'Network error — please try again.';
      setErr(msg);
      Alert.alert('Network error', msg);
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative images (unchanged) */}
      <Image
        source={require('../../assets/images/circle1.png')}
        style={styles.leftcircleimage}
      />
      <Image
        source={require('../../assets/images/circle2.png')}
        style={styles.rightcircleimage}
      />
      <Image
        source={require('../../assets/images/fpblpoly.png')}
        style={styles.bottomleftpoly}
      />
      <Image
        source={require('../../assets/images/fpbrpoly.png')}
        style={styles.bottomrightpoly}
      />

      {/* Back button */}
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>Forgot{'\n'}Password</Text>
      <Text style={styles.subtitle}>
        Please enter your email to receive a verification code
      </Text>

      {/* Email input */}
      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#999" />
        <TextInput
          placeholder="Email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!sending}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
      </View>

      {/* Inline error/info messages */}
      {err ? <Text style={styles.errorText}>{err}</Text> : null}
      {info ? <Text style={styles.infoText}>{info}</Text> : null}

      {/* Send button matching login/signup style */}
      <TouchableOpacity
        style={styles.sendButton}
        onPress={handleSend}
        disabled={sending}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#3B82F6', '#9333EA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sendGradient}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ----------------------------- Styles ----------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',  
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  back: {
    position: 'absolute',
    top: 30,
    left: 20,
  },
  title: {
    marginTop: 100,
    fontSize: 45,
    fontWeight: '600',
    lineHeight: 56,
    color: '#A259FF',
    textAlign: 'center',
    letterSpacing: -1.5, 
  },
  subtitle: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    height: 50,
    marginTop: 30,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },

  // Messages
  errorText: {
    marginTop: 10,
    color: 'crimson',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  infoText: {
    marginTop: 10,
    color: '#2563EB',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  // send button styles
  sendButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 30,
  },
  sendGradient: {
    paddingVertical: 14,
    paddingHorizontal: 70,
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 10,
  },
  sendText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },

  // Decorative image positions
  leftcircleimage: {
    position: 'absolute',
    top: 0,
    left: -50,
    width: 250,
    height: 250,
    resizeMode: 'contain',
    zIndex: -1,
  },
  rightcircleimage: {
    position: 'absolute',
    top: -275,
    left: 175,
    width: 550,
    height: 550,
    resizeMode: 'contain',
    zIndex: -1,
  },
  bottomleftpoly: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    width: 125,
    height: 125,
    resizeMode: 'contain',
    zIndex: -1,
  },
  bottomrightpoly: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 100,
    height: 100,
    resizeMode: 'contain',
    zIndex: -1,
  },
});
