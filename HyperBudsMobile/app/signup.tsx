import { useState } from 'react';
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
import { FontAwesome5 } from '@expo/vector-icons'; // TikTok logo

export default function SignupScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');

  return (
    <ImageBackground
      source={require('../assets/images/signup.png')} // ✅ adjust the path if different
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {/* Title */}
        <Text style={styles.title}>Sign Up</Text>

        <View style={styles.formWrapper}>
          {/* Inputs */}
          <View style={styles.inputField}>
            <Feather name="user" size={20} color="#aaa" style={styles.inputIcon} />
            <TextInput
              placeholder="Username"
              placeholderTextColor="#aaa"
              style={styles.input}
            />
          </View>

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

          <View style={styles.inputField}>
            <Feather name="mail" size={20} color="#aaa" style={styles.inputIcon} />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#aaa"
              style={styles.input}
            />
          </View>

          <View style={styles.inputField}>
            <Feather name="lock" size={20} color="#aaa" style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#aaa"
              secureTextEntry
              style={styles.input}
            />
          </View>

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
          <TouchableOpacity style={styles.signupButton}>
            <LinearGradient colors={['#3B82F6', '#9333EA']} style={styles.gradientButton}>
              <Text style={styles.signupText}>Sign Up</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Log In Link */}
          <Text style={styles.loginPrompt}>
            Already have an account?
            {'\n'}
            <Text style={styles.loginLink} onPress={() => router.replace('/login')}>
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
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  formWrapperContainer: {
    flex: 1,
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 48,
    fontWeight: '600',
    color: '#A855F7',
    textAlign: 'center',
    marginTop: 90,
    marginBottom: 65,
  },
  formWrapper: {
    marginTop: 20,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
    backgroundColor: '#fff', // helps with readability
    width: '90%', //  slightly narrower than full width
    alignSelf: 'center', // center the input field horizontally
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  signupButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  gradientButton: {
    paddingVertical: 14,
    paddingHorizontal: 70,
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 10,
  },
  signupText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginPrompt: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 10,
  },
  loginLink: {
    color: '#6A0DAD',
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  continueWith: {
    marginHorizontal: 10,
    color: '#888',
    fontSize: 12,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
});
