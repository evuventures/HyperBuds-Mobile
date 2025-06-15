import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, AntDesign, Entypo } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <View style={styles.headerWrapper}>
        <LinearGradient colors={['#6A0DAD', '#8A2BE2']} style={styles.headerCurve} />
        <Text style={styles.headerText}>Log In</Text>
      </View>

      <Text style={styles.welcome}>Welcome back!</Text>

      <View style={styles.inputField}>
        <Feather name="user" size={20} color="#aaa" style={styles.inputIcon} />
        <TextInput
          placeholder="Username / Email"
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

      <View style={styles.row}>
        <View style={styles.rememberRow}>
          <Switch
            value={rememberMe}
            onValueChange={setRememberMe}
            trackColor={{ true: '#6A0DAD', false: '#ccc' }}
            thumbColor="#fff"
          />
          <Text style={styles.rememberText}>Remember me</Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.loginButton}>
        <LinearGradient colors={['#3B82F6', '#9333EA']} style={styles.loginGradient}>
          <Text style={styles.loginText}>Log In</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.signupPrompt}>
        Don’t have an account?{' '}
        <Text style={styles.signupLink} onPress={() => router.push('/signup')}>
          Sign Up
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
  welcome: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 25,
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
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberText: {
    marginLeft: 6,
    color: '#333',
  },
  forgotText: {
    color: '#2563EB',
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  loginGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signupPrompt: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 20,
  },
  signupLink: {
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
