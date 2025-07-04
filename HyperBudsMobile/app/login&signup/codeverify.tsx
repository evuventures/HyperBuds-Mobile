// app/login&signup/verifycode.tsx
import { Image } from 'react-native';
import React, { useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Keyboard,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export const screenOptions = { headerShown: false };

export default function VerifyPass() {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '']);

  const ref1 = useRef<TextInput>(null);
  const ref2 = useRef<TextInput>(null);
  const ref3 = useRef<TextInput>(null);
  const ref4 = useRef<TextInput>(null);
  const refs = [ref1, ref2, ref3, ref4];

  const handleChange = (text: string, idx: number) => {
    if (!/^\d?$/.test(text)) return;
    const newCode = [...code];
    newCode[idx] = text;
    setCode(newCode);

    if (text) {
      if (idx < 3) {
        refs[idx + 1].current?.focus();
      } else {
        Keyboard.dismiss();
      }
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    idx: number
  ) => {
    if (e.nativeEvent.key === 'Backspace' && code[idx] === '' && idx > 0) {
      refs[idx - 1].current?.focus();
    }
  };

  const handleVerify = () => {
    console.log('Verifying OTP:', code.join(''));
  };

  const handleResend = () => {
    console.log('Resend code');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        {/* left semi cicle */}
      <Image source={require('../../assets/images/circle1.png')} style={styles.leftcircleimage} />

        {/* polygon bottom left*/}
      <Image
        source={require('../../assets/images/codeverifybottom.png')}
        style={styles.bottompoly}
      />
      {/*right side polygon*/}
      <Image
        source={require('../../assets/images/codeverifyright.png')}
        style={styles.rightpoly}
      />

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
          
    
        <Text style={styles.title}>Code{'\n'}Verification</Text>
        <Text style={styles.subtitle}>
          Please enter the code we just sent to email …
        </Text>
        
        <View style={styles.otpContainer}>
          {refs.map((r, i) => (
            <TextInput
              key={i}
              ref={r}
              value={code[i]}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              placeholder="-"
              placeholderTextColor="#666"
            />
          ))}
        </View>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive code?</Text>
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendLink}>Resend code</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
          <LinearGradient
            colors={['#3B82F6', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.verifyGradient}
          >
            <Text style={styles.verifyText}>Verify</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </TouchableWithoutFeedback>
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
    marginTop: 75,
    fontSize: 45,
    fontWeight: '600',
    lineHeight: 56,
    color: '#A259FF',
    textAlign: 'center',
    letterSpacing: -1.5, 
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginTop: 50,
    marginBottom: 25,
  },
  otpInput: {
    width: 60,
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25, // More rounded
    fontSize: 24,
    color: '#000',
  },
  resendContainer: {
    flexDirection: 'column', // Stack vertically
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    color: '#888',
    marginBottom: 4,
  },
  resendLink: {
    textDecorationLine: 'underline',
    fontWeight: '500',
    color: '#000',
  },
  verifyButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 30,
  },
  verifyGradient: {
    paddingVertical: 14,
    paddingHorizontal: 70,
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 10,
  },
  verifyText: {
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
  bottompoly: {
    position: 'absolute',
    bottom: -30,         
    left: 80,        
    width: 125,     
    height: 125,    
    resizeMode: 'contain',
    zIndex: -1,
    
  },
  rightpoly: {
    position: 'absolute',
    top: 250,         
    right: -30,        
    width: 100,     
    height: 100,    
    resizeMode: 'contain',
    zIndex: -1,
    
  },
});
