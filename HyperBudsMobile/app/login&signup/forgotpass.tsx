// app/login&signup/forgotpass.tsx

import { Image } from 'react-native';
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPass() {
  const router = useRouter();

  const handleSend = () => {
    // TODO: hook up your password-reset logic
    console.log('Send verification to email');
  };

  return (
    <SafeAreaView style={styles.container}>

    {/* left semi cicle */}
    <Image
      source={require('../../assets/images/circle1.png')}
      style={styles.leftcircleimage}
    />

    {/* right semi cicle */}
    <Image
      source={require('../../assets/images/circle2.png')}
      style={styles.rightcircleimage}
    />

    {/* polygon bottom left*/}
    <Image
      source={require('../../assets/images/fpblpoly.png')}
      style={styles.bottomleftpoly}
    />
    {/* polygon bottom right*/}
    <Image
      source={require('../../assets/images/fpbrpoly.png')}
      style={styles.bottomrightpoly}
    />

      {/* Back button */}
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>Forgot{'\n'}Password</Text>
      <Text style={styles.subtitle}>
        Please enter your email to receive a verification code
      </Text>

      {/* Email input */}
      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#999" />
        <TextInput
          placeholder="Email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          style={styles.input}
        />
      </View>

      {/* Send button matching login/signup style */}
      <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
        <LinearGradient
          colors={['#3B82F6', '#9333EA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sendGradient}
        >
          <Text style={styles.sendText}>Send</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',  
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  back: {
    position: 'absolute',
    top: 30,
    left: 20,
  },
  title: {
    marginTop: 100,
    fontSize: 45,
    fontWeight: '600',
    lineHeight: 56,
    color: '#A259FF',
    textAlign: 'center',
    letterSpacing: -1.5, 
  },
  subtitle: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    height: 50,
    marginTop: 30,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },

  // send button styles
  sendButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 30,
  },
  sendGradient: {
    paddingVertical: 14,
    paddingHorizontal: 70,
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 10,
  },
  sendText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  leftcircleimage: {
    position: 'absolute',
    top: 0,         
    left: -50,        
    width: 250,     
    height: 250,    
    resizeMode: 'contain',
    zIndex: -1,
    
  },
  rightcircleimage: {
    position: 'absolute',
    top: -275,         
    left: 175,        
    width: 550,     
    height: 550,    
    resizeMode: 'contain',
    zIndex: -1,
    
  },
  bottomleftpoly: {
    position: 'absolute',
    bottom: -20,         
    left: 0,        
    width: 125,     
    height: 125,    
    resizeMode: 'contain',
    zIndex: -1,
    
  },
  bottomrightpoly: {
    position: 'absolute',
    bottom: -10,         
    right: -10,        
    width: 100,     
    height: 100,    
    resizeMode: 'contain',
    zIndex: -1,
    
  },

});
