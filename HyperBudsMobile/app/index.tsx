import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Background polygons */}
      <Image
        source={require('../assets/images/indexblpoly.png')}
        style={styles.bottomLeftPoly}
      />
      <Image
        source={require('../assets/images/indexpolybr.png')}
        style={styles.bottomRightPoly}
      />

      {/* Logo */}
      <Image source={require('../assets/images/hblogo.png')} style={styles.logo} resizeMode="contain" />

      {/* Slogan */}
      <Text style={styles.slogan}>
        <Text style={styles.bold}>Collabs</Text> that{"\n"}just <Text style={styles.bold}>Click</Text>
      </Text>

      {/* Center image */}
      <Image source={require('../assets/images/people.png')} style={styles.people} resizeMode="contain" />

      {/* Log In Button */}
      <TouchableOpacity style={styles.signupButton} onPress={() => router.push('/login&signup/login')}>
        <LinearGradient
          colors={['#3B82F6', '#9333EA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          <Text style={styles.buttonText}>Log In</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Sign Up Button */}
      <TouchableOpacity style={styles.signupButton} onPress={() => router.push('/login&signup/signup')}>
        <LinearGradient
          colors={['#3B82F6', '#9333EA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          <Text style={styles.buttonText}>Sign Up</Text>
        </LinearGradient>
      </TouchableOpacity>
      {/* Dev Button (hidden in corner) */}
<TouchableOpacity
  style={styles.devButton}
  onPress={() => router.push('/dev')}
>
  <Text style={styles.devText}>⚙️</Text>
</TouchableOpacity>


      
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
    position: 'relative', // important for absolute children
  },
  logo: {
    width: 280,
    height: 100,
    marginBottom: 30,
  },
  slogan: {
    fontSize: 32,
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
  signupButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  gradientButton: {
    width: 190,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  
  bottomLeftPoly: {
    position: 'absolute',
    bottom: -25,
    left: -30,
    width: 175,
    height: 175,
  },
  bottomRightPoly: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 150,
    height: 150,
  },
  devButton: {
    position: 'absolute',
    top: 40,      // adjust position
    right: 20,    // adjust position
    padding: 6,
    opacity: 0.3, // keeps it subtle
  },
  
  devText: {
    fontSize: 14,
    color: '#000',
  },
  
});