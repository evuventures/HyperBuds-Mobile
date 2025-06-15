import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Feather, AntDesign, Entypo } from '@expo/vector-icons';

export default function SignupScreen() {
  const router = useRouter();
  const [countryCode] = useState('+1');
  const [phone, setPhone] = useState('');

  return (
    <View style={styles.container}>
      {/* Curved Gradient Header */}
      <View style={styles.headerWrapper}>
        <LinearGradient colors={['#6A0DAD', '#8A2BE2']} style={styles.headerCurve} />
        <Text style={styles.headerText}>Sign Up</Text>
      </View>

      {/* Inputs */}
      <View style={styles.inputField}>
        <Feather name="user" size={20} color="#aaa" style={styles.inputIcon} />
        <TextInput placeholder="Username" placeholderTextColor="#aaa" style={styles.input} />
      </View>

      <View style={styles.inputField}>
        <Text style={styles.prefix}>US {countryCode}</Text>
        <TextInput
          placeholder="Phone Number"
          placeholderTextColor="#aaa"
          keyboardType="phone-pad"
          style={[styles.input, { marginLeft: 8 }]}
          value={phone}
          onChangeText={setPhone}
        />
      </View>

      <View style={styles.inputField}>
        <Feather name="mail" size={20} color="#aaa" style={styles.inputIcon} />
        <TextInput placeholder="Email" placeholderTextColor="#aaa" style={styles.input} />
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

      {/* Login Link */}
      <Text style={styles.loginPrompt}>
        Already have an account?{' '}
        <Text style={styles.loginLink} onPress={() => router.replace('/')}>
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
        <Entypo name="music" size={26} color="#000" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 30,
  },
  headerWrapper: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerCurve: {
    position: 'absolute',
    width: '150%',
    height: 200,
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 200,
    transform: [{ scaleX: 1.4 }],
  },
  headerText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
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
  },
  inputIcon: {
    marginRight: 8,
  },
  prefix: {
    fontSize: 16,
    color: '#444',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  signupButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  gradientButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  signupText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginPrompt: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 20,
  },
  loginLink: {
    color: '#6A0DAD',
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
