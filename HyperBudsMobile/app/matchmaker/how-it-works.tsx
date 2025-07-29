// app/matchmaker/how-it-works.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function HowItWorksScreen() {
  const router = useRouter();

  const steps = [
    {
      icon: <FontAwesome5 name="magic" size={24} color="#9333EA" />,
      text:
        "Explore AI suggestions or use the search bar to look for specific interests or browse the 'Discovery' feed.",
    },
    {
      icon: <Ionicons name="eye-outline" size={24} color="#9333EA" />,
      text:
        "View Profile (Optional): Click on the eye icon to see their full profile and learn more.",
    },
    {
      icon: <MaterialCommunityIcons name="handshake-outline" size={24} color="#9333EA" />,
      text:
        "Connect: Tap the 'Connect' button on their profile or the main match card.",
    },
    {
      icon: <Ionicons name="chatbubbles-outline" size={24} color="#9333EA" />,
      text:
        "Message & Chat: Once connected, you can start a conversation and get to know each other!",
    },
    {
      icon: <Ionicons name="qr-code-outline" size={24} color="#9333EA" />,
      text: "Go Live and collaborate together!",
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top bar with back arrow */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>How the AI matchmaker works</Text>

        {steps.map((step, idx) => (
          <View key={idx} style={styles.stepRow}>
            {step.icon}
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.replace('/matchmaker/aimatchmaker')}
        >
          <LinearGradient
            colors={['#3B82F6', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startGradient}
          >
            <Text style={styles.startText}>Start</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: 50,
    justifyContent: 'center',
    paddingLeft: 16,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    color: '#000',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    lineHeight: 22,
  },
  startButton: {
    marginTop: 30,
    alignSelf: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },
  startGradient: {
    paddingVertical: 14,
    paddingHorizontal: width * 0.2,
    borderRadius: 10,
    alignItems: 'center',
  },
  startText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
