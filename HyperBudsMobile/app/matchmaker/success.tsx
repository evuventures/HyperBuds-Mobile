// app/matchmaker/success.tsx

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function MatchSuccess() {
  const router = useRouter();
  const otherName = 'Lavender'; // replace with prop or dynamic value

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>
          You and <Text style={styles.highlight}>{otherName}</Text> want{'\n'}to collaborate together!
        </Text>

        <View style={styles.imageStackWrapper}>
          <View style={styles.imageStack}>
            <View style={[styles.avatarWrapper, styles.firstAvatar]}>
              {/* blank placeholder */}
            </View>
            <View style={[styles.avatarWrapper, styles.secondAvatar]}>
              {/* blank placeholder */}
            </View>
            <View style={styles.overlayCircle}>
              <FontAwesome5 name="handshake" size={20} color="#fff" />
            </View>
          </View>
        </View>

        <Text style={styles.subheading}>It’s a match!</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => {
            /* navigate to message */
          }}
        >
          <LinearGradient
            colors={['#3B82F6', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <Text style={styles.primaryText}>Send Message</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { /* keep scrolling action */ }}>
          <Text style={styles.secondaryText}>Keep Scrolling</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 140;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    height: 60,
    justifyContent: 'center',
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  heading: {
    fontSize: 23,
    fontWeight: '700',
    textAlign: 'left',
    width: '100%',
    marginTop: 10,
    lineHeight: 30,
    color: '#111',
  },
  highlight: {
    color: '#8B5CF6',
  },
  imageStackWrapper: {
    marginTop: 30,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  imageStack: {
    width: AVATAR_SIZE * 2 + 40,
    height: AVATAR_SIZE + 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f0f0f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  firstAvatar: {
    position: 'absolute',
    left: 0,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  secondAvatar: {
    position: 'absolute',
    right: 0,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  overlayCircle: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    backgroundColor: '#7C3AED',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    transform: [{ translateY: 20 }],
    shadowColor: '#7C3AED',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  subheading: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 40,
    marginBottom: 20,
    color: '#111',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 6,
  },
  gradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  primaryText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});
