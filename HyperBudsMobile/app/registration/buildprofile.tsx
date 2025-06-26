import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Swiper from 'react-native-swiper';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function BuildProfileScreen() {
  return (
    <Swiper loop={false} showsPagination={true} dotColor="#ccc" activeDotColor="#A855F7">
      {/* Slide 1 - Build Your Profile */}
      <View style={styles.container}>
        <TouchableOpacity style={styles.avatarContainer}>
          <Image source={require('../../assets/images/avatar.png')} style={styles.avatar} />
          <Image source={require('../../assets/images/edit.png')} style={styles.editIcon} />
        </TouchableOpacity>

        <Text style={styles.title}>Build Your Profile</Text>
        <Text style={styles.label}>Short Bio (optional)</Text>
        <TextInput
          multiline
          numberOfLines={4}
          placeholder="Write a short bio..."
          style={styles.textArea}
        />
        <TouchableOpacity style={styles.button}>
          <LinearGradient colors={['#3B82F6', '#9333EA']} style={styles.gradient}>
            <Text style={styles.buttonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Slide 2 - Placeholder */}
      <View style={styles.container}>
        <Text style={styles.placeholderText}>Slide 2</Text>
      </View>

      {/* Slide 3 - Placeholder */}
      <View style={styles.container}>
        <Text style={styles.placeholderText}>Slide 3</Text>
      </View>
    </Swiper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    borderRadius: 60,
  },
  editIcon: {
    position: 'absolute',
    bottom: 13,
    right: 11,
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#9333EA',
    marginBottom: 20,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 14,
    marginBottom: 6,
    color: '#333',
  },
  textArea: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    minHeight: 100,
    marginBottom: 30,
    textAlignVertical: 'top',
  },
  button: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholderText: {
    fontSize: 20,
    color: '#999',
  },
});
