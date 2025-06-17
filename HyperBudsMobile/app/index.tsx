import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image source={require('../assets/images/hblogo.png')} style={styles.logo} resizeMode="contain" />

      {/* Slogan */}
      <Text style={styles.slogan}>
        <Text style={styles.bold}>Collabs</Text> that{"\n"}just <Text style={styles.bold}>Click</Text>
      </Text>

      {/* Center image */}
      <Image source={require('../assets/images/people.png')} style={styles.people} resizeMode="contain" />

      {/* Buttons */}
      <LinearGradient colors={['#3B82F6', '#9333EA']} style={styles.button}>
        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>
      </LinearGradient>

      <LinearGradient colors={['#3B82F6', '#9333EA']} style={styles.button}>
        <TouchableOpacity onPress={() => router.push('/signup')}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Help link */}
      <TouchableOpacity>
        <Text style={styles.helpText}>Help</Text>
      </TouchableOpacity>

      {/* Optional bottom corners — if you want to include them, import and position them with absolute */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 30,
  },
  logo: {
    width: 280,
    height: 100,
    marginBottom: 30,
  },
  slogan: {
    fontSize: 26,
    textAlign: 'center',
    color: '#000',
    marginBottom: 30,
  },
  bold: {
    fontWeight: 'bold',
  },
  people: {
    width: 220,
    height: 180,
    marginBottom: 40,
  },
  button: {
    borderRadius: 10,
    overflow: 'hidden',
    width: '80%',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 14,
    textAlign: 'center',
  },
  helpText: {
    color: '#2563EB',
    fontSize: 14,
    marginTop: 15,
  },
});
