// app/main/messages.tsx

import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Feather, AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const threads = [
  {
    id: '1',
    name: 'Ashley Tinsdale',
    snippet: 'Hey! What’s new at work?',
    time: '8:32 PM',
    unread: 1,
  },
  {
    id: '2',
    name: 'Carolina Sara',
    snippet: 'Today was a long day right?',
    time: '12:03 PM',
    unread: 3,
  },
  {
    id: '3',
    name: 'Tony Carol',
    snippet: 'Wanna work on a new Collaboration to…',
    time: '9:24 AM',
    unread: 2,
  },
];

export default function Messages() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Feather name="menu" size={24} color="#333" />
        <Text style={styles.headerTitle}>Messages</Text>
        <Feather name="search" size={24} color="#333" onPress={() => router.push('/main/search')} />
      </View>

      {/* Thread List */}
      <ScrollView contentContainerStyle={styles.list}>
        {threads.map(t => (
          <TouchableOpacity
            key={t.id}
            style={styles.thread}
            onPress={() => router.push(`/main/messages/${t.id}`)}
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
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#000' },

  list: { paddingVertical: 10 },

  thread: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ddd',
    marginRight: 15,
  },

  threadText: { flex: 1 },

  threadHeader: { flexDirection: 'row', alignItems: 'center' },

  threadName: { fontSize: 16, fontWeight: '600', color: '#000' },

  badge: {
    marginLeft: 8,
    backgroundColor: '#9333EA',
    borderRadius: 10,
    paddingHorizontal: 6,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  threadSnippet: { marginTop: 4, color: '#666', fontSize: 14 },

  threadTime: { marginLeft: 10, color: '#999', fontSize: 12 },
});
