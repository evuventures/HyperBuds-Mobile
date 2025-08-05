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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Feather, AntDesign } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth as firebaseAuth } from '../../src/firebase';
import { registerUser, createSession } from '../../src/api/auth';

export const screenOptions = {
  headerShown: false,
};

export default function SignupScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [phone, setPhone]       = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignup = async () => {
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // 1) Create Firebase user
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      // 2) Send email verification
      await sendEmailVerification(cred.user);
      // 3) Register in backend
      await registerUser({ username, email, phone, password });
      // 4) Create backend session
      const idToken = await cred.user.getIdToken();
      await createSession(idToken);
      // 5) Navigate into the app
      router.replace('/main/explore');
    } catch (err: any) {
      console.error('🔴 Signup error detail:', err);
      setError(err.message ?? 'Something went wrong');
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
        <Text style={styles.title}>Sign Up</Text>
        <View style={styles.formWrapper}>

          {/* Username */}
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

          {/* Phone */}
          <View style={styles.inputField}>
            <Feather name="phone" size={20} color="#aaa" style={styles.inputIcon} />
            <TextInput
              placeholder="Phone Number"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              style={styles.input}
              value={phone}
              onChangeText={val => setPhone(val.replace(/[^0-9]/g, ''))}
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
              placeholder="Password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showPassword}
              style={[styles.input, { paddingRight: 40 }]}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(p => !p)}
              style={styles.eyeButton}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
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
            <TouchableOpacity
              onPress={() => setShowConfirm(c => !c)}
              style={styles.eyeButton}
              accessibilityLabel={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              <Feather name={showConfirm ? 'eye-off' : 'eye'} size={20} color="#555" />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Sign Up Button */}
          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleSignup}
            disabled={loading}
          >
            <LinearGradient
              colors={['#3B82F6', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.signupText}>Sign Up</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Log In Link */}
          <Text style={styles.loginPrompt}>
            Already have an account?{' '}
            <Text
              style={styles.loginLink}
              onPress={() => router.replace('/login&signup/login')}
            >
              Log In
            </Text>
          </Text>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.continueWith}>Continue with</Text>
            <View style={styles.divider} />
          </View>

          {/* Social Icons */}
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
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  title: {
    fontSize: 48,
    fontWeight: '600',
    color: '#A855F7',
    textAlign: 'center',
    marginTop: 90,
    marginBottom: 65,
  },
  formWrapper: { marginTop: 20 },
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
    width: '90%',
    alignSelf: 'center',
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
  signupButton: { borderRadius: 10, overflow: 'hidden', marginBottom: 15 },
  gradientButton: {
    paddingVertical: 14,
    paddingHorizontal: 70,
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 10,
  },
  signupText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  loginPrompt: { textAlign: 'center', fontSize: 14, marginBottom: 10 },
  loginLink: { color: '#6A0DAD', fontWeight: '600' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 30,
  },
  divider: { flex: 1, height: 1, backgroundColor: '#ddd' },
  continueWith: { marginHorizontal: 10, color: '#888', fontSize: 12 },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
});
