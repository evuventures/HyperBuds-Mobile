import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Swiper from 'react-native-swiper';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const OnboardingScreen = () => {
  const router = useRouter();
  const swiperRef = useRef(null);

  const handleNext = () => {
    // @ts-ignore
    swiperRef.current?.scrollBy(1);
  };

  return (
    <Swiper
      ref={swiperRef}
      loop={false}
      showsPagination={true}
      dotColor="#ccc"
      activeDotColor="#A855F7"
    >
      {/* Slide 1 */}
      <View style={styles.slide}>
        <Image source={require('../../assets/images/onb1.png')} style={styles.image} />
        <Text style={styles.header}>
          <Text style={styles.bold}>Welcome to{'\n'}HyperBuds!</Text>
        </Text>
        <Text style={styles.subtext}>
          Discover, connect, and collaborate with creators like never before, powered by intelligent AI matching.
        </Text>
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.gradientButton} onPress={handleNext}>
            <LinearGradient colors={['#3B82F6', '#9333EA']} style={styles.gradientButtonInner}>
              <Text style={styles.buttonText}>Next</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.skip}>Skip</Text>
        </View>
      </View>

      {/* Slide 2 */}
      <View style={styles.slide}>
        <Image source={require('../../assets/images/onb2.png')} style={styles.image2} />
        <Text style={styles.header}>
          <Text style={styles.bold}>Find your Perfect{'\n'}Collab Partner</Text>
        </Text>
        <Text style={styles.subtext}>
          Our AI Matchmaker intelligently suggests ideal collaborators based on your niche, audience, and goals.
        </Text>
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.gradientButton} onPress={handleNext}>
            <LinearGradient colors={['#3B82F6', '#9333EA']} style={styles.gradientButtonInner}>
              <Text style={styles.buttonText}>Next</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.skip}>Skip</Text>
        </View>
      </View>

      {/* Slide 3 */}
      <View style={styles.slide}>
        <Image source={require('../../assets/images/onb3.png')} style={styles.image3} />
        <Text style={styles.header}>
          <Text style={styles.bold}>Go Live &{'\n'}Create Magic</Text>
        </Text>
        <Text style={styles.subtext}>
          Jump into our basic Duet Studio to co-stream, record, and produce amazing content with your new partners.
        </Text>
        <TouchableOpacity style={styles.gradientButton} onPress={() => router.replace('/')}>
          <LinearGradient colors={['#3B82F6', '#9333EA']} style={styles.gradientButtonInner}>
            <Text style={styles.buttonText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Swiper>
  );
};

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  image: {
    height: 170,
    resizeMode: 'contain',
    marginBottom: 30,
  },
  image2: {
    marginTop: 30,
    height: 130,
    resizeMode: 'contain',
    marginBottom: 30,
  },
  image3: {
    marginTop: 50,
    height: 50,
    resizeMode: 'contain',
    marginBottom: 80,
  },
  header: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 14,
    color: '#000',
  },
  bold: {
    fontWeight: 'bold',
  },
  subtext: {
    fontSize: 20,
    textAlign: 'center',
    color: '#666',
    marginBottom: 80,
  },
  gradientButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  gradientButtonInner: {
    paddingVertical: 14,
    paddingHorizontal: 70,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skip: {
    color: '#9333EA',
    fontSize: 16,
    textDecorationLine: 'underline',
    marginTop: 6,
  },
  bottomButtons: {
    alignItems: 'center',
  },
});

export default OnboardingScreen;
