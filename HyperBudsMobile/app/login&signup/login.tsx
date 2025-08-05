// app/login&signup/login.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, AntDesign, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../src/firebase';
import { createSession } from '../../src/api/auth';

export const screenOptions = {
  headerShown: false,
};

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(''); // email
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);

    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, identifier.trim(), password);
    } catch (fbErr: any) {
      console.error('Firebase sign-in error', fbErr);
      if (fbErr.code === 'auth/user-not-found') {
        setError('No user found with that email.');
      } else if (fbErr.code === 'auth/wrong-password') {
        setError('Wrong password.');
      } else if (fbErr.code) {
        setError(`Auth error: ${fbErr.code}`);
      } else {
        setError(fbErr.message || 'Authentication error.');
      }
      setLoading(false);
      return;
    }

    // Create backend session
    try {
      const idToken = await cred.user.getIdToken();
      //console.log('🔥 Firebase ID Token:', idToken);
      await createSession(idToken);
    } catch (apiErr: any) {
      console.error('Backend session error', apiErr);
      setError(apiErr.message || 'Server error, please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
    router.replace('/main/explore');
  };

  return (
    <ImageBackground
      source={require('../../assets/images/login.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <View style={styles.headerWrapper}>
          <Text style={styles.loginTitle}>Log In</Text>
        </View>

        <Text style={styles.welcome}>Welcome back!</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
            importantForAutofill="yes"
          />
        </View>

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
            importantForAutofill="yes"
          />
          <TouchableOpacity
            onPress={() => setShowPassword((p) => !p)}
            style={styles.eyeButton}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#555" />
          </TouchableOpacity>
        </View>

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
          <TouchableOpacity onPress={() => router.push('/login&signup/forgotpass')}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

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
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginText}>Log In</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupPrompt}>Don’t have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/login&signup/signup')}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

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

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 30, backgroundColor: 'transparent' },
  headerWrapper: { height: 220, justifyContent: 'flex-end', alignItems: 'center' },
  loginTitle: {
    fontSize: 50,
    fontWeight: '600',
    color: '#A855F7',
    textAlign: 'center',
    lineHeight: 50,
    letterSpacing: -2.5,
    marginBottom: 30,
  },
  welcome: { fontSize: 25, fontWeight: '600', textAlign: 'center', marginTop: 50, marginBottom: 25 },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 10 },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
    position: 'relative',
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#000' },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
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
  loginButton: { borderRadius: 10, overflow: 'hidden', marginBottom: 20 },
  loginGradient: { paddingVertical: 14, paddingHorizontal: 70, alignItems: 'center', alignSelf: 'center', borderRadius: 10 },
  loginText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  signupContainer: { alignItems: 'center', marginBottom: 10 },
  signupPrompt: { fontSize: 14, color: '#333' },
  signupLink: { fontSize: 16, fontWeight: '600', color: '#338BFF', marginTop: 4 },
  socialContainer: { marginTop: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#ddd' },
  continueWith: { marginHorizontal: 10, color: '#888', fontSize: 12 },
  socialRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20 },
});
