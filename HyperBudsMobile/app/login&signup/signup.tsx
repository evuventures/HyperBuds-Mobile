// app/loging&signup/signup.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Feather, AntDesign } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';

export const screenOptions = {
  headerShown: false,
};

export default function SignupScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');

  return (
    <ImageBackground
      source={require('../../assets/images/signup.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {/* Title */}
        <Text style={styles.title}>Sign Up</Text>

        <View style={styles.formWrapper}>
          {/* Username */}
          <View style={styles.inputField}>
            <Feather name="user" size={20} color="#aaa" style={styles.inputIcon} />
            <TextInput
              placeholder="Username"
              placeholderTextColor="#aaa"
              style={styles.input}
            />
          </View>

          {/* Phone */}
          <View style={styles.inputField}>
            <Feather name="phone" size={20} color="#aaa" style={styles.inputIcon} />
            <TextInput
              placeholder="Phone Number"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Email */}
          <View style={styles.inputField}>
            <Feather name="mail" size={20} color="#aaa" style={styles.inputIcon} />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          {/* Password */}
          <View style={styles.inputField}>
            <Feather name="lock" size={20} color="#aaa" style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#aaa"
              secureTextEntry
              style={styles.input}
            />
          </View>

          {/* Confirm */}
          <View style={styles.inputField}>
            <Feather name="lock" size={20} color="#aaa" style={styles.inputIcon} />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#aaa"
              secureTextEntry
              style={styles.input}
            />
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity style={styles.signupButton}
          onPress={() => router.replace('/registration/onboarding')}
          >
            <LinearGradient
              colors={['#3B82F6', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.signupText}>Sign Up</Text>
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
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#000' },
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
});
