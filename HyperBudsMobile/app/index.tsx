import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import MaskedView from '@react-native-masked-view/masked-view';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 30;

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
      <Image
        source={require('../assets/images/hblogo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Gradient Slogan (single line, fixed width) */}
      <MaskedView
        style={styles.sloganWrapper}
        maskElement={
          <Text
            style={[styles.slogan, styles.sloganMask]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            Collabs that just Click
          </Text>
        }
      >
        <LinearGradient
          colors={['#7C3AED', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sloganGradient}
        >
          <Text style={[styles.slogan, { opacity: 0 }]}>
            Collabs that just Click
          </Text>
        </LinearGradient>
      </MaskedView>

      {/* Center image */}
      <Image
        source={require('../assets/images/people.png')}
        style={styles.people}
        resizeMode="contain"
      />

      {/* Log In Button */}
      <TouchableOpacity
        style={[styles.signupButton, styles.fullWidthButton]}
        onPress={() => router.push('/login&signup/login')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#3B82F6', '#9333EA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientButton, styles.fullWidthGradient]}
        >
          <Text style={styles.buttonText}>Log In</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Sign Up Button */}
      <TouchableOpacity
        style={[styles.signupButton, styles.fullWidthButton]}
        onPress={() => router.push('/login&signup/signup')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#3B82F6', '#9333EA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientButton, styles.fullWidthGradient]}
        >
          <Text style={styles.buttonText}>Sign Up</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Dev Button */}
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
    paddingHorizontal: HORIZONTAL_PADDING,
    position: 'relative',
  },
  logo: {
    width: 280,
    height: 100,
    marginBottom: 20,
  },

  // Slogan fix
  sloganWrapper: {
    width: SCREEN_WIDTH - HORIZONTAL_PADDING * 2, // same as content width
    marginBottom: 26,
    alignItems: 'center',
  },
  slogan: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  sloganMask: {
    width: '100%',
  },
  sloganGradient: {
    width: '100%',
    alignItems: 'center',
  },

  people: {
    width: 220,
    height: 180,
    marginBottom: 50,
  },

  signupButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    width: '100%',
  },
  fullWidthButton: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 4,
  },
  gradientButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  fullWidthGradient: {
    width: SCREEN_WIDTH - HORIZONTAL_PADDING * 2,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
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
    top: 40,
    right: 20,
    padding: 6,
    opacity: 0.3,
  },
  devText: {
    fontSize: 14,
    color: '#000',
  },
});
