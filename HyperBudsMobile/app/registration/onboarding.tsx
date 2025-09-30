import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Swiper from 'react-native-swiper';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const OnboardingScreen = () => {
  const router = useRouter();
  const swiperRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    // @ts-ignore
    swiperRef.current?.scrollBy(1);
  };

  const handleFinish = () => {
    router.push('/registration/buildprofile');
  };

  const onIndexChanged = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <Swiper
      ref={swiperRef}
      loop={false}
      onIndexChanged={onIndexChanged}
      showsPagination={false} // we will render custom pagination
    >
      {/* Slide 1 */}
      <View style={styles.slide}>
        <LinearGradient
          colors={['#9333EA', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }} // left to right
          style={styles.ribbon}
        />
        <Image
          source={require('../../assets/images/onboarding_welcome.png')}
          style={styles.image}
        />
        <View style={styles.paginationWrapper}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                currentIndex === i && styles.activeDot,
              ]}
            />
          ))}
        </View>
        <Text style={styles.header}>Welcome to{"\n"}HyperBuds!</Text>
        <Text style={styles.subtext}>
          Discover, connect, and collaborate with creators like never before, powered by intelligent AI matching.
        </Text>
        <View style={styles.bottomRightContainer}>
          <TouchableOpacity onPress={handleFinish}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={styles.smallButton}>
            <LinearGradient colors={['#3B82F6', '#9333EA']} style={styles.smallButtonInner}>
              <Text style={styles.buttonText}>Next</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Slide 2 */}
      <View style={styles.slide}>
        <LinearGradient
          colors={['#9333EA', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ribbon}
        />
        <Image
          source={require('../../assets/images/onboarding_collab_partner.png')}
          style={styles.image}
        />
        <View style={styles.paginationWrapper}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                currentIndex === i && styles.activeDot,
              ]}
            />
          ))}
        </View>
        <Text style={styles.header}>Find your Perfect{"\n"}Collab Partner</Text>
        <Text style={styles.subtext}>
          Our AI Matchmaker intelligently suggests ideal collaborators based on your niche, audience, and goals.
        </Text>
        <View style={styles.bottomRightContainer}>
          <TouchableOpacity onPress={handleFinish}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={styles.smallButton}>
            <LinearGradient colors={['#3B82F6', '#9333EA']} style={styles.smallButtonInner}>
              <Text style={styles.buttonText}>Next</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Slide 3 */}
      <View style={styles.slide}>
        <LinearGradient
          colors={['#9333EA', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ribbon}
        />
        <Image
          source={require('../../assets/images/onboarding_create.png')}
          style={styles.image}
        />
        <View style={styles.paginationWrapper}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                currentIndex === i && styles.activeDot,
              ]}
            />
          ))}
        </View>
        <Text style={styles.header}>Go Live &{"\n"}Create Magic</Text>
        <Text style={styles.subtext}>
          Jump into our basic Duet Studio to co-stream, record, and produce amazing content with your new partners.
        </Text>
        <View style={styles.bottomRightContainer}>
          <TouchableOpacity onPress={handleFinish}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFinish} style={styles.smallButton}>
            <LinearGradient colors={['#3B82F6', '#9333EA']} style={styles.smallButtonInner}>
              <Text style={styles.buttonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Swiper>
  );
};

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    width: width,
    height: 250,
    zIndex: -1,
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
  },
  image: {
    width: '100%',
    height: 250,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  paginationWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  dot: {
    width: 28,
    height: 4,
    backgroundColor: '#000',
    borderRadius: 2,
    opacity: 0.2,
  },
  activeDot: {
    opacity: 1,
  },
  header: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 14,
    color: '#111827',
    fontWeight: '700',
    lineHeight: 36,
  },
  subtext: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 40,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  smallButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  smallButtonInner: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skip: {
    color: '#9333EA',
    fontSize: 16,
    textDecorationLine: 'underline',
    marginRight: 16,
    alignSelf: 'center',
  },
  bottomRightContainer: {
    position: 'absolute',
    bottom: 40,
    right: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default OnboardingScreen;
