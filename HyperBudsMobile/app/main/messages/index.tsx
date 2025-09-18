// app/main/messages/index.tsx

import React from 'react';
import {
  View,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const HEADER_HEIGHT = 60;
const threads = [
  { id: '1', name: 'Ashley Johnson', snippet: 'Hey! What’s new at work?', time: '8:32 PM', unread: 1 },
  { id: '2', name: 'Carolina Sara', snippet: 'Today was a long day right?', time: '12:03 PM', unread: 3 },
  { id: '3', name: 'Tony Carol', snippet: 'Wanna work on a new Collaboration…', time: '9:24 AM', unread: 2 },
];

export default function Messages() {
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      {/* Make status bar translucent so gradient fills under it */}
      <StatusBar translucent backgroundColor="transparent" style="light" />

      {/* Gradient Header */}
      <LinearGradient
        colors={['#9333EA', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.header,
          {
            paddingTop: Constants.statusBarHeight,
            height: Constants.statusBarHeight + HEADER_HEIGHT,
          },
        ]}
      >
        <TouchableOpacity onPress={() => {/* open side menu */}} style={styles.iconBtn}>
          <Feather name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={() => router.push('/main/search')} style={styles.iconBtn}>
          <Feather name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Content */}
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.list}>
          {threads.map(t => (
            <TouchableOpacity
              key={t.id}
              style={styles.thread}
              onPress={() =>
                router.push(`/main/messages/${t.id}?name=${encodeURIComponent(t.name)}`)
              }
            >
              <View style={styles.avatarPlaceholder} />

              <View style={styles.threadText}>
                <View style={styles.threadHeader}>
                  <Text style={styles.threadName}>{t.name}</Text>
                  {t.unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{t.unread}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.threadSnippet}>{t.snippet}</Text>
              </View>

              <Text style={styles.threadTime}>{t.time}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconBtn: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  list: {
    paddingVertical: 8,
  },
  thread: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ddd',
    marginRight: 12,
  },
  threadText: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  threadName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  badge: {
    marginLeft: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 6,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#9333EA',
    fontSize: 12,
    fontWeight: '600',
  },
  threadSnippet: {
    marginTop: 4,
    color: '#666',
    fontSize: 14,
  },
  threadTime: {
    marginLeft: 8,
    color: '#999',
    fontSize: 12,
  },
});
